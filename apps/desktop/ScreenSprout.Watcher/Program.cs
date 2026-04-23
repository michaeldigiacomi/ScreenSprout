using ScreenSprout.Watcher;
using ScreenSprout.Watcher.Services;
using Microsoft.Win32;
using System.Diagnostics;

var builder = Host.CreateApplicationBuilder(args);

// Register dependencies
builder.Services.AddSingleton<INotificationService, WindowsNotificationService>();
builder.Services.AddSingleton<Worker>();

// Ensure protocol is registered on startup (Best effort)
try { EnsureProtocolRegistered(); } catch { /* Ignore registry errors */ }

// Check for CLI arguments
bool pairingMode = false;
string? pairingCode = null;

if (args.Length > 0)
{
    if (args[0] == "--pair" && args.Length > 1)
    {
        pairingMode = true;
        pairingCode = args[1];
    }
    else if ((args[0] == "--pair-url" && args.Length > 1) || args[0].StartsWith("screensprout://"))
    {
        // Handle screensprout://pair?code=123456
        // If passed directly as first arg (URI handling vary by OS/Shell), take it.
        // If passed via --pair-url flag, take second arg.
        var uriString = args[0].StartsWith("screensprout://") ? args[0] : args[1];
        
        if (Uri.TryCreate(uriString, UriKind.Absolute, out var uri))
        {
            var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
            pairingCode = query["code"];
            if (!string.IsNullOrEmpty(pairingCode))
            {
                pairingMode = true;
            }
        }
    }
}

if (pairingMode && !string.IsNullOrEmpty(pairingCode))
{
    var host = builder.Build();
    var worker = host.Services.GetRequiredService<Worker>();
    var notificationService = host.Services.GetRequiredService<INotificationService>();
    
    notificationService.Initialize();
    
    Console.WriteLine("Initializing device identity...");
    worker.InitializeDevice();
    
    Console.WriteLine($"Attempting to pair with code: {pairingCode}...");
    var success = await worker.PairWithCodeAsync(pairingCode, CancellationToken.None);
    
    if (success)
    {
        Console.WriteLine("SUCCESS: Device paired!");
        // If launched via protocol, keep window open briefly or show notification
        notificationService.ShowSystemMessage("ScreenSprout Paired", "Device successfully connected via Magic Link!");
        await Task.Delay(3000); 
        Environment.Exit(0);
    }
    else
    {
        Console.WriteLine("FAILURE: Pairing failed.");
        notificationService.ShowSystemMessage("ScreenSprout", "Pairing failed. Code may have expired.");
        Environment.Exit(1);
    }
}
else
{
    // Normal Execution
    builder.Services.AddHostedService<Worker>(sp => sp.GetRequiredService<Worker>());
    var host = builder.Build();
    host.Run();
}

void EnsureProtocolRegistered()
{
    if (!OperatingSystem.IsWindows()) return;

    const string ProtocolName = "screensprout";
    var keyPath = $"Software\\Classes\\{ProtocolName}";
    
    using var key = Registry.CurrentUser.OpenSubKey(keyPath);
    if (key == null)
    {
        // Register protocol
        using var newKey = Registry.CurrentUser.CreateSubKey(keyPath);
        newKey.SetValue("", "URL:ScreenSprout Protocol");
        newKey.SetValue("URL Protocol", "");
        
        using var commandKey = newKey.CreateSubKey(@"shell\open\command");
        var exePath = Process.GetCurrentProcess().MainModule?.FileName;
        // Handle .dll running via dotnet.exe vs standalone .exe
        if (exePath != null && exePath.EndsWith(".dll"))
        {
            exePath = Process.GetCurrentProcess().MainModule?.FileName.Replace(".dll", ".exe");
        }
        
        if (!string.IsNullOrEmpty(exePath))
        {
            commandKey.SetValue("", $"\"{exePath}\" --pair-url \"%1\"");
        }
    }
}
