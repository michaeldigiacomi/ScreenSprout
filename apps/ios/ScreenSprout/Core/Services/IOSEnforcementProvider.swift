import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import Combine
import UIKit

class IOSEnforcementProvider: EnforcementProvider {
    @Published var isAuthorized = false
    @Published var familyActivitySelection: FamilyActivitySelection?

    private let center = AuthorizationCenter.shared
    private let store = ManagedSettingsStore()
    private let activityCenter = DeviceActivityCenter()
    private let sharedData = SharedDataManager.shared
    private let sharedDefaults = SharedConstants.sharedDefaults
    private var cancellables = Set<AnyCancellable>()

    init() {
        checkAuthorizationStatus()
        center.$authorizationStatus
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                self?.isAuthorized = (status == .approved)
            }
            .store(in: &cancellables)

        // Restore saved selection
        familyActivitySelection = sharedData.loadFamilyActivitySelection()
    }

    private func checkAuthorizationStatus() {
        DispatchQueue.main.async {
            self.isAuthorized = (self.center.authorizationStatus == .approved)
        }
    }

    var hasFamilyActivitySelection: Bool {
        familyActivitySelection != nil
    }

    func requestAuthorization() async {
        do {
            try await center.requestAuthorization(for: .individual)
            DispatchQueue.main.async {
                self.isAuthorized = (self.center.authorizationStatus == .approved)
            }
        } catch {
            print("[Enforcement] Auth error: \(error)")
        }
    }

    func applyPolicy(_ policy: DevicePolicy) {
        store.clearAllSettings()

        // 1. Decode and store FamilyActivitySelection from policy
        if let selectionBase64 = policy.familyActivitySelectionData {
            sharedData.saveSelectionBase64(selectionBase64)
            familyActivitySelection = sharedData.loadFamilyActivitySelection()
        }

        // 2. Apply pause
        if let pausedUntil = policy.pausedUntil {
            sharedDefaults.set(pausedUntil, forKey: SharedConstants.Keys.pausedUntil)
            applyShields()
            return  // When paused, shields stay on regardless of schedule
        } else {
            sharedDefaults.removeObject(forKey: SharedConstants.Keys.pausedUntil)
        }

        // 3. Store daily limit in shared defaults for extension to read
        if let limit = policy.dailyLimitMinutes {
            sharedDefaults.set(limit, forKey: SharedConstants.Keys.dailyLimitMinutes)
        }

        // 4. Store schedule info for extension
        if let schedule = policy.activeSchedule {
            sharedDefaults.set(schedule.startHour ?? 0,
                               forKey: SharedConstants.Keys.scheduleStartHour)
            sharedDefaults.set(schedule.startMinute ?? 0,
                               forKey: SharedConstants.Keys.scheduleStartMinute)
            sharedDefaults.set(schedule.endHour ?? 23,
                               forKey: SharedConstants.Keys.scheduleEndHour)
            sharedDefaults.set(schedule.endMinute ?? 59,
                               forKey: SharedConstants.Keys.scheduleEndMinute)
            sharedDefaults.set(schedule.days ?? [1, 2, 3, 4, 5, 6, 7],
                               forKey: SharedConstants.Keys.scheduleDays)

            if let scheduleSelectionBase64 = schedule.familyActivitySelectionData {
                sharedDefaults.set(scheduleSelectionBase64,
                                   forKey: SharedConstants.Keys.scheduleFamilyActivitySelectionData)
            }
        }

        // 5. Start DeviceActivity monitoring
        startDeviceActivityMonitoring(policy: policy)
    }

    func startMonitoring() {
        // Monitoring is now handled via DeviceActivityCenter schedules
    }

    func stopMonitoring() {
        do {
            for activity in activityCenter.activities {
                try activityCenter.stopMonitoring(activity)
            }
        } catch {
            print("[Enforcement] Stop monitoring error: \(error)")
        }
        store.clearAllSettings()
        sharedData.setShieldActive(false)
    }

    // MARK: - Private helpers

    private func applyShields() {
        guard let selection = familyActivitySelection else {
            print("[Enforcement] No FamilyActivitySelection; cannot shield")
            return
        }
        store.shield.applications = selection.applicationTokens
        if !selection.categoryTokens.isEmpty {
            store.shield.applicationCategories = .specific(selection.categoryTokens, except: Set())
        }
        sharedData.setShieldActive(true)
    }

    private func removeShields() {
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.application.blockedApplications = nil
        sharedData.setShieldActive(false)
    }

    private func startDeviceActivityMonitoring(policy: DevicePolicy) {
        // Stop any existing monitors first
        do {
            for activity in activityCenter.activities {
                try activityCenter.stopMonitoring(activity)
            }
        } catch { /* ignore */ }

        // Schedule A: All-day monitoring for threshold events
        let allDaySchedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )

        // Build threshold events
        var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]

        if let limit = policy.limitThresholdMinutes, limit > 0,
           let selection = familyActivitySelection {
            let limitEvent = DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                webDomains: selection.webDomainTokens,
                threshold: DateComponents(minute: limit)
            )
            events[DeviceActivityEvent.Name(SharedConstants.EventName.dailyLimit)] = limitEvent

            // Warning at 75% of limit
            if limit >= 15 {
                let warning75Event = DeviceActivityEvent(
                    applications: selection.applicationTokens,
                    categories: selection.categoryTokens,
                    webDomains: selection.webDomainTokens,
                    threshold: DateComponents(minute: Int(Double(limit) * 0.75))
                )
                events[DeviceActivityEvent.Name(SharedConstants.EventName.warning75)] = warning75Event
            }

            // Warning at 50% of limit
            if limit >= 30 {
                let warning50Event = DeviceActivityEvent(
                    applications: selection.applicationTokens,
                    categories: selection.categoryTokens,
                    webDomains: selection.webDomainTokens,
                    threshold: DateComponents(minute: Int(Double(limit) * 0.50))
                )
                events[DeviceActivityEvent.Name(SharedConstants.EventName.warning50)] = warning50Event
            }
        }

        do {
            let allDayName = DeviceActivityName(SharedConstants.ScheduleName.allDay)
            try activityCenter.startMonitoring(
                allDayName,
                during: allDaySchedule,
                events: events
            )

            // Record monitoring start time for iOS 26 bug workaround
            sharedDefaults.set(Date().timeIntervalSince1970,
                               forKey: SharedConstants.Keys.monitoringStartedAt)
        } catch {
            print("[Enforcement] All-day monitoring start failed: \(error)")
        }

        // Schedule B: Restricted hours schedule (if configured)
        if let schedule = policy.activeSchedule,
           schedule.startHour != nil || schedule.endHour != nil {
            let restrictedSchedule = DeviceActivitySchedule(
                intervalStart: DateComponents(
                    hour: schedule.startHour ?? 0,
                    minute: schedule.startMinute ?? 0),
                intervalEnd: DateComponents(
                    hour: schedule.endHour ?? 23,
                    minute: schedule.endMinute ?? 59),
                repeats: true
            )

            do {
                let restrictedName = DeviceActivityName(
                    SharedConstants.ScheduleName.restrictedHours)
                try activityCenter.startMonitoring(
                    restrictedName,
                    during: restrictedSchedule
                )
            } catch {
                print("[Enforcement] Restricted-hours monitoring start failed: \(error)")
            }
        }
    }
}