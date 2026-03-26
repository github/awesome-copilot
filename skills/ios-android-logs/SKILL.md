---
name: ios-android-logs
description: Guide to accessing device logs on iOS and Android for Capacitor apps. Covers command-line tools, GUI applications, filtering, and real-time streaming. Use this skill when users need to view device logs for debugging.
---

# iOS and Android Device Logs

Complete guide to viewing and filtering device logs on iOS and Android.

## When to Use This Skill

- User needs to see device logs
- User is debugging crashes
- User wants to filter logs by app
- User needs real-time log streaming
- User asks "how to see logs"

## Quick Commands

```bash
# iOS - Stream logs from connected device
xcrun devicectl device log stream --device <UUID>

# iOS - Stream from simulator
xcrun simctl spawn booted log stream

# Android - Stream all logs
adb logcat

# Android - Filter by package
adb logcat --pid=$(adb shell pidof com.yourapp.id)
```

## iOS Logs

### Method 1: Console.app (GUI)

1. Open **Console.app** (Applications > Utilities)
2. Select your device in sidebar
3. Click "Start Streaming"
4. Use search to filter:
   - By process: `process:YourApp`
   - By subsystem: `subsystem:com.yourapp`
   - By message: `"error"`

### Method 2: devicectl (CLI - Recommended)

```bash
# List connected devices
xcrun devicectl list devices

# Stream logs from specific device
xcrun devicectl device log stream --device <DEVICE_UUID>

# Stream with predicate filter
xcrun devicectl device log stream --device <DEVICE_UUID> \
  --predicate 'process == "YourApp"'

# Stream specific log levels
xcrun devicectl device log stream --device <DEVICE_UUID> \
  --level error

# Save to file
xcrun devicectl device log stream --device <DEVICE_UUID> \
  --predicate 'process == "YourApp"' > app_logs.txt
```

### Method 3: simctl for Simulators

```bash
# Stream logs from booted simulator
xcrun simctl spawn booted log stream

# Filter by process
xcrun simctl spawn booted log stream --predicate 'process == "YourApp"'

# Filter by subsystem
xcrun simctl spawn booted log stream --predicate 'subsystem == "com.yourapp"'

# Show only errors
xcrun simctl spawn booted log stream --level error

# Combine filters
xcrun simctl spawn booted log stream \
  --predicate 'process == "YourApp" AND messageType == error'
```

### Method 4: Xcode Device Logs

1. Window > Devices and Simulators
2. Select device
3. Click "Open Console"
4. Or: View device logs for crash reports

### iOS Log Predicate Examples

```bash
# Process name
--predicate 'process == "YourApp"'

# Contains text
--predicate 'eventMessage contains "error"'

# Subsystem
--predicate 'subsystem == "com.yourapp.plugin"'

# Category
--predicate 'category == "network"'

# Log level
--predicate 'messageType == error'

# Combined
--predicate 'process == "YourApp" AND messageType >= error'

# Time-based (last 5 minutes)
--predicate 'timestamp > now - 5m'
```

### iOS Log Levels

| Level | Description |
|-------|-------------|
| `default` | Default messages |
| `info` | Informational |
| `debug` | Debug (hidden by default) |
| `error` | Error conditions |
| `fault` | Fault/critical |

## Android Logs

### Method 1: adb logcat (CLI)

```bash
# Basic log stream
adb logcat

# Clear logs first, then stream
adb logcat -c && adb logcat

# Filter by tag
adb logcat -s MyTag:D

# Filter by priority
adb logcat *:E  # Only errors and above

# Filter by package name
adb logcat --pid=$(adb shell pidof com.yourapp.id)

# Filter by multiple tags
adb logcat -s "MyPlugin:D" "Capacitor:I"

# Save to file
adb logcat > logs.txt

# Save to file with timestamp
adb logcat -v time > logs.txt
```

### Method 2: Android Studio Logcat (GUI)

1. View > Tool Windows > Logcat
2. Use filter dropdown:
   - Package: `package:com.yourapp`
   - Tag: `tag:MyPlugin`
   - Level: `level:error`
3. Create saved filters for quick access

### Method 3: pidcat (Better CLI Tool)

```bash
# Install pidcat
pip install pidcat

# Stream logs for package
pidcat com.yourapp.id

# With tag filter
pidcat -t MyPlugin com.yourapp.id
```

### Android Log Priority Levels

