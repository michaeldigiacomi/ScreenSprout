# ScreenSprout - Technical Architecture

## System Overview
ScreenSprout operates as a distributed system with a centralized management backend and native clients on target devices.

### 1. Backend Infrastructure (Kubernetes)
Hosted on a private K3s cluster (`legion5`).
*   **API Service**: Node.js/Express (or similar) handling device sync, auth, and policy storage.
*   **Database**: PostgreSQL for persistent user data, schedules, and device logs.
*   **Registry**: GHCR (`ghcr.io/screensprout/` and `ghcr.io/digiacomi-shared/screensprout/`) for container images.
*   **CI/CD**: GitHub Actions for automated testing and deployment.
*   **Monitoring**: Prometheus metrics for system health.

### 2. Android Client (`android-client`)
*   **Language**: Kotlin.
*   **UI Framework**: Jetpack Compose.
*   **Core Mechanics**:
    *   `UsageStatsService`: Queries `UsageStatsManager` to detect foreground apps.
    *   `OverlayService`: Uses `SYSTEM_ALERT_WINDOW` permission to draw a full-screen, non-dismissible view over blocked apps.
    *   **Sync**: Periodically fetches policies from the Backend API and uploads usage logs.

### 3. Desktop Client (`windows-client-net`)
*   **Language**: C# / .NET 9.0.
*   **Platforms**: Windows (.NET 9 Worker Service, headless).
*   **Core Mechanics**:
    *   **Process Monitoring**: Tracks active window handles and process names.
    *   **Blocking**: Kills prohibited processes or minimizes windows (configurable).
    *   **Installer**: Manual deployment as a Windows Service.

### 4. Communication Protocol
*   **Transport**: HTTPS (REST) and WebSocket for real-time updates.
*   **Auth**: JWT-based authentication for devices.
*   **Payload**: JSON policy definitions (e.g., `{ "blocked_apps": ["com.tiktok", "Minecraft"], "allowed_hours": "1800-2000" }`).

## Security & Reliability
*   **Tamper Protection**: Clients implement "Device Admin" (Android) or Service (Windows) privileges to prevent uninstallation.
*   **Offline Mode**: Policies are cached locally; enforcement continues without internet.
*   **Backups**: Automated daily backups of DB and Configs to local storage.
