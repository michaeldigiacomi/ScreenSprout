using System.Runtime.InteropServices;
using System.Xml;

namespace ScreenSprout.Watcher.Services;

/// <summary>
/// Interface for desktop notification services.
/// Provides a clean abstraction for showing various types of notifications to the user.
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Shows a toast notification when screen time limit is reached.
    /// </summary>
    /// <param name="minutesUsed">Total minutes used today</param>
    /// <param name="minutesLimit">Daily limit in minutes</param>
    void ShowTimeLimitReached(int minutesUsed, int minutesLimit);

    /// <summary>
    /// Shows a warning when screen time is running low (e.g., 15 or 5 minutes remaining).
    /// </summary>
    /// <param name="minutesRemaining">Minutes remaining</param>
    void ShowTimeWarning(int minutesRemaining);

    /// <summary>
    /// Shows a notification when an app is blocked from running.
    /// </summary>
    /// <param name="appName">Name of the blocked app</param>
    /// <param name="reason">Reason for blocking (e.g., "Time Limit Reached", "Blocked App", "Schedule")</param>
    void ShowAppBlocked(string appName, string reason);

    /// <summary>
    /// Shows a notification about schedule enforcement (e.g., "Homework time started").
    /// </summary>
    /// <param name="scheduleName">Name of the schedule</param>
    /// <param name="message">Custom message about the schedule</param>
    void ShowScheduleNotification(string scheduleName, string message);

    /// <summary>
    /// Shows a notification when device is paused by a parent.
    /// </summary>
    /// <param name="pausedUntil">When the pause will expire (null if indefinite)</param>
    void ShowDevicePaused(DateTime? pausedUntil);

    /// <summary>
    /// Shows a notification when device is resumed/unpaused.
    /// </summary>
    void ShowDeviceResumed();

    /// <summary>
    /// Shows a notification about bonus time being granted.
    /// </summary>
    /// <param name="minutes">Minutes of bonus time granted</param>
    /// <param name="grantedBy">Name of who granted the bonus time</param>
    void ShowBonusTimeGranted(int minutes, string grantedBy);

    /// <summary>
    /// Shows a general system message from parent/admin.
    /// </summary>
    /// <param name="title">Message title</param>
    /// <param name="message">Message body</param>
    void ShowSystemMessage(string title, string message);

    /// <summary>
    /// Initializes the notification service and registers with Windows.
    /// Should be called once at application startup.
    /// </summary>
    void Initialize();

    /// <summary>
    /// Unregisters the notification service. Should be called at application shutdown.
    /// </summary>
    void Unregister();
}
