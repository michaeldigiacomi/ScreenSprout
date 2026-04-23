import SwiftUI

@main
struct ScreenSproutApp: App {
    @StateObject private var screenTimeManager = ScreenTimeManager.shared

    var body: some Scene {
        WindowGroup {
            if screenTimeManager.isPaired {
                DashboardView()
                    .environmentObject(screenTimeManager)
            } else {
                PairingView()
            }
        }

        #if os(macOS)
        MenuBarExtra("ScreenSprout", systemImage: "leaf.fill") {
            MenuBarView()
        }
        #endif
    }
}