import ManagedSettings
import FamilyControls
import UIKit

class ScreenSproutShieldConfigurationExtension: ShieldConfigurationExtension {

    override func configuration(shielding application: ApplicationToken) -> ShieldConfiguration {
        ShieldConfiguration(
            backgroundBlurStyle: .systemMaterialDark,
            backgroundColor: UIColor(red: 0.18, green: 0.49, blue: 0.28, alpha: 0.9),
            icon: UIImage(systemName: "leaf.fill"),
            title: ShieldConfiguration.Label(
                text: "ScreenSprout",
                color: .white
            ),
            subtitle: ShieldConfiguration.Label(
                text: "This app is paused for now.",
                color: .lightGray
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "OK",
                color: .white
            ),
            primaryButtonBackgroundColor: .systemGreen,
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "Request More Time",
                color: .systemGreen
            )
        )
    }

    override func configuration(shielding webDomain: WebDomainToken) -> ShieldConfiguration {
        ShieldConfiguration(
            backgroundBlurStyle: .systemMaterialDark,
            backgroundColor: UIColor(red: 0.18, green: 0.49, blue: 0.28, alpha: 0.9),
            icon: UIImage(systemName: "leaf.fill"),
            title: ShieldConfiguration.Label(text: "ScreenSprout", color: .white),
            subtitle: ShieldConfiguration.Label(
                text: "This website is paused.", color: .lightGray),
            primaryButtonLabel: ShieldConfiguration.Label(text: "OK", color: .white),
            primaryButtonBackgroundColor: .systemGreen,
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "Request More Time", color: .systemGreen)
        )
    }

    override func configuration(shielding category: ActivityCategoryToken) -> ShieldConfiguration {
        ShieldConfiguration(
            backgroundBlurStyle: .systemMaterialDark,
            backgroundColor: UIColor(red: 0.18, green: 0.49, blue: 0.28, alpha: 0.9),
            icon: UIImage(systemName: "leaf.fill"),
            title: ShieldConfiguration.Label(text: "ScreenSprout", color: .white),
            subtitle: ShieldConfiguration.Label(
                text: "This category is paused.", color: .lightGray),
            primaryButtonLabel: ShieldConfiguration.Label(text: "OK", color: .white),
            primaryButtonBackgroundColor: .systemGreen,
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "Request More Time", color: .systemGreen)
        )
    }
}