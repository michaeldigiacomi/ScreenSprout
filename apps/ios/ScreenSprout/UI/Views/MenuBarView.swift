import SwiftUI
#if os(macOS)
import AppKit
#endif

struct MenuBarView: View {
    @ObservedObject var screenTimeManager = ScreenTimeManager.shared
    @State private var isSyncing = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "leaf.fill")
                    .foregroundColor(.green)
                Text("ScreenSprout")
                    .font(.headline)
                Spacer()
                Circle()
                    .fill(screenTimeManager.provider.isAuthorized ? Color.green : Color.red)
                    .frame(width: 8, height: 8)
            }
            .padding(.bottom, 4)

            if let deviceName = screenTimeManager.pairedDeviceName {
                Text(deviceName)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Divider()

            Button(action: syncPolicy) {
                HStack {
                    if isSyncing {
                        ProgressView()
                            .controlSize(.small)
                    } else {
                        Image(systemName: "arrow.clockwise")
                    }
                    Text("Sync Policy")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)

            Button(action: {
                #if os(macOS)
                NSApplication.shared.activate(nil)
                #endif
            }) {
                HStack {
                    Image(systemName: "gear")
                    Text("Settings")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)

            Divider()

            Button(action: {
                #if os(macOS)
                NSApplication.shared.terminate(nil)
                #endif
            }) {
                HStack {
                    Image(systemName: "power")
                    Text("Quit")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .foregroundColor(.red)
            }
            .buttonStyle(.plain)
        }
        .padding()
        .frame(width: 200)
    }

    func syncPolicy() {
        isSyncing = true
        Task {
            await screenTimeManager.syncPolicy()
            await MainActor.run { isSyncing = false }
        }
    }
}