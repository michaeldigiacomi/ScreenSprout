import ManagedSettings
import FamilyControls

class ScreenSproutShieldActionExtension: ShieldActionExtension {

    override func handle(action: ShieldAction, for application: ApplicationToken) async -> ShieldActionResponse {
        switch action {
        case .primaryButtonPressed:
            // "OK" tapped — dismiss, keep shield
            return .close
        case .secondaryButtonPressed:
            // "Request More Time" tapped — record the request
            SharedDataManager.shared.recordTimeRequest(tokenType: "application")
            return .close
        @unknown default:
            return .close
        }
    }

    override func handle(action: ShieldAction, for webDomain: WebDomainToken) async -> ShieldActionResponse {
        switch action {
        case .primaryButtonPressed:
            return .close
        case .secondaryButtonPressed:
            SharedDataManager.shared.recordTimeRequest(tokenType: "webDomain")
            return .close
        @unknown default:
            return .close
        }
    }

    override func handle(action: ShieldAction, for category: ActivityCategoryToken) async -> ShieldActionResponse {
        switch action {
        case .primaryButtonPressed:
            return .close
        case .secondaryButtonPressed:
            SharedDataManager.shared.recordTimeRequest(tokenType: "category")
            return .close
        @unknown default:
            return .close
        }
    }
}