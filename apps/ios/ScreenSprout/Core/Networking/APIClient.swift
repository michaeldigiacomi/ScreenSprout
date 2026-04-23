import Foundation

enum APIError: Error {
    case invalidURL
    case requestFailed(Int)
    case decodingError
    case notPaired
    case unknown(Error)
}

protocol APIClientProtocol {
    func pairDevice(code: String, deviceId: String, deviceName: String, deviceType: String) async throws -> PairingResponse
    func fetchPolicy() async throws -> DevicePolicy
    func uploadStats(deviceId: String, stats: [AppUsageStat]) async throws -> Bool
    func sendHeartbeat(payload: HeartbeatPayload) async throws -> DevicePolicy
}

class APIClient: APIClientProtocol {
    private let baseURL = URL(string: "https://app.screensprout.digitaladrenalin.net")!
    private var authToken: String?

    func setToken(_ token: String) {
        self.authToken = token
        UserDefaults.standard.set(token, forKey: "deviceAuthToken")
    }

    func loadSavedToken() {
        self.authToken = UserDefaults.standard.string(forKey: "deviceAuthToken")
    }

    func clearToken() {
        self.authToken = nil
        UserDefaults.standard.removeObject(forKey: "deviceAuthToken")
        UserDefaults.standard.removeObject(forKey: "pairedDeviceId")
        UserDefaults.standard.removeObject(forKey: "pairedDeviceName")
        UserDefaults.standard.removeObject(forKey: "pairedChildId")
        UserDefaults.standard.removeObject(forKey: "pairedChildName")
    }

    var hasToken: Bool {
        return authToken != nil
    }

    private func request<T: Decodable>(path: String, method: String = "GET", body: Data? = nil, authType: AuthType = .device) async throws -> T {
        let fullPath = "/api" + path
        guard let url = URL(string: fullPath, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        switch authType {
        case .bearer:
            if let token = authToken {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
        case .device:
            if let token = authToken {
                request.setValue("Device \(token)", forHTTPHeaderField: "Authorization")
            } else {
                throw APIError.notPaired
            }
        case .none:
            break
        }

        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.requestFailed(0)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.requestFailed(httpResponse.statusCode)
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decodingError
        }
    }

    private enum AuthType {
        case bearer
        case device
        case none
    }

    func pairDevice(code: String, deviceId: String, deviceName: String, deviceType: String) async throws -> PairingResponse {
        let body = try JSONEncoder().encode([
            "code": code,
            "deviceId": deviceId,
            "deviceName": deviceName,
            "deviceType": deviceType
        ])
        return try await request(path: "/device/pair", method: "POST", body: body, authType: .none)
    }

    func fetchPolicy() async throws -> DevicePolicy {
        return try await request(path: "/device/policy", method: "GET", authType: .device)
    }

    func sendHeartbeat(payload: HeartbeatPayload) async throws -> DevicePolicy {
        let body = try JSONEncoder().encode(payload)
        return try await request(path: "/device/heartbeat", method: "POST", body: body, authType: .device)
    }

    func uploadStats(deviceId: String, stats: [AppUsageStat]) async throws -> Bool {
        let body = try JSONEncoder().encode(stats)
        let _: EmptyResponse = try await request(path: "/devices/stats/\(deviceId)", method: "POST", body: body, authType: .device)
        return true
    }
}

// MARK: - Models

struct PairingResponse: Codable {
    let status: String
    let token: String
    let device: DeviceInfo

    struct DeviceInfo: Codable {
        let id: String
        let name: String
        let childId: String
        let childName: String?
    }
}

struct DevicePolicy: Codable {
    let deviceName: String?
    let childName: String?
    let childId: String?
    let dailyLimitMinutes: Int?
    let bonusMinutes: Int?
    let remainingMinutes: Int?
    let usedMinutes: Int?

    // Opaque encoded FamilyActivitySelection (base64 Data)
    let familyActivitySelectionData: String?
    let alwaysAllowedSelectionData: String?

    // Kept for backward compatibility / non-iOS platforms
    let blockedApps: [String]?
    let alwaysAllowedApps: [String]?

    let activeSchedule: ScheduleInfo?
    let pausedUntil: String?

    // Threshold configuration (parent sets these, device uses them)
    let warningThresholdMinutes: Int?
    let limitThresholdMinutes: Int?

    struct ScheduleInfo: Codable {
        let name: String?
        let familyActivitySelectionData: String?
        let startHour: Int?
        let startMinute: Int?
        let endHour: Int?
        let endMinute: Int?
        let days: [Int]?
        let blockedApps: [String]?
        let alwaysAllowedApps: [String]?
    }
}

struct HeartbeatPayload: Codable {
    let activity: [HeartbeatActivity]
    let batteryLevel: Double?
    let isOnline: Bool
    let appsConfigured: Bool
    let isShieldActive: Bool
    let isPaused: Bool
    let familyActivitySelectionData: String?
}

struct HeartbeatActivity: Codable {
    let type: String          // "aggregate" | "threshold" | "interval"
    let label: String         // descriptive label
    let valueSeconds: Int     // duration in seconds
    let timestamp: String     // ISO8601

    // Legacy fields kept as optional for backward compat
    let appName: String?
    let durationSeconds: Int?
}

struct AppUsageStat: Codable {
    let appName: String
    let durationSeconds: Int
}

struct EmptyResponse: Codable {}