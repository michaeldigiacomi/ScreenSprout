import Foundation
import FamilyControls

class SharedDataManager {
    static let shared = SharedDataManager()
    private let defaults = SharedConstants.sharedDefaults

    // MARK: - FamilyActivitySelection persistence

    func saveFamilyActivitySelection(_ selection: FamilyActivitySelection) {
        do {
            let data = try JSONEncoder().encode(selection)
            defaults.set(data, forKey: SharedConstants.Keys.familyActivitySelectionData)
            defaults.set(true, forKey: SharedConstants.Keys.appsConfigured)
        } catch {
            print("[SharedData] Failed to encode FamilyActivitySelection: \(error)")
        }
    }

    func loadFamilyActivitySelection() -> FamilyActivitySelection? {
        guard let data = defaults.data(forKey: SharedConstants.Keys.familyActivitySelectionData) else {
            return nil
        }
        do {
            return try JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        } catch {
            print("[SharedData] Failed to decode FamilyActivitySelection: \(error)")
            return nil
        }
    }

    func saveSelectionBase64(_ base64: String) {
        guard let data = Data(base64Encoded: base64) else { return }
        defaults.set(data, forKey: SharedConstants.Keys.familyActivitySelectionData)
        defaults.set(true, forKey: SharedConstants.Keys.appsConfigured)
    }

    func loadSelectionBase64() -> String? {
        guard let data = defaults.data(forKey: SharedConstants.Keys.familyActivitySelectionData) else {
            return nil
        }
        return data.base64EncodedString()
    }

    // MARK: - Threshold events (written by extensions, read by main app)

    func recordThresholdEvent(eventName: String, timestamp: Date) {
        var events = loadThresholdEvents()
        events.append([
            "event": eventName,
            "timestamp": Int(timestamp.timeIntervalSince1970)
        ])
        // Keep last 100 events
        if events.count > 100 { events = Array(events.suffix(100)) }
        defaults.set(events, forKey: SharedConstants.Keys.thresholdEvents)
    }

    func loadThresholdEvents() -> [[String: Any]] {
        defaults.array(forKey: SharedConstants.Keys.thresholdEvents) as? [[String: Any]] ?? []
    }

    func consumeThresholdEvents() -> [[String: Any]] {
        let events = loadThresholdEvents()
        defaults.removeObject(forKey: SharedConstants.Keys.thresholdEvents)
        return events
    }

    // MARK: - Time requests (written by ShieldAction extension)

    func recordTimeRequest(tokenType: String) {
        var requests = loadTimeRequests()
        requests.append([
            "tokenType": tokenType,
            "timestamp": Int(Date().timeIntervalSince1970)
        ])
        if requests.count > 50 { requests = Array(requests.suffix(50)) }
        defaults.set(requests, forKey: SharedConstants.Keys.timeRequests)
    }

    func loadTimeRequests() -> [[String: Any]] {
        defaults.array(forKey: SharedConstants.Keys.timeRequests) as? [[String: Any]] ?? []
    }

    func consumeTimeRequests() -> [[String: Any]] {
        let requests = loadTimeRequests()
        defaults.removeObject(forKey: SharedConstants.Keys.timeRequests)
        return requests
    }

    // MARK: - Shield state

    func setShieldActive(_ active: Bool) {
        defaults.set(active, forKey: SharedConstants.Keys.isShieldActive)
    }

    func isShieldActive() -> Bool {
        defaults.bool(forKey: SharedConstants.Keys.isShieldActive)
    }

    // MARK: - Apps configured

    func isAppsConfigured() -> Bool {
        defaults.bool(forKey: SharedConstants.Keys.appsConfigured)
    }
}