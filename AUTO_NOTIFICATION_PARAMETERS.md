# Auto-Notification System Parameters

## 🚨 System Performance Thresholds

### CPU Usage Alerts
- **Warning Level**: 75% CPU usage
- **Critical Level**: 90% CPU usage
- **Check Interval**: Every 10 seconds
- **Cooldown Period**: 5 minutes between same alerts

### Memory Usage Alerts
- **Warning Level**: 80% memory usage
- **Critical Level**: 95% memory usage
- **Check Interval**: Every 10 seconds
- **Cooldown Period**: 5 minutes between same alerts

### Disk Space Alerts
- **Warning Level**: 85% disk usage
- **Critical Level**: 95% disk usage
- **Check Interval**: Every 10 seconds
- **Cooldown Period**: 5 minutes between same alerts

### Network Usage Alerts
- **Warning Level**: 80% network usage
- **Critical Level**: 95% network usage
- **Check Interval**: Every 10 seconds
- **Cooldown Period**: 5 minutes between same alerts

## 🏥 Health Check Parameters

### Database Connection
- **Check Interval**: Every 2 minutes (120 seconds)
- **Failure Rate**: 5% chance of simulated failure
- **Alert Type**: Error notification

### API Response Time & Availability
- **Check Interval**: Every 1 minute (60000 ms)
- **API Endpoint**: `/api/health` (configurable)
- **Request Timeout**: 10 seconds (10000 ms)
- **Slow Response Threshold**: 3000 ms (3 seconds)
- **Service Unavailable**: When API returns error or no response
- **Performance Issue**: When response time > 3000ms
- **Alert Types**:
  - Critical error for service unavailable
  - Medium warning for slow response

### Storage Access
- **Check Interval**: Every 2 minutes
- **Failure Rate**: 2% chance of simulated failure
- **Alert Type**: Error notification

### Network Connectivity
- **Check Interval**: Every 2 minutes
- **Failure Rate**: 8% chance of simulated failure
- **Alert Type**: Error notification

## 🔄 Scheduled Events

### Daily Backup Notifications
- **Interval**: Every 24 hours (86400000 ms)
- **Success Rate**: 90% chance of success
- **Failure Rate**: 10% chance of failure
- **Success Alert**: Low priority, success type
- **Failure Alert**: Critical priority, error type

### Security Scan Notifications
- **Interval**: Every 12 hours (43200000 ms)
- **Success Rate**: 100% (always runs)
- **Alert Type**: Info notification, low priority

### System Update Notifications
- **Interval**: Every 7 days (604800000 ms)
- **Probability**: 30% chance per week
- **Alert Type**: Info notification, medium priority

## 🌐 Browser Resource Monitoring

### Browser Memory Usage
- **Check Interval**: Every 60 seconds
- **Warning Threshold**: 85% of JavaScript heap limit
- **Alert Type**: Warning notification
- **Cooldown**: 5 minutes

### Storage Quota
- **Check Interval**: Every 60 seconds
- **Warning Threshold**: 80% of browser storage quota
- **Critical Threshold**: 95% of browser storage quota
- **Alert Type**: Warning/Error notification

### Battery Level (if available)
- **Warning Threshold**: 20% battery level
- **Critical Threshold**: 10% battery level
- **Only alerts when**: Not charging
- **Alert Type**: Warning/Error notification

### Network Connection Quality
- **Monitors**: Connection type and speed
- **Slow Connection Alert**: When connection is 2G or slow-2G
- **Low Bandwidth Alert**: When downlink < 1 Mbps
- **Alert Type**: Warning notification

## 📊 Realistic Data Generation

### Work Hours Simulation
- **Work Hours**: 9 AM - 6 PM (higher usage)
- **Off Hours**: 6 PM - 9 AM (lower usage)
- **Work Hour Multiplier**: 1.3x base usage
- **Off Hour Multiplier**: 0.8x base usage

### CPU Usage Pattern
- **Base Range**: 5-35% (oscillates with sine wave)
- **Random Variation**: ±20%
- **Work Hour Boost**: +30% during work hours

### Memory Usage Pattern
- **Base Range**: 20-60% (oscillates with sine wave)
- **Random Variation**: ±15%
- **Work Hour Boost**: +30% during work hours

### Disk Usage Pattern
- **Base Range**: 50-70% (slowly changes)
- **Random Variation**: ±5%
- **Gradual Growth**: Simulates disk filling over time

### Network Usage Pattern
- **Base Range**: 10-40% (random spikes)
- **Random Variation**: ±20%
- **Work Hour Boost**: +20% during work hours

