using System.Diagnostics;
using System.Net;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using ScreenSprout.Watcher.Services;

namespace ScreenSprout.Watcher;

/// <summary>
/// Main background worker for ScreenSprout Windows client.
/// Handles device heartbeat, activity logging, policy enforcement, and desktop notifications.
/// </summary>
public partial class Worker : BackgroundService
{
    private static readonly HttpClient _http = new(new HttpClientHandler 
    { 
        UseCookies = true,
        CookieContainer = new CookieContainer()
    });
    
    private readonly ILogger<Worker> _logger;
    private readonly INotificationService _notificationService;
    
    private string _deviceId = string.Empty;
    private string? _childId = null;
    private string _childName = "Child";
    private string _apiUrl = "http://screensprout.digitaladrenalin.net/api";
    private const int HeartbeatIntervalSeconds = 10;

    // Device Auth Token (issued on pairing)
    private string? _deviceToken;
    private string _tokenPath = string.Empty;

    // CSRF Token Management
    private string? _csrfToken;

    // WebSocket
    private ClientWebSocket? _webSocket;
    private CancellationTokenSource? _webSocketCts;
    private bool _isWebSocketConnected = false;
    private DateTime _lastWebSocketReconnectAttempt = DateTime.MinValue;
    private readonly TimeSpan _webSocketReconnectDelay = TimeSpan.FromSeconds(30);

    // Polling state
    private DateTime _lastScheduleCheck = DateTime.MinValue;
    private DateTime _lastPolicyCheck = DateTime.MinValue;
    private readonly TimeSpan _scheduleCheckInterval = TimeSpan.FromMinutes(1);
    private readonly TimeSpan _policyCheckInterval = TimeSpan.FromSeconds(30);

    // Policy state
    private List<string> _blockedApps = new();
    private List<string> _alwaysAllowedApps = new();
    private int _policyRemainingMinutes = 120;
    private int _previousRemainingMinutes = 120;
    private int _dailyLimitMinutes = 120;
    private ScheduleResponse? _activeSchedule;
    private ScheduleResponse? _previousSchedule;
    private int _bonusMinutes = 0;
    private int _previousBonusMinutes = 0;
    private DateTime _schedulePausedUntil = DateTime.MinValue;
    private DateTime _previousPausedUntil = DateTime.MinValue;

    // Activity tracking
    private readonly List<ActivityItem> _pendingActivities = [];
    private string _cachePath = string.Empty;
    
    // Notification state tracking
    private readonly HashSet<string> _shownNotifications = new();
    private DateTime _lastTimeWarningShown = DateTime.MinValue;

