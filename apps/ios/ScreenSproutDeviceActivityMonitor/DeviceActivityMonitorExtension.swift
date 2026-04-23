import DeviceActivity
import ManagedSettings
import FamilyControls

class DeviceActivityMonitorExtension: DeviceActivityMonitor {

    let store = ManagedSettingsStore()
    let sharedData = SharedDataManager.shared
    let sharedDefaults = SharedConstants.sharedDefaults

    // Called when a monitored schedule interval begins
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)

        sharedDefaults.set(Date().timeIntervalSince1970,
                           forKey: SharedConstants.Keys.lastIntervalStart)

        // For restricted-hours schedules: apply shields immediately
        if activity == DeviceActivityName(SharedConstants.ScheduleName.restrictedHours) {
            applyShields()
        }

        // For all-day schedule: just record the start
        // The all-day schedule exists solely to enable threshold events
    }

    // Called when a monitored schedule interval ends
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)

        sharedDefaults.set(Date().timeIntervalSince1970,
                           forKey: SharedConstants.Keys.lastIntervalEnd)

        // For restricted-hours schedules: remove shields when restriction period ends
        if activity == DeviceActivityName(SharedConstants.ScheduleName.restrictedHours) {
            removeShields()
        }

        // For all-day schedule: midnight rollover, remove shields for new day
        if activity == DeviceActivityName(SharedConstants.ScheduleName.allDay) {
            removeShields()
        }
    }

    // Called when usage of managed apps reaches a configured threshold
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name,
                                          activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)

        // BUG WORKAROUND: iOS 26 fires this callback immediately at 0 minutes
        // Check if this is a spurious firing by comparing to monitoring start time
        let monitoringStart = sharedDefaults.double(
            forKey: SharedConstants.Keys.monitoringStartedAt)
        let now = Date().timeIntervalSince1970
        let elapsed = now - monitoringStart

        // If less than 120 seconds since monitoring started, this is the
        // spurious iOS 26 firing. Mark it as primed and ignore.
        if monitoringStart > 0 && elapsed < 120 {
            sharedDefaults.set(true, forKey: "thresholdPrimed_\(event.stringValue)")
            return  // Ignore spurious firing
        }

        // Legitimate threshold event — record for the main app to send to API
        sharedData.recordThresholdEvent(
            eventName: event.stringValue,
            timestamp: Date()
        )

        if event == DeviceActivityEvent.Name(SharedConstants.EventName.dailyLimit) {
            // Daily limit reached: shield all managed apps
            applyShields()
        }

        // Warning thresholds: record but don't shield
        // The main app will pick up these events on next heartbeat
    }

    // MARK: - Private helpers

    private func applyShields() {
        // Check if device is paused first
        let pausedUntil = sharedDefaults.string(forKey: SharedConstants.Keys.pausedUntil)
        if pausedUntil != nil {
            // Device is paused — always apply shields
            if let selection = sharedData.loadFamilyActivitySelection() {
                store.shield.applications = selection.applicationTokens
                if !selection.categoryTokens.isEmpty {
                    store.shield.applicationCategories = .specific(selection.categoryTokens, except: Set())
                }
            }
            sharedData.setShieldActive(true)
            return
        }

        // Apply shields from the stored FamilyActivitySelection
        if let selection = sharedData.loadFamilyActivitySelection() {
            store.shield.applications = selection.applicationTokens
            if !selection.categoryTokens.isEmpty {
                store.shield.applicationCategories = .specific(selection.categoryTokens, except: Set())
            }
            sharedData.setShieldActive(true)
        }
    }

    private func removeShields() {
        // Don't remove shields if the device is paused
        let pausedUntil = sharedDefaults.string(forKey: SharedConstants.Keys.pausedUntil)
        if pausedUntil != nil { return }

        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.application.blockedApplications = nil
        sharedData.setShieldActive(false)
    }
}