## ⏰ Timing Configuration

### Main Monitoring Loop
- **System Performance Check**: Every 10 seconds
- **Performance Tracking**: Every 30 seconds
- **Health Checks**: Every 2 minutes (120 seconds)

### Alert Cooldowns
- **Same Alert Type**: 5 minutes (300000 ms)
- **Prevents Spam**: Only one alert per type per cooldown period

### Maintenance Reminders
- **Check Frequency**: Every hour
- **Advance Notice**: 24-48 hours before maintenance
- **Maintenance Schedule**: Sundays at 2:00 AM

## 🎛️ Customization Options

### To Modify Thresholds:
Edit the `thresholds` object in `notification-triggers.js`:
```javascript
this.thresholds = {
    cpu: 75,        // Change CPU warning threshold
    memory: 80,     // Change memory warning threshold
    disk: 85,       // Change disk warning threshold
    network: 90,    // Change network warning threshold
    batteryLow: 20  // Change battery warning threshold
};
```

### To Modify Check Intervals:
Edit the intervals in `auto-notifications.js`:
```javascript
// System monitoring every 10 seconds
setInterval(() => this.checkSystemPerformance(), 10000);

// Health checks every 2 minutes
setInterval(() => this.runHealthChecks(), 120000);
```

### To Modify Alert Cooldowns:
Edit the cooldown period:
```javascript
this.alertCooldown = 5 * 60 * 1000; // 5 minutes in milliseconds
```

## 🔧 Current Active Monitoring

When the system is running, it actively monitors:
1. **CPU, Memory, Disk, Network usage** - Every 10 seconds
2. **Browser memory usage** - Every 60 seconds
3. **Storage quota** - Every 60 seconds
4. **System health checks** - Every 2 minutes
5. **Scheduled events** - Based on their individual intervals
6. **Battery level** - Real-time (if supported)
7. **Network quality** - Real-time (if supported)

All notifications are automatically created in Firestore and appear in the dashboard with real-time updates.

## 🌐 API Monitoring Detailed Parameters

### API Service Unavailable Alerts
- **Trigger Condition**: When `/api/health` endpoint returns:
  - HTTP error status (4xx, 5xx)
  - Network timeout (>10 seconds)
  - Connection refused
  - No response received
- **Alert Details**:
  - **Type**: Error notification
  - **Title**: "API Service Unavailable"
  - **Message**: "API health check failed. Service may be down."
  - **Priority**: Critical
  - **Category**: System

### API Performance (Slow Response) Alerts
- **Trigger Condition**: When API responds but takes longer than threshold
- **Slow Response Threshold**: 3000 milliseconds (3 seconds)
- **Alert Details**:
  - **Type**: Warning notification
  - **Title**: "API Performance Issue"
  - **Message**: "API response time is {X}ms. Service may be slow."
  - **Priority**: Medium
  - **Category**: System

### API Monitoring Configuration
```javascript
// In system-health.js - checkAPIHealth() method
const API_CONFIG = {
    endpoint: '/api/health',           // API endpoint to monitor
    timeout: 10000,                   // 10 seconds timeout
    slowResponseThreshold: 3000,      // 3 seconds = slow
    checkInterval: 60000,             // Check every 1 minute
    method: 'GET'                     // HTTP method
};
```

### Customizing API Monitoring

#### To Change API Endpoint:
Edit line 112 in `system-health.js`:
```javascript
const response = await fetch('/your-api-endpoint', {
    method: 'GET',
    timeout: 10000
});
```

#### To Change Slow Response Threshold:
Edit line 128 in `system-health.js`:
```javascript
} else if (responseTime > 5000) {  // Change from 3000 to 5000ms
```

#### To Change Check Interval:
Edit line 11 in `system-health.js`:
```javascript
this.checkInterval = 30000; // Change from 60000 to 30000 (30 seconds)
```

#### To Change Timeout:
Edit line 114 in `system-health.js`:
```javascript
timeout: 15000  // Change from 10000 to 15000 (15 seconds)
```

### API Health Status Levels
1. **Healthy**: Response received within 3 seconds, HTTP 200 OK
2. **Warning**: Response received but took >3 seconds
3. **Error**: No response, timeout, or HTTP error status

### Real-World API Monitoring
To monitor your actual API endpoints:
1. Replace `/api/health` with your real API endpoint
2. Add authentication headers if needed:
```javascript
const response = await fetch('/api/health', {
    method: 'GET',
    headers: {
        'Authorization': 'Bearer your-token',
        'Content-Type': 'application/json'
    },
    timeout: 10000
});
```
3. Customize response validation based on your API structure
