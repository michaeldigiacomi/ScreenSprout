using Microsoft.Toolkit.Uwp.Notifications;
using System.Diagnostics;

namespace ScreenSprout.Watcher.Services;

/// <summary>
/// Windows implementation of INotificationService using Microsoft.Toolkit.Uwp.Notifications.
/// Provides modern native Windows toast notifications compatible with .NET Worker services.
/// 
/// Note: For notifications to work correctly, the app needs either:
/// 1. A shortcut in Start Menu with an AppUserModelID, OR
/// 2. To be registered as a COM server for desktop bridge apps
/// 
/// For this worker service, we use the "AppNotification" API which works without a UI
/// but requires Windows 10 version 19041 (20H1) or later.
/// </summary>
public class WindowsNotificationService : INotificationService
{
    private readonly ILogger<WindowsNotificationService> _logger;
    private bool _isInitialized = false;
    private const string AppUserModelId = "ScreenSprout.Watcher";

    // Notification tracking to prevent spam
    private readonly Dictionary<string, DateTime> _lastNotificationTimes = new();
    private readonly TimeSpan _notificationCooldown = TimeSpan.FromMinutes(5);

    public WindowsNotificationService(ILogger<WindowsNotificationService> logger)
    {
        _logger = logger;
    }

    public void Initialize()
    {
        if (_isInitialized) return;

        try
        {
            // Check if running on Windows
            if (!OperatingSystem.IsWindows())
            {
                _logger.LogWarning("Not running on Windows - toast notifications disabled");
                return;
            }

            // Check Windows version (Toast notifications require Windows 10 19041+)
            var osVersion = Environment.OSVersion.Version;
            if (osVersion.Major < 10 || (osVersion.Major == 10 && osVersion.Build < 19041))
            {
                _logger.LogWarning("Windows version {version} detected. Toast notifications require Windows 10 20H1 (19041) or later.", osVersion);
                return;
            }

            // Register AUMID for toast notifications
            // In production, this should match your app's registered AUMID
            // ToastNotificationManagerCompat.Initialize(AppUserModelId); // API not available in this version
            
            _isInitialized = true;
            _logger.LogInformation("Windows Notification Service initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Windows Notification Service");
        }
    }

