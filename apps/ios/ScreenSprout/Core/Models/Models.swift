import Foundation

struct User: Codable {
    let id: String
    let email: String
    let role: String
}

struct Device: Codable {
    let id: String
    let deviceName: String
    let deviceType: String
    let lastSeen: Date?
    let policyJson: DevicePolicy?
}
