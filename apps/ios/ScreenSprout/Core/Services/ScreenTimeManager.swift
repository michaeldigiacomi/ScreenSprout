import Foundation
import Combine
import UIKit

class ScreenTimeManager: ObservableObject {
    static let shared = ScreenTimeManager()

    @Published var provider: any EnforcementProvider
    @Published var isPaired: Bool = false
    @Published var pairedDeviceName: String?
    @Published var lastPolicy: DevicePolicy?
    @Published var isLoadingPolicy: Bool = false

    let apiClient = APIClient()

    private var heartbeatTimer: Timer?
    private let heartbeatIntervalSeconds: TimeInterval = 60

    private init() {
        #if os(iOS)
        self.provider = IOSEnforcementProvider()
        #else
        self.provider = macOSEnforcementProvider()
        #endif

        restorePairingState()
    }

    private func restorePairingState() {
        apiClient.loadSavedToken()
        let deviceId = UserDefaults.standard.string(forKey: "pairedDeviceId")
        let deviceName = UserDefaults.standard.string(forKey: "pairedDeviceName")

        if apiClient.hasToken && deviceId != nil {
            isPaired = true
            pairedDeviceName = deviceName
        }
    }

    func setPairingInfo(deviceId: String, deviceName: String, childId: String, childName: String) {
        UserDefaults.standard.set(deviceId, forKey: "pairedDeviceId")
        UserDefaults.standard.set(deviceName, forKey: "pairedDeviceName")
        UserDefaults.standard.set(childId, forKey: "pairedChildId")
        UserDefaults.standard.set(childName, forKey: "pairedChildName")
        isPaired = true
        pairedDeviceName = deviceName
    }

    var pairedDeviceId: String? {
        UserDefaults.standard.string(forKey: "pairedDeviceId")
    }

    var pairedChildName: String? {
        UserDefaults.standard.string(forKey: "pairedChildName")
    }

    func requestAuthorization() async {
        await provider.requestAuthorization()
    }

    func applyPolicy(_ policy: DevicePolicy) {
        provider.applyPolicy(policy)
    }

    func startMonitoring() {
        provider.startMonitoring()
        startHeartbeat()
    }

    // MARK: - Heartbeat

    func startHeartbeat() {
        stopHeartbeat()

        Task {
            await sendHeartbeat()
        }

        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: heartbeatIntervalSeconds, repeats: true) { [weak self] _ in
            Task {
                await self?.sendHeartbeat()
            }
        }
    }

    func stopHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
    }

    func syncPolicy() async {
        guard apiClient.hasToken else { return }

        await MainActor.run { isLoadingPolicy = true }

        do {
            let policy = try await apiClient.fetchPolicy()
            await MainActor.run {
                lastPolicy = policy
                applyPolicy(policy)
                isLoadingPolicy = false
            }
        } catch {
            print("[ScreenTimeManager] Failed to sync policy: \(error)")
            await MainActor.run { isLoadingPolicy = false }
        }
    }

    func sendHeartbeat() async {
        guard apiClient.hasToken else { return }

        let sharedData = SharedDataManager.shared
        let thresholdEvents = sharedData.consumeThresholdEvents()
        let timeRequests = sharedData.consumeTimeRequests()

        // Build activity records from threshold events
        var activities: [HeartbeatActivity] = []
        let formatter = ISO8601DateFormatter()

        for event in thresholdEvents {
            guard let eventStr = event["event"] as? String,
                  let timestamp = event["timestamp"] as? Int else { continue }
            let date = Date(timeIntervalSince1970: Double(timestamp))
            activities.append(HeartbeatActivity(
                type: "threshold",
                label: eventStr,
                valueSeconds: 0,
                timestamp: formatter.string(from: date),
                appName: nil,
                durationSeconds: nil
            ))
        }

        for request in timeRequests {
            guard let tokenType = request["tokenType"] as? String,
                  let timestamp = request["timestamp"] as? Int else { continue }
            let date = Date(timeIntervalSince1970: Double(timestamp))
            activities.append(HeartbeatActivity(
                type: "time_request",
                label: "request_more_time_\(tokenType)",
                valueSeconds: 0,
                timestamp: formatter.string(from: date),
                appName: nil,
                durationSeconds: nil
            ))
        }

        // Add aggregate usage from server's own tracking
        if let used = lastPolicy?.usedMinutes {
            activities.append(HeartbeatActivity(
                type: "aggregate",
                label: "daily_usage",
                valueSeconds: used * 60,
                timestamp: formatter.string(from: Date()),
                appName: nil,
                durationSeconds: nil
            ))
        }

        // Collect device state
        #if os(iOS)
        UIDevice.current.isBatteryMonitoringEnabled = true
        let batteryLevel = UIDevice.current.batteryLevel >= 0 ? UIDevice.current.batteryLevel : nil
        #else
        let batteryLevel: Double? = nil
        #endif

        let isPaused = lastPolicy?.pausedUntil != nil
        let selectionBase64 = sharedData.loadSelectionBase64()

        let payload = HeartbeatPayload(
            activity: activities,
            batteryLevel: batteryLevel,
            isOnline: true,
            appsConfigured: sharedData.isAppsConfigured(),
            isShieldActive: sharedData.isShieldActive(),
            isPaused: isPaused,
            familyActivitySelectionData: selectionBase64
        )

        do {
            let policy = try await apiClient.sendHeartbeat(payload: payload)
            await MainActor.run {
                lastPolicy = policy
                applyPolicy(policy)
            }
        } catch {
            print("[ScreenTimeManager] Heartbeat failed: \(error)")
        }
    }

    func uploadFamilyActivitySelection() async {
        guard apiClient.hasToken else { return }
        let base64 = SharedDataManager.shared.loadSelectionBase64() ?? ""

        let payload = HeartbeatPayload(
            activity: [],
            batteryLevel: nil,
            isOnline: true,
            appsConfigured: true,
            isShieldActive: SharedDataManager.shared.isShieldActive(),
            isPaused: lastPolicy?.pausedUntil != nil,
            familyActivitySelectionData: base64
        )

        do {
            let policy = try await apiClient.sendHeartbeat(payload: payload)
            await MainActor.run {
                lastPolicy = policy
                applyPolicy(policy)
            }
        } catch {
            print("[ScreenTimeManager] Selection upload failed: \(error)")
        }
    }

    func unpair() {
        stopHeartbeat()
        apiClient.clearToken()
        isPaired = false
        pairedDeviceName = nil
        lastPolicy = nil
        provider.stopMonitoring()
    }
}