import Foundation

/// The blueprint for platform-specific enforcement logic.
protocol EnforcementProvider: ObservableObject {
    var isAuthorized: Bool { get }
    var hasFamilyActivitySelection: Bool { get }

    func requestAuthorization() async
    func applyPolicy(_ policy: DevicePolicy)
    func startMonitoring()
    func stopMonitoring()
}