import SwiftUI
import FamilyControls

struct DashboardView: View {
    @StateObject private var screenTimeManager = ScreenTimeManager.shared
    @State private var isSyncing = false
    @State private var errorMessage: String?
    @State private var isActivityPickerPresented = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Authorization Card
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Device Status")
                                .font(.headline)
                            Text(screenTimeManager.provider.isAuthorized ? "Authorized" : "Authorization Required")
                                .font(.subheadline)
                                .foregroundColor(screenTimeManager.provider.isAuthorized ? .green : .red)
                        }
                        Spacer()
                        if !screenTimeManager.provider.isAuthorized {
                            Button("Grant Access") {
                                Task {
                                    await screenTimeManager.requestAuthorization()
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(radius: 2)

                    // Paired Device Info
                    if let deviceName = screenTimeManager.pairedDeviceName {
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Paired Device")
                                    .font(.headline)
                                Text(deviceName)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                        .shadow(radius: 2)
                    }

                    // Managed Apps Configuration (iOS only)
                    #if os(iOS)
                    VStack(alignment: .leading, spacing: 10) {
                        Text("App Restrictions")
                            .font(.headline)

                        if screenTimeManager.provider.hasFamilyActivitySelection {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text("Apps configured")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        } else {
                            Text("Select which apps to manage and restrict.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }

                        Button {
                            isActivityPickerPresented = true
                        } label: {
                            Label("Select Apps to Manage", systemImage: "app.badge.fill")
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                    }
                    .sheet(isPresented: $isActivityPickerPresented) {
                        FamilyActivityPicker(selection: Binding(
                            get: { screenTimeManager.provider.familyActivitySelection ?? FamilyActivitySelection() },
                            set: { newSelection in
                                screenTimeManager.provider.familyActivitySelection = newSelection
                                SharedDataManager.shared.saveFamilyActivitySelection(newSelection)
                                Task {
                                    await screenTimeManager.uploadFamilyActivitySelection()
                                }
                            }
                        ))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(radius: 2)
                    #endif

                    // Usage Card
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Today's Screen Time")
                            .font(.headline)

                        let remaining = screenTimeManager.lastPolicy?.remainingMinutes ?? 0
                        let dailyLimit = screenTimeManager.lastPolicy?.dailyLimitMinutes ?? 120
                        let used = screenTimeManager.lastPolicy?.usedMinutes ?? 0

                        HStack {
                            Text("\(used)")
                                .font(.system(size: 48, weight: .bold, design: .rounded))
                            Text("mins used")
                                .font(.title3)
                                .foregroundColor(.secondary)
                        }

                        ProgressView(value: Double(used), total: Double(dailyLimit))
                            .tint(used > dailyLimit ? .red : .green)

                        HStack {
                            Text("\(remaining) min remaining")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("Limit: \(dailyLimit) min")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(radius: 2)

                    // Paused Banner
                    if let pausedUntil = screenTimeManager.lastPolicy?.pausedUntil {
                        HStack {
                            Image(systemName: "pause.circle.fill")
                                .foregroundColor(.orange)
                                .font(.title2)
                            VStack(alignment: .leading) {
                                Text("Device Paused")
                                    .font(.headline)
                                    .foregroundColor(.orange)
                                Text("Until \(pausedUntil)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                        }
                        .padding()
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(12)
                    }

                    // Quick Actions
                    VStack(spacing: 12) {
                        ActionRow(icon: "arrow.clockwise", label: "Sync Policy", action: syncPolicy, isLoading: isSyncing)
                        ActionRow(icon: "xmark.circle", label: "Unpair Device", action: unpairDevice, isDestructive: true)
                    }

                    if let error = errorMessage {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
                .padding()
            }
            .navigationTitle("ScreenSprout")
            .background(Color(.systemGroupedBackground))
            .task {
                await screenTimeManager.syncPolicy()
                screenTimeManager.startMonitoring()
            }
            .onDisappear {
                screenTimeManager.stopHeartbeat()
            }
        }
    }

    func syncPolicy() {
        isSyncing = true
        errorMessage = nil
        Task {
            await screenTimeManager.syncPolicy()
            await MainActor.run { isSyncing = false }
        }
    }

    func unpairDevice() {
        screenTimeManager.unpair()
        dismiss()
    }
}

struct ActionRow: View {
    let icon: String
    let label: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDestructive: Bool = false

    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .frame(width: 24)
                } else {
                    Image(systemName: icon)
                        .foregroundColor(isDestructive ? .red : .green)
                        .frame(width: 24)
                }
                Text(label)
                    .foregroundColor(isDestructive ? .red : .primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(radius: 1)
        }
        .buttonStyle(.plain)
    }
}