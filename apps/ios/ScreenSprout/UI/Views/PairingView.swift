import SwiftUI
import Combine

class PairingViewModel: ObservableObject {
    @Published var pairingCode: String = ""
    @Published var isEnrolling = false
    @Published var errorMessage: String?
    @Published var isEnrolled = false
    @Published var pairedDeviceName: String?

    private let apiClient: APIClient

    init(apiClient: APIClient? = nil) {
        self.apiClient = apiClient ?? APIClient()
    }

    func enroll() async {
        DispatchQueue.main.async {
            self.isEnrolling = true
            self.errorMessage = nil
        }

        do {
            #if os(iOS)
            let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
            let deviceName = UIDevice.current.name
            let deviceType = "iOS"
            #else
            let deviceId = "mac_\(ProcessInfo.processInfo.hostName)"
            let deviceName = Host.current().localizedName ?? "Mac Device"
            let deviceType = "macOS"
            #endif

            let response = try await apiClient.pairDevice(
                code: pairingCode,
                deviceId: deviceId,
                deviceName: deviceName,
                deviceType: deviceType
            )

            // Store the device token for future API calls
            apiClient.setToken(response.token)

            // Save pairing info to ScreenTimeManager for persistence
            await MainActor.run {
                ScreenTimeManager.shared.setPairingInfo(
                    deviceId: response.device.id,
                    deviceName: response.device.name,
                    childId: response.device.childId,
                    childName: response.device.childName ?? "Child"
                )
                ScreenTimeManager.shared.apiClient.setToken(response.token)

                self.pairedDeviceName = response.device.name
                self.isEnrolled = true
                self.isEnrolling = false
            }
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = "Pairing failed: \(error.localizedDescription)"
                self.isEnrolling = false
            }
        }
    }
}

struct PairingView: View {
    @StateObject private var viewModel = PairingViewModel()
    @StateObject private var screenTimeManager = ScreenTimeManager.shared

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "leaf.fill")
                .resizable()
                .frame(width: 80, height: 80)
                .foregroundColor(.green)
                .padding(.bottom, 20)

            Text("Welcome to ScreenSprout")
                .font(.title).bold()

            Text("Enter your 6-digit pairing code to get started.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            TextField("000000", text: $viewModel.pairingCode)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .font(.title2)
                .padding(.horizontal, 60)

            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
            }

            Button(action: {
                Task {
                    await viewModel.enroll()
                }
            }) {
                if viewModel.isEnrolling {
                    ProgressView()
                        .progressViewStyle(.circular)
                } else {
                    Text("Connect Device")
                        .bold()
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.pairingCode.count != 6)
            .padding(.horizontal, 40)
        }
        .padding()
        .fullScreenCover(isPresented: $viewModel.isEnrolled) {
            DashboardView()
        }
    }
}