| Letter | Priority |
|--------|----------|
| V | Verbose |
| D | Debug |
| I | Info |
| W | Warn |
| E | Error |
| F | Fatal |
| S | Silent |

### adb logcat Format Options

```bash
# Different output formats
adb logcat -v brief     # Default
adb logcat -v process   # PID only
adb logcat -v tag       # Tag only
adb logcat -v time      # With timestamp
adb logcat -v threadtime # With thread and time
adb logcat -v long      # All metadata

# Colorized output
adb logcat -v color

# Show recent logs (last N lines)
adb logcat -d -t 100

# Show logs since timestamp
adb logcat -v time -T "01-25 10:00:00.000"
```

### Common Android Filters

```bash
# Capacitor core logs
adb logcat -s "Capacitor:*"

# Plugin-specific logs
adb logcat -s "CapacitorNativeBiometric:*"

# WebView logs (JavaScript console)
adb logcat -s "chromium:*"

# JavaScript errors
adb logcat | grep -i "js error\|uncaught"

# Crash logs
adb logcat | grep -iE "fatal|crash|exception"

# Network logs
adb logcat -s "OkHttp:*" "NetworkSecurityConfig:*"
```

## Viewing Crash Logs

### iOS Crash Logs

```bash
# Copy crash logs from device
xcrun devicectl device copy crashlog --device <UUID> ./crashes/

# View in Console.app
# User Diagnostics Reports section

# Or find at:
# Device: Settings > Privacy > Analytics & Improvements > Analytics Data
# Mac: ~/Library/Logs/DiagnosticReports/
```

### Android Crash Logs

```bash
# Get tombstone (native crash)
adb shell cat /data/tombstones/tombstone_00

# Get ANR traces
adb pull /data/anr/traces.txt

# Get bugreport (comprehensive)
adb bugreport > bugreport.zip
```

## MCP Integration

Use MCP tools to fetch logs programmatically:

```typescript
// Example MCP tool for fetching iOS logs
const logs = await mcp.ios.streamLogs({
  device: 'booted',
  predicate: 'process == "YourApp"',
  level: 'debug',
});

// Example MCP tool for Android logs
const androidLogs = await mcp.android.logcat({
  package: 'com.yourapp.id',
  level: 'D',
});
```

## Log Parsing Tips

### Extract JavaScript Errors

```bash
# iOS - JavaScript console logs
xcrun simctl spawn booted log stream \
  --predicate 'eventMessage contains "JS:"'

# Android - WebView console
adb logcat chromium:I *:S | grep "console"
```

### Filter Network Requests

```bash
# iOS
xcrun simctl spawn booted log stream \
  --predicate 'subsystem == "com.apple.network"'

# Android
adb logcat -s "NetworkSecurityConfig:*" "OkHttp:*"
```

### Monitor Memory

```bash
# iOS - Memory pressure
xcrun simctl spawn booted log stream \
  --predicate 'eventMessage contains "memory"'

# Android - Memory info
adb shell dumpsys meminfo com.yourapp.id
```

## Troubleshooting

### Issue: No Logs Showing

**iOS**:
- Ensure device is trusted: Xcode > Window > Devices
- Try restarting log stream
- Check Console.app filters

**Android**:
- Enable USB debugging
- Run `adb devices` to verify connection
- Try `adb kill-server && adb start-server`

### Issue: Too Many Logs

Use filters:
```bash
# iOS - Only your app
--predicate 'process == "YourApp" AND messageType >= info'

# Android - Only your package
adb logcat --pid=$(adb shell pidof com.yourapp.id)
```

### Issue: Missing Debug Logs

**iOS**: Debug logs are hidden by default
```bash
# Enable debug logs
xcrun simctl spawn booted log stream --level debug
```

**Android**: Ensure log level is set correctly
```kotlin
Log.d("Tag", "Debug message")  // D level
```

## Best Practices

1. **Use structured logging** - Include context in log messages
2. **Add timestamps** - Helps correlate events
3. **Filter early** - Don't stream all logs
4. **Save important logs** - Redirect to file for later analysis
5. **Use log levels appropriately** - Debug for dev, error for production

## Resources

- iOS Unified Logging: https://developer.apple.com/documentation/os/logging
- Android Logcat: https://developer.android.com/studio/debug/logcat
- devicectl Reference: https://developer.apple.com/documentation/devicemanagement
