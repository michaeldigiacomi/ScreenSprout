# Screen Sprout Desktop

A background service for ScreenSprout parental controls. Runs as a .NET Worker Service on Windows 10+ (build 17763 / version 1809 or later).

## Prerequisites

- .NET 9.0 SDK or later
- Windows 10 version 1809+ (for toast notifications and P/Invoke support)

## How to Run

```bash
cd ScreenSprout.Watcher
dotnet run
```

This starts the application in normal mode as a hosted service. It will:
- Wait for device pairing (if no token is stored)
- Connect to the ScreenSprout API
- Start monitoring foreground window activity
- Enforce screen time policies
- Send heartbeats every 10 seconds
- Connect via WebSocket for real-time policy updates

## Pairing Mode

Run with a pairing code:

```bash
dotnet run -- --pair <CODE>
```

Or with a pairing URL:

```bash
dotnet run -- --pair-url "screensprout://pair?code=<CODE>"
```

Pairing mode shows a toast notification for success/failure, then exits.

## Protocol Registration

On Windows, the application registers the `screensprout://` custom URI scheme on startup, allowing it to be launched from browsers.

## Building

```bash
dotnet restore ScreenSprout.slnx
dotnet build ScreenSprout.slnx --configuration Release --no-restore
dotnet publish ScreenSprout.Watcher/ScreenSprout.Watcher.csproj --configuration Release --self-contained true --runtime win-x64 --output ./publish
```

## Configuration

The application stores local data in `%LOCALAPPDATA%/ScreenSprout/`:
- `device.id` - Persistent device UUID
- `device.token` - Auth token received after pairing
- `cache.json` - Buffered activity data for offline resilience

The API base URL is `https://app.screensprout.digitaladrenalin.net/api` and WebSocket URL is `wss://app.screensprout.digitaladrenalin.net/api/ws`.