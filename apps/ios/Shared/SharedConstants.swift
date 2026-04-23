import Foundation

enum SharedConstants {
    static let appGroupIdentifier = "group.ScreenSprout.shared"

    // Keys for shared UserDefaults
    enum Keys {
        static let familyActivitySelectionData = "familyActivitySelectionData"
        static let dailyLimitMinutes = "dailyLimitMinutes"
        static let pausedUntil = "pausedUntil"
        static let scheduleStartHour = "scheduleStartHour"
        static let scheduleStartMinute = "scheduleStartMinute"
        static let scheduleEndHour = "scheduleEndHour"
        static let scheduleEndMinute = "scheduleEndMinute"
        static let scheduleDays = "scheduleDays" // [Int] 1=Sun..7=Sat
        static let monitoringStartedAt = "monitoringStartedAt"
        static let thresholdEvents = "thresholdEvents"
        static let lastIntervalStart = "lastIntervalStart"
        static let lastIntervalEnd = "lastIntervalEnd"
        static let isShieldActive = "isShieldActive"
        static let appsConfigured = "appsConfigured"
        static let timeRequests = "timeRequests"
        static let scheduleFamilyActivitySelectionData = "scheduleFamilyActivitySelectionData"
    }

    static var sharedDefaults: UserDefaults {
        UserDefaults(suiteName: appGroupIdentifier)!
    }

    // DeviceActivityEvent names
    enum EventName {
        static let dailyLimit = "DailyLimit"
        static let warning50 = "Warning50"
        static let warning75 = "Warning75"
    }

    // DeviceActivitySchedule names
    enum ScheduleName {
        static let allDay = "AllDay"
        static let restrictedHours = "RestrictedHours"
    }
}