    // P/Invoke for Windows API
    [DllImport("user32.dll", ExactSpelling = true)]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true)]
    private static extern int GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    /// <summary>
    /// Creates a new Worker instance with required dependencies.
    /// </summary>
    public Worker(ILogger<Worker> logger, INotificationService notificationService)
    {
        _logger = logger;
        _notificationService = notificationService;
    }

    #region Main Execution Loop

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // 1. Initialize Device Identity & Cache
        InitializeDevice();
        _cachePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
            "ScreenSprout", 
            "cache.json"
        );
        _tokenPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
            "ScreenSprout", 
            "device.token"
        );
        LoadCache();
        LoadDeviceToken();

        _logger.LogInformation("ScreenSprout Watcher Started. Device ID: {id}", _deviceId);

        // 2. Initialize Notification Service
        _notificationService.Initialize();

        // 3. Ensure device is paired
        if (string.IsNullOrEmpty(_deviceToken))
        {
            _logger.LogWarning("No device token found. Waiting for pairing...");
            _notificationService.ShowSystemMessage("ScreenSprout Setup Required", 
                "Please enter a pairing code to connect this device. Ask your parent to generate one from the ScreenSprout dashboard.");
            
            // Wait until paired (check for token file periodically)
            while (!stoppingToken.IsCancellationRequested && string.IsNullOrEmpty(_deviceToken))
            {
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                LoadDeviceToken();
            }

            if (stoppingToken.IsCancellationRequested) return;
        }

        _notificationService.ShowSystemMessage("ScreenSprout Active", "Screen time monitoring is now running.");

        // 4. Fetch CSRF Token
        await FetchCsrfTokenAsync(stoppingToken);

        // 5. Fetch Initial Policy
        await FetchPolicyAsync(stoppingToken);

        // 6. Start WebSocket Connection
        _ = Task.Run(() => MaintainWebSocketConnectionAsync(stoppingToken), stoppingToken);

        // 6. Main heartbeat loop
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PerformHeartbeatAsync(stoppingToken);
                await FetchPolicyAsync(stoppingToken);
                EnforcePolicy();
                CheckTimeWarnings();
                CheckStateChanges();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in main loop");
            }

            await Task.Delay(TimeSpan.FromSeconds(HeartbeatIntervalSeconds), stoppingToken);
        }

        // Cleanup
        _notificationService.Unregister();
        await DisconnectWebSocketAsync();
    }

    #endregion

    #region CSRF Token Support

    private async Task FetchCsrfTokenAsync(CancellationToken ct)
    {
        try
        {
            var response = await _http.GetAsync($"{_apiUrl}/auth/csrf-token", ct);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync(ct);
                var result = JsonSerializer.Deserialize<CsrfTokenResponse>(json, GetJsonOptions());
                _csrfToken = result?.CsrfToken;
                _logger.LogInformation("CSRF token fetched successfully");
            }
            else
            {
                _logger.LogWarning("Failed to fetch CSRF token: {status}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching CSRF token");
        }
    }

    private void AddCsrfHeader(HttpRequestMessage request)
    {
        if (!string.IsNullOrEmpty(_csrfToken) && 
            (request.Method == HttpMethod.Post || 
             request.Method == HttpMethod.Put || 
             request.Method == HttpMethod.Delete))
        {
            request.Headers.TryAddWithoutValidation("X-CSRF-Token", _csrfToken);
        }
    }

    private void AddDeviceAuthHeader(HttpRequestMessage request)
    {
        if (!string.IsNullOrEmpty(_deviceToken))
        {
            request.Headers.TryAddWithoutValidation("Authorization", $"Device {_deviceToken}");
        }
    }

    private async Task<HttpResponseMessage> SendWithCsrfAsync(HttpRequestMessage request, CancellationToken ct)
    {
        AddDeviceAuthHeader(request);
        AddCsrfHeader(request);
        var response = await _http.SendAsync(request, ct);

        // Handle 401 — device token may be revoked
        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            _logger.LogWarning("Device token rejected (401). Device may need re-pairing.");
            _deviceToken = null;
            if (File.Exists(_tokenPath)) File.Delete(_tokenPath);
            _notificationService.ShowSystemMessage("ScreenSprout", 
                "Device token revoked. Please re-pair this device.");
            return response;
        }

        // Handle 403 by refreshing CSRF token and retrying once
        if (response.StatusCode == HttpStatusCode.Forbidden && !request.Headers.Contains("X-CSRF-Retry"))
        {
            _logger.LogWarning("CSRF token rejected, refreshing...");
            await FetchCsrfTokenAsync(ct);
            
            if (!string.IsNullOrEmpty(_csrfToken))
            {
                request.Headers.Remove("X-CSRF-Token");
                AddCsrfHeader(request);
                request.Headers.TryAddWithoutValidation("X-CSRF-Retry", "true");
                response = await _http.SendAsync(request, ct);
            }
        }

        return response;
    }

    #endregion

    #region WebSocket Client

    private async Task MaintainWebSocketConnectionAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            if (!_isWebSocketConnected && 
                DateTime.UtcNow - _lastWebSocketReconnectAttempt > _webSocketReconnectDelay)
            {
                await ConnectWebSocketAsync(ct);
            }

            await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }
    }

    private async Task ConnectWebSocketAsync(CancellationToken ct)
    {
        try
        {
            _lastWebSocketReconnectAttempt = DateTime.UtcNow;
            
            // Strip /api from the URL and append /ws
            var baseUrl = _apiUrl.Replace("/api", "");
            var wsUrl = baseUrl.Replace("http://", "ws://").Replace("https://", "wss://") + "/ws";
            
            _webSocketCts = new CancellationTokenSource();
            _webSocket = new ClientWebSocket();
            
            await _webSocket.ConnectAsync(new Uri(wsUrl), ct);
            _isWebSocketConnected = true;
            
            _logger.LogInformation("WebSocket connected");

            // Send auth message with device token
            if (!string.IsNullOrEmpty(_deviceToken))
            {
                var authMessage = JsonSerializer.Serialize(new { type = "auth", token = _deviceToken });
                var authBytes = Encoding.UTF8.GetBytes(authMessage);
                await _webSocket.SendAsync(new ArraySegment<byte>(authBytes), WebSocketMessageType.Text, true, ct);
                _logger.LogInformation("WebSocket auth message sent");
            }
            
            // Start receiving messages
            _ = Task.Run(() => ReceiveWebSocketMessagesAsync(ct), ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "WebSocket connection failed");
            _isWebSocketConnected = false;
        }
    }

    private async Task ReceiveWebSocketMessagesAsync(CancellationToken ct)
    {
        var buffer = new byte[4096];
        
        while (_webSocket?.State == WebSocketState.Open && !ct.IsCancellationRequested)
        {
            try
            {
                var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", ct);
                    _isWebSocketConnected = false;
                    _logger.LogInformation("WebSocket closed by server");
                    break;
                }
                
                var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                await ProcessWebSocketMessageAsync(message);
            }
            catch (WebSocketException ex)
            {
                _logger.LogError(ex, "WebSocket error");
                _isWebSocketConnected = false;
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing WebSocket message");
            }
        }
        
        _isWebSocketConnected = false;
    }

    private async Task ProcessWebSocketMessageAsync(string message)
    {
        try
        {
            var wsMessage = JsonSerializer.Deserialize<WebSocketMessage>(message, GetJsonOptions());
            
            if (wsMessage?.Type == "policy_update")
            {
                _logger.LogInformation("Received policy update via WebSocket");
                if (wsMessage.Data?.TryGetProperty("blockedApps", out var blocked) == true)
                {
                    _blockedApps = JsonSerializer.Deserialize<List<string>>(blocked.GetRawText()) ?? new List<string>();
                }
                if (wsMessage.Data?.TryGetProperty("alwaysAllowedApps", out var allowed) == true)
                {
                    _alwaysAllowedApps = JsonSerializer.Deserialize<List<string>>(allowed.GetRawText()) ?? new List<string>();
                }
            }
            else if (wsMessage?.Type == "device_paused")
            {
                _logger.LogInformation("Device paused via WebSocket");
                if (wsMessage.Data?.TryGetProperty("pausedUntil", out var pausedUntil) == true &&
                    DateTime.TryParse(pausedUntil.GetString(), out var until))
                {
                    _previousPausedUntil = _schedulePausedUntil;
                    _schedulePausedUntil = until;
                    _notificationService.ShowDevicePaused(until);
                }
            }
            else if (wsMessage?.Type == "device_resumed")
            {
                _logger.LogInformation("Device resumed via WebSocket");
                _previousPausedUntil = _schedulePausedUntil;
                _schedulePausedUntil = DateTime.MinValue;
                _notificationService.ShowDeviceResumed();
            }
            else if (wsMessage?.Type == "notification")
            {
                var title = wsMessage.Data?.GetProperty("title").GetString() ?? "ScreenSprout";
                var body = wsMessage.Data?.GetProperty("message").GetString() ?? "";
                _logger.LogInformation("Received notification via WebSocket: {title}", title);
                _notificationService.ShowSystemMessage(title, body);
            }
            else if (wsMessage?.Type == "bonus_time_granted")
            {
                var minutes = wsMessage.Data?.GetProperty("minutes").GetInt32() ?? 0;
                var grantedBy = wsMessage.Data?.GetProperty("grantedBy").GetString() ?? "Parent";
                _logger.LogInformation("Bonus time granted via WebSocket: {minutes}m from {grantedBy}", minutes, grantedBy);
                _notificationService.ShowBonusTimeGranted(minutes, grantedBy);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing WebSocket message");
        }
    }

    private async Task DisconnectWebSocketAsync()
    {
        try
        {
            if (_webSocket?.State == WebSocketState.Open)
            {
                await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Service stopping", CancellationToken.None);
            }
        }
        catch { }
        
        _webSocket?.Dispose();
        _webSocketCts?.Cancel();
        _isWebSocketConnected = false;
    }

    #endregion

    #region Policy Fetch

    private async Task FetchPolicyAsync(CancellationToken ct)
    {
        // Throttle policy checks
        if (DateTime.UtcNow - _lastPolicyCheck < _policyCheckInterval)
        {
            return;
        }

        if (string.IsNullOrEmpty(_deviceToken)) return;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{_apiUrl}/device/policy");
            AddDeviceAuthHeader(request);
            var res = await _http.SendAsync(request, ct);
            
            if (res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync(ct);
                var policy = JsonSerializer.Deserialize<PolicyResponse>(json, GetJsonOptions());
                
                if (policy != null)
                {
                    // Store previous values for change detection
                    _previousRemainingMinutes = _policyRemainingMinutes;
                    _previousBonusMinutes = _bonusMinutes;
                    
                    // Update current values
                    _blockedApps = policy.BlockedApps ?? new List<string>();
                    _alwaysAllowedApps = policy.AlwaysAllowedApps ?? new List<string>();
                    _policyRemainingMinutes = policy.RemainingMinutes;
                    _dailyLimitMinutes = policy.DailyLimitMinutes;
                    _bonusMinutes = policy.BonusMinutes;
                    
                    if (!string.IsNullOrEmpty(policy.ChildId))
                    {
                        _childId = policy.ChildId;
                    }
                    if (!string.IsNullOrEmpty(policy.ChildName))
                    {
                        _childName = policy.ChildName;
                    }
                    
                    // Check for active schedule in policy response
                    if (policy.ActiveSchedule != null)
                    {
                        _previousSchedule = _activeSchedule;
                        _activeSchedule = new ScheduleResponse
                        {
                            Name = policy.ActiveSchedule.Name,
                            BlockedApps = policy.ActiveSchedule.BlockedApps,
                            AlwaysAllowedApps = policy.ActiveSchedule.AlwaysAllowedApps
                        };
                    }
                    else
                    {
                        _previousSchedule = _activeSchedule;
                        _activeSchedule = null;
                    }
                    
                    _logger.LogDebug(
                        "Policy fetched. Blocked: {blocked}, Allowed: {allowed}, Remaining: {min}m, Bonus: {bonus}m", 
                        _blockedApps.Count, 
                        _alwaysAllowedApps.Count, 
                        _policyRemainingMinutes,
                        _bonusMinutes
                    );
                }
                
                _lastPolicyCheck = DateTime.UtcNow;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching policy");
        }
    }

    #endregion

    #region Heartbeat & Activity

    private async Task PerformHeartbeatAsync(CancellationToken ct)
    {
        // Get Active Window Info
        var windowInfo = GetActiveWindow();
        if (windowInfo != null)
        {
            _pendingActivities.Add(new ActivityItem
            { 
                App = windowInfo.App, 
                Title = windowInfo.Title, 
                DurationSeconds = HeartbeatIntervalSeconds,
                Timestamp = DateTime.UtcNow
            });
        }

        if (_pendingActivities.Count > 0)
        {
            var payload = new HeartbeatRequest
            {
                DeviceId = _deviceId,
                Timestamp = DateTime.UtcNow,
                Activity = _pendingActivities.Select(a => new ActivityData
                {
                    AppName = a.App,
                    DurationSeconds = a.DurationSeconds,
                    Timestamp = a.Timestamp
                }).ToList()
            };

            var json = JsonSerializer.Serialize(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{_apiUrl}/device/heartbeat") { Content = content };
            
            var res = await SendWithCsrfAsync(request, ct);
            
            if (res.IsSuccessStatusCode)
            {
                _logger.LogDebug("Synced {count} items.", _pendingActivities.Count);
                _pendingActivities.Clear();
                SaveCache();

                // Update Policy from Response
                var responseJson = await res.Content.ReadAsStringAsync(ct);
                var policy = JsonSerializer.Deserialize<PolicyResponse>(responseJson, GetJsonOptions());
                if (policy != null)
                {
                    // Store previous values
                    _previousRemainingMinutes = _policyRemainingMinutes;
                    _previousBonusMinutes = _bonusMinutes;
                    
                    // Update current values
                    _policyRemainingMinutes = policy.RemainingMinutes;
                    _bonusMinutes = policy.BonusMinutes;
                    _blockedApps = policy.BlockedApps ?? _blockedApps;
                    _alwaysAllowedApps = policy.AlwaysAllowedApps ?? _alwaysAllowedApps;
                    
                    if (!string.IsNullOrEmpty(policy.ChildId))
                    {
                        _childId = policy.ChildId;
                    }
                    if (!string.IsNullOrEmpty(policy.ChildName))
                    {
                        _childName = policy.ChildName;
                    }
                }
            }
            else
            {
                _logger.LogWarning("Heartbeat failed: {code}. Buffering {count} items.", res.StatusCode, _pendingActivities.Count);
                SaveCache();
            }
        }
    }

    #endregion

    // Schedule info is now included in the /api/device/policy response,
    // so no separate schedule polling is needed.

    #region State Change Detection & Notifications

    /// <summary>
    /// Checks for state changes that should trigger notifications.
    /// Called on each loop iteration after policy updates.
    /// </summary>
    private void CheckStateChanges()
    {
        // Check for pause/resume state changes
        if (_schedulePausedUntil != _previousPausedUntil)
        {
            if (_schedulePausedUntil > DateTime.Now)
            {
                _notificationService.ShowDevicePaused(_schedulePausedUntil);
            }
            else if (_previousPausedUntil > DateTime.Now && _schedulePausedUntil == DateTime.MinValue)
            {
                _notificationService.ShowDeviceResumed();
            }
            _previousPausedUntil = _schedulePausedUntil;
        }

        // Check for bonus time granted
        if (_bonusMinutes > _previousBonusMinutes && _previousBonusMinutes >= 0)
        {
            var newBonus = _bonusMinutes - _previousBonusMinutes;
            _notificationService.ShowBonusTimeGranted(newBonus, "Parent");
        }

        // Check for schedule changes
        if (_activeSchedule != null && _previousSchedule == null)
        {
            // Schedule just started
            var message = $"The '{_activeSchedule.Name}' schedule is now active. Some apps may be restricted.";
            _notificationService.ShowScheduleNotification(_activeSchedule.Name, message);
        }
        else if (_activeSchedule == null && _previousSchedule != null)
        {
            // Schedule just ended
            var message = $"The '{_previousSchedule.Name}' schedule has ended. Regular app access restored.";
            _notificationService.ShowScheduleNotification(_previousSchedule.Name + " Ended", message);
        }
    }

    /// <summary>
    /// Checks for time-based warnings that should be shown.
    /// </summary>
    private void CheckTimeWarnings()
    {
        // Time limit just reached
        if (_policyRemainingMinutes <= 0 && _previousRemainingMinutes > 0)
        {
            var used = _dailyLimitMinutes + _bonusMinutes;
            _notificationService.ShowTimeLimitReached(used, _dailyLimitMinutes);
            return;
        }

        // Warning thresholds (only show once per threshold)
        var warningThresholds = new[] { 15, 5 };
        foreach (var threshold in warningThresholds)
        {
            if (_policyRemainingMinutes <= threshold && _previousRemainingMinutes > threshold)
            {
                // Only show warning if we haven't shown one recently
                if (DateTime.UtcNow - _lastTimeWarningShown > TimeSpan.FromMinutes(10))
                {
                    _notificationService.ShowTimeWarning(threshold);
                    _lastTimeWarningShown = DateTime.UtcNow;
                }
                break; // Only show the first matching threshold
            }
        }
    }

    #endregion

    #region Policy Enforcement

    private void EnforcePolicy()
    {
        var windowInfo = GetActiveWindow();
        if (windowInfo == null) return;

        var appName = windowInfo.App.ToLower();
        bool shouldBlock = false;
        string blockReason = "";

        // Check if device is paused
        if (_schedulePausedUntil > DateTime.Now)
        {
            bool isAllowed = _alwaysAllowedApps.Any(a => appName.Contains(a.ToLower()));
            if (!isAllowed)
            {
                shouldBlock = true;
                blockReason = "Device Paused";
            }
        }
        // Time Limit Lockout
        else if (_policyRemainingMinutes <= 0 && _alwaysAllowedApps.Count > 0)
        {
            bool isAllowed = _alwaysAllowedApps.Any(a => appName.Contains(a.ToLower()));
            if (!isAllowed)
            {
                shouldBlock = true;
                blockReason = "Time Limit Reached";
            }
        }
        // Schedule-based restrictions
        else if (_activeSchedule != null)
        {
            // Schedule takes precedence for blocked apps
            var scheduleBlocked = _activeSchedule.BlockedApps ?? new List<string>();
            if (scheduleBlocked.Any(b => appName.Contains(b.ToLower())))
            {
                shouldBlock = true;
                blockReason = $"Blocked by Schedule: {_activeSchedule.Name}";
            }
        }
        // Explicit Block List (Normal Operation)
        else if (_blockedApps.Any(b => appName.Contains(b.ToLower())))
        {
            shouldBlock = true;
            blockReason = "Blocked App";
        }

        if (shouldBlock)
        {
            _logger.LogWarning("Enforcement Triggered ({reason}): {app}. Terminating...", blockReason, appName);
            TerminateBlockedApp(windowInfo.App, blockReason);
        }
    }

    private void TerminateBlockedApp(string processName, string reason)
    {
        try
        {
            var processes = Process.GetProcessesByName(processName);
            foreach (var p in processes)
            {
                try
                {
                    p.Kill();
                    _logger.LogInformation("Killed process {pid}", p.Id);
                    
                    // Show notification for the blocked app
                    _notificationService.ShowAppBlocked(processName, reason);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to kill process {pid}", p.Id);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to terminate blocked app {app}", processName);
        }
    }

    #endregion

    #region Window Tracking

    private WindowInfo? GetActiveWindow()
    {
        try
        {
            var hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero) return null;

            GetWindowThreadProcessId(hwnd, out uint pid);
            var process = Process.GetProcessById((int)pid);

            var sb = new StringBuilder(256);
            int length = GetWindowText(hwnd, sb, 256);
            var title = length > 0 ? sb.ToString() : "";

            return new WindowInfo(process.ProcessName, title);
        }
        catch
        {
            return null;
        }
    }

    #endregion

    #region Cache Management

    private void LoadCache()
    {
        try
        {
            if (File.Exists(_cachePath))
            {
                var json = File.ReadAllText(_cachePath);
                var items = JsonSerializer.Deserialize<List<ActivityItem>>(json, GetJsonOptions());
                if (items != null)
                {
                    _pendingActivities.AddRange(items);
                    _logger.LogInformation("Loaded {count} cached items.", items.Count);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load cache");
        }
    }

    private void SaveCache()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_cachePath)!);
            
            if (_pendingActivities.Count == 0)
            {
                if (File.Exists(_cachePath)) File.Delete(_cachePath);
            }
            else
            {
                var json = JsonSerializer.Serialize(_pendingActivities, GetJsonOptions());
                File.WriteAllText(_cachePath, json);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save cache");
        }
    }

    #endregion

    #region Device Initialization

    public void InitializeDevice()
    {
        var path = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
            "ScreenSprout", 
            "device.id"
        );
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        if (File.Exists(path))
        {
            _deviceId = File.ReadAllText(path).Trim();
        }
        else
        {
            _deviceId = Guid.NewGuid().ToString();
            File.WriteAllText(path, _deviceId);
        }
    }

    #endregion

    #region Device Token & Pairing

    private void LoadDeviceToken()
    {
        try
        {
            if (File.Exists(_tokenPath))
            {
                _deviceToken = File.ReadAllText(_tokenPath).Trim();
                if (!string.IsNullOrEmpty(_deviceToken))
                {
                    _logger.LogInformation("Device token loaded");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load device token");
        }
    }

    /// <summary>
    /// Pairs this device using a 6-digit code from the parent dashboard.
    /// Called externally (e.g., via a CLI argument or setup UI).
    /// Stores the device token on success.
    /// </summary>
    public async Task<bool> PairWithCodeAsync(string pairingCode, CancellationToken ct)
    {
        try
        {
            var payload = new
            {
                code = pairingCode,
                deviceId = _deviceId,
                deviceName = Environment.MachineName,
                deviceType = "windows"
            };

            var json = JsonSerializer.Serialize(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{_apiUrl}/device/pair")
            {
                Content = content
            };

            var response = await _http.SendAsync(request, ct);

            if (response.IsSuccessStatusCode)
            {
                var responseJson = await response.Content.ReadAsStringAsync(ct);
                var result = JsonSerializer.Deserialize<PairResponse>(responseJson, GetJsonOptions());

                if (!string.IsNullOrEmpty(result?.Token))
                {
                    _deviceToken = result.Token;
                    Directory.CreateDirectory(Path.GetDirectoryName(_tokenPath)!);
                    File.WriteAllText(_tokenPath, _deviceToken);

                    _childId = result.Device?.ChildId;
                    _childName = result.Device?.ChildName ?? "Child";

                    _logger.LogInformation("Device paired successfully. Child: {name}", _childName);
                    _notificationService.ShowSystemMessage("ScreenSprout Paired",
                        $"This device is now monitoring screen time for {_childName}.");

                    return true;
                }
            }
            else
            {
                var errorJson = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("Pairing failed: {status} {error}", response.StatusCode, errorJson);
                _notificationService.ShowSystemMessage("Pairing Failed",
                    "The pairing code was invalid or expired. Please try again.");
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during pairing");
            return false;
        }
    }

    #endregion

    #region JSON Options

    private static JsonSerializerOptions GetJsonOptions()
    {
        return new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }

    #endregion

    #region Data Models

    private record WindowInfo(string App, string Title);
    
    private class ActivityItem
    {
        public string App { get; set; } = "";
        public string Title { get; set; } = "";
        public int DurationSeconds { get; set; }
        public DateTime Timestamp { get; set; }
    }

    private class ActivityData
    {
        public string AppName { get; set; } = "";
        public int DurationSeconds { get; set; }
        public DateTime Timestamp { get; set; }
    }

    private class HeartbeatRequest
    {
        public string DeviceId { get; set; } = "";
        public DateTime Timestamp { get; set; }
        public List<ActivityData> Activity { get; set; } = new();
    }

    private class PolicyResponse
    {
        public string? DeviceName { get; set; }
        public string? ChildName { get; set; }
        public string? ChildId { get; set; }
        public int DailyLimitMinutes { get; set; }
        public int BonusMinutes { get; set; }
        public int RemainingMinutes { get; set; }
        public List<string>? BlockedApps { get; set; }
        public List<string>? AlwaysAllowedApps { get; set; }
        public ActiveScheduleInfo? ActiveSchedule { get; set; }
    }

    private class ActiveScheduleInfo
    {
        public string Name { get; set; } = "";
        public List<string> BlockedApps { get; set; } = new();
        public List<string> AlwaysAllowedApps { get; set; } = new();
    }

    private class CsrfTokenResponse
    {
        public string? CsrfToken { get; set; }
    }

    private class ScheduleResponse
    {
        public string Id { get; set; } = "";
        public string ChildId { get; set; } = "";
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public List<int> DaysOfWeek { get; set; } = new();
        public string StartTime { get; set; } = "";
        public string EndTime { get; set; } = "";
        public List<string> BlockedApps { get; set; } = new();
        public List<string> AlwaysAllowedApps { get; set; } = new();
        public bool IsActive { get; set; }
    }

    private class BonusTimeResponse
    {
        public int TotalMinutes { get; set; }
        public int GrantCount { get; set; }
    }

    private class WebSocketMessage
    {
        public string Type { get; set; } = "";
        public JsonElement? Data { get; set; }
    }

    private class PairResponse
    {
        public string? Status { get; set; }
        public string? Token { get; set; }
        public PairDeviceInfo? Device { get; set; }
    }

    private class PairDeviceInfo
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? ChildId { get; set; }
        public string? ChildName { get; set; }
    }

    #endregion
}