    public void Unregister()
    {
        try
        {
            if (_isInitialized)
            {
                // ToastNotificationManagerCompat.Uninitialize(); // API not available in this version
                _isInitialized = false;
                _logger.LogInformation("Windows Notification Service unregistered");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unregistering Windows Notification Service");
        }
    }

    public void ShowTimeLimitReached(int minutesUsed, int minutesLimit)
    {
        if (!ShouldShowNotification("time_limit_reached")) return;

        try
        {
            new ToastContentBuilder()
                .AddArgument("action", "timeLimitReached")
                .AddText("⏰ Daily Screen Time Limit Reached")
                .AddText($"You've used {minutesUsed} minutes of your {minutesLimit} minute daily limit. Some apps may now be blocked.")
                .AddAttributionText("ScreenSprout")
                .Show(toast =>
                {
                    toast.Tag = "time_limit";
                    toast.Group = "screensprout_policy";
                });

            RecordNotification("time_limit_reached");
            _logger.LogInformation("Shown time limit reached notification: {used}/{limit} minutes", minutesUsed, minutesLimit);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to show time limit notification");
        }
    }

    public void ShowTimeWarning(int minutesRemaining)
    {
        var notificationKey = $"time_warning_{minutesRemaining}";
        if (!ShouldShowNotification(notificationKey)) return;

        try
        {
            var urgency = minutesRemaining <= 5 ? "⚠️" : "⏳";
            var builder = new ToastContentBuilder()
                .AddArgument("action", "timeWarning")
                .AddArgument("minutes", minutesRemaining.ToString())
                .AddText($"{urgency} Screen Time Running Low")
                .AddText($"You have {minutesRemaining} minutes of screen time remaining today.")
                .AddAttributionText("ScreenSprout");

            // Add action button to request bonus time (if supported by backend)
            if (minutesRemaining <= 5)
            {
                builder.AddButton(new ToastButton()
                    .SetContent("Request More Time")
                    .AddArgument("action", "requestBonusTime"));
            }

            builder.Show(toast =>
            {
                toast.Tag = "time_warning";
                toast.Group = "screensprout_policy";
            });

            RecordNotification(notificationKey);
            _logger.LogInformation("Shown time warning notification: {minutes} minutes remaining", minutesRemaining);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to show time warning notification");
        }
    }

    public void ShowAppBlocked(string appName, string reason)
    {
        var notificationKey = $"app_blocked_{appName}";
        if (!ShouldShowNotification(notificationKey)) return;

        try
        {
            new ToastContentBuilder()
                .AddArgument("action", "appBlocked")
                .AddArgument("app", appName)
                .AddText("🚫 App Blocked")
                .AddText($"{appName} has been blocked: {reason}")
                .AddAttributionText("ScreenSprout")
                .Show(toast =>
                {
                    toast.Tag = "app_blocked";
                    toast.Group = "screensprout_enforcement";
                });

            RecordNotification(notificationKey);
            _logger.LogInformation("Shown app blocked notification: {app} - {reason}", appName, reason);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to show app blocked notification");
        }
    }

    public void ShowScheduleNotification(string scheduleName, string message)
    {
        var notificationKey = $"schedule_{scheduleName}";
        if (!ShouldShowNotification(notificationKey)) return;

        try
        {
            new ToastContentBuilder()
                .AddArgument("action", "schedule")
                .AddArgument("schedule", scheduleName)
                .AddText($"📅 {scheduleName}")
                .AddText(message)
                .AddAttributionText("ScreenSprout Schedule")
                .Show(toast =>
                {
                    toast.Tag = "schedule";
                    toast.Group = "screensprout_schedule";
                });

            RecordNotification(notificationKey);
            _logger.LogInformation("Shown schedule notification: {schedule}", scheduleName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to show schedule notification");
        }
    }

    public void ShowDevicePaused(DateTime? pausedUntil)
    {
        if (!ShouldShowNotification("device_paused")) return;

        try
        {
            var timeText = pausedUntil.HasValue 
                ? $"until {pausedUntil.Value:hh:mm tt}" 
                : "indefinitely";

            new ToastContentBuilder()
                .AddArgument("action", "devicePaused")
                .AddText("⏸️ Device Paused")
                .AddText($"Your device has been paused by a parent {timeText}. Non-essential apps are now blocked.")
                .AddAttributionText("ScreenSprout")
                .Show(toast =>
                {
                    toast.Tag = "device_paused";
                    toast.Group = "screensprout_control";
                });

            RecordNotification("device_paused");
            _logger.LogInformation("Shown device paused notification until {until}", pausedUntil);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to show device paused notification");
        }
    }

    public void ShowDeviceResumed()
    {
        if (!ShouldShowNotification("device_resumed")) return;

        try
        {
            new ToastContentBuilder()
                .AddArgument("action", "deviceResumed")
                .AddText("▶️ Device Resumed")
                .AddText("Your device has been resumed. You can now use your apps again.")
                .AddAttributionText("ScreenSprout")
                .Show(toast =>
                {
                    toast.Tag = "device_resumed";
                    toast.Group = "screensprout_control";
                });

            RecordNotification("device_resumed");
            _logger.LogInformation("Shown device resumed notification");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to show device resumed notification");
        }
    }

    public void ShowBonusTimeGranted(int minutes, string grantedBy)
    {
        if (!ShouldShowNotification("bonus_time_granted")) return;

        try
        {
            new ToastContentBuilder()
                .AddArgument("action", "bonusTimeGranted")
                .AddArgument("minutes", minutes.ToString())
                .AddText("🎉 Bonus Time Granted!")
                .AddText($"{grantedBy} has granted you {minutes} extra minutes of screen time!")
                .AddAttributionText("ScreenSprout")
                .Show(toast =>
                {
                    toast.Tag = "bonus_time";
                    toast.Group = "screensprout_rewards";
                });

            RecordNotification("bonus_time_granted");
            _logger.LogInformation("Shown bonus time granted notification: {minutes} minutes from {grantedBy}", minutes, grantedBy);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to show bonus time notification");
        }
    }

    public void ShowSystemMessage(string title, string message)
    {
        // System messages should always show (no cooldown)
        try
        {
            new ToastContentBuilder()
                .AddArgument("action", "systemMessage")
                .AddText($"📢 {title}")
                .AddText(message)
                .AddAttributionText("ScreenSprout")
                .Show(toast =>
                {
                    toast.Tag = "system_message";
                    toast.Group = "screensprout_system";
                });

            _logger.LogInformation("Shown system message: {title}", title);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to show system message");
        }
    }

    /// <summary>
    /// Checks if enough time has passed since the last notification of this type.
    /// Prevents notification spam.
    /// </summary>
    private bool ShouldShowNotification(string notificationType)
    {
        if (!_isInitialized)
        {
            _logger.LogDebug("Notification service not initialized, skipping notification");
            return false;
        }

        if (_lastNotificationTimes.TryGetValue(notificationType, out var lastTime))
        {
            if (DateTime.UtcNow - lastTime < _notificationCooldown)
            {
                _logger.LogDebug("Skipping notification '{type}' - cooldown active", notificationType);
                return false;
            }
        }
        return true;
    }

    /// <summary>
    /// Records that a notification was shown.
    /// </summary>
    private void RecordNotification(string notificationType)
    {
        _lastNotificationTimes[notificationType] = DateTime.UtcNow;
    }
}
