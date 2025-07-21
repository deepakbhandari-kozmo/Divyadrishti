// Notification Triggers - Connect real events to notifications
class NotificationTriggers {
    constructor() {
        this.systemMonitor = null;
        this.userActivityMonitor = null;
        this.thresholds = {
            cpu: 75,        // Alert at 75% CPU usage
            memory: 80,     // Alert at 80% memory usage
            disk: 85,       // Alert at 85% disk usage
            network: 90,    // Alert at 90% network usage
            failedLogins: 3,
            inactiveTime: 30 * 60 * 1000, // 30 minutes
            temperature: 80, // Alert at 80°C
            batteryLow: 20   // Alert at 20% battery
        };
        this.lastAlerts = {};
        this.alertCooldown = 5 * 60 * 1000; // 5 minutes cooldown between same alerts
        this.systemStats = {
            cpu: 0,
            memory: 0,
            disk: 0,
            network: 0,
            temperature: 0,
            battery: 100
        };
        this.init();
    }
    
    init() {
        this.setupSystemMonitoring();
        this.setupUserActivityMonitoring();
        this.setupPerformanceMonitoring();
        this.setupSecurityMonitoring();
    }
    
    // System Performance Monitoring
    setupSystemMonitoring() {
        console.log('Setting up system performance monitoring...');

        // Monitor system performance every 15 seconds for more responsive alerts
        this.monitoringInterval = setInterval(() => {
            this.checkSystemPerformance();
        }, 15000);

        // Also monitor real browser/system APIs if available
        this.setupBrowserSystemMonitoring();

        // Initial check
        setTimeout(() => {
            this.checkSystemPerformance();
        }, 2000);
    }

    setupBrowserSystemMonitoring() {
        // Monitor memory usage using Performance API
        if ('memory' in performance) {
            setInterval(() => {
                this.checkBrowserMemory();
            }, 30000);
        }

        // Monitor network connection
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                this.checkNetworkConnection();
            });
        }

        // Monitor battery if available
        if ('getBattery' in navigator) {
            navigator.getBattery().then((battery) => {
                this.monitorBattery(battery);
            });
        }

        // Monitor storage quota
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            setInterval(() => {
                this.checkStorageQuota();
            }, 60000); // Check every minute
        }
    }
    
    async checkSystemPerformance() {
        try {
            // Get current performance data from system monitor
            let data = { cpu: 0, memory: 0, disk: 0, network: 0 };

            if (window.systemMonitor) {
                data = window.systemMonitor.generateRandomData();
            } else {
                // Generate more realistic fluctuating data
                data = this.generateRealisticSystemData();
            }

            // Update internal stats
            this.systemStats = { ...this.systemStats, ...data };

            // Check CPU usage with cooldown
            if (data.cpu > this.thresholds.cpu && this.shouldAlert('cpu')) {
                await this.createNotification({
                    type: data.cpu > 90 ? 'error' : 'warning',
                    title: 'High CPU Usage Alert',
                    message: `CPU usage has reached ${Math.round(data.cpu)}%. ${data.cpu > 90 ? 'Critical level - system may become unresponsive.' : 'Consider checking running processes.'}`,
                    priority: data.cpu > 90 ? 'critical' : 'high',
                    category: 'system',
                    actionUrl: '/dashboard'
                });
                this.setAlertCooldown('cpu');
            }

            // Check Memory usage with cooldown
            if (data.memory > this.thresholds.memory && this.shouldAlert('memory')) {
                await this.createNotification({
                    type: data.memory > 95 ? 'error' : 'warning',
                    title: 'High Memory Usage Alert',
                    message: `Memory usage has reached ${Math.round(data.memory)}%. ${data.memory > 95 ? 'Critical level - applications may crash.' : 'System performance may be affected.'}`,
                    priority: data.memory > 95 ? 'critical' : 'high',
                    category: 'system',
                    actionUrl: '/dashboard'
                });
                this.setAlertCooldown('memory');
            }

            // Check Disk usage with cooldown
            if (data.disk > this.thresholds.disk && this.shouldAlert('disk')) {
                await this.createNotification({
                    type: 'error',
                    title: 'Low Disk Space Warning',
                    message: `Disk usage has reached ${Math.round(data.disk)}%. ${data.disk > 95 ? 'Critical - system may stop functioning.' : 'Please free up space immediately.'}`,
                    priority: data.disk > 95 ? 'critical' : 'high',
                    category: 'system',
                    actionUrl: '/dashboard'
                });
                this.setAlertCooldown('disk');
            }

            // Check Network usage
            if (data.network > this.thresholds.network && this.shouldAlert('network')) {
                await this.createNotification({
                    type: 'warning',
                    title: 'High Network Usage',
                    message: `Network usage has reached ${Math.round(data.network)}%. Connection may be slow.`,
                    priority: 'medium',
                    category: 'system',
                    actionUrl: '/dashboard'
                });
                this.setAlertCooldown('network');
            }

        } catch (error) {
            console.error('Error checking system performance:', error);
        }
    }

    generateRealisticSystemData() {
        // Generate more realistic system data that gradually changes
        const now = Date.now();
        const timeOfDay = new Date().getHours();

        // Simulate higher usage during work hours (9 AM - 6 PM)
        const workHourMultiplier = (timeOfDay >= 9 && timeOfDay <= 18) ? 1.3 : 0.8;

        // Base values with some randomness
        const baseCpu = 20 + Math.sin(now / 60000) * 15; // Oscillates between 5-35%
        const baseMemory = 40 + Math.sin(now / 120000) * 20; // Oscillates between 20-60%
        const baseDisk = 60 + Math.sin(now / 300000) * 10; // Slowly changes between 50-70%
        const baseNetwork = 10 + Math.random() * 30; // Random between 10-40%

        return {
            cpu: Math.max(0, Math.min(100, baseCpu * workHourMultiplier + (Math.random() - 0.5) * 20)),
            memory: Math.max(0, Math.min(100, baseMemory * workHourMultiplier + (Math.random() - 0.5) * 15)),
            disk: Math.max(0, Math.min(100, baseDisk + (Math.random() - 0.5) * 5)),
            network: Math.max(0, Math.min(100, baseNetwork + (Math.random() - 0.5) * 20))
        };
    }

    shouldAlert(alertType) {
        const lastAlert = this.lastAlerts[alertType];
        return !lastAlert || (Date.now() - lastAlert) > this.alertCooldown;
    }

    setAlertCooldown(alertType) {
        this.lastAlerts[alertType] = Date.now();
    }

    // Real browser system monitoring methods
    async checkBrowserMemory() {
        if (!('memory' in performance)) return;

        try {
            const memInfo = performance.memory;
            const usedMB = Math.round(memInfo.usedJSHeapSize / 1048576);
            const totalMB = Math.round(memInfo.totalJSHeapSize / 1048576);
            const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1048576);

            const usagePercent = (usedMB / limitMB) * 100;

            if (usagePercent > 80 && this.shouldAlert('browserMemory')) {
                await this.createNotification({
                    type: 'warning',
                    title: 'High Browser Memory Usage',
                    message: `Browser is using ${usedMB}MB of ${limitMB}MB available (${Math.round(usagePercent)}%). Consider closing unused tabs.`,
                    priority: usagePercent > 90 ? 'high' : 'medium',
                    category: 'system',
                    actionUrl: '/dashboard'
                });
                this.setAlertCooldown('browserMemory');
            }
        } catch (error) {
            console.error('Error checking browser memory:', error);
        }
    }

    async checkNetworkConnection() {
        if (!('connection' in navigator)) return;

        try {
            const connection = navigator.connection;
            const effectiveType = connection.effectiveType;
            const downlink = connection.downlink;

            if (effectiveType === 'slow-2g' || effectiveType === '2g') {
                await this.createNotification({
                    type: 'warning',
                    title: 'Slow Network Connection',
                    message: `Network connection is slow (${effectiveType}). Some features may not work properly.`,
                    priority: 'medium',
                    category: 'system'
                });
            } else if (downlink < 1) {
                await this.createNotification({
                    type: 'warning',
                    title: 'Low Bandwidth Detected',
                    message: `Network bandwidth is low (${downlink} Mbps). Performance may be affected.`,
                    priority: 'medium',
                    category: 'system'
                });
            }
        } catch (error) {
            console.error('Error checking network connection:', error);
        }
    }

    async monitorBattery(battery) {
        const checkBattery = async () => {
            const level = Math.round(battery.level * 100);
            const charging = battery.charging;

            if (level <= this.thresholds.batteryLow && !charging && this.shouldAlert('battery')) {
                await this.createNotification({
                    type: level <= 10 ? 'error' : 'warning',
                    title: 'Low Battery Warning',
                    message: `Battery level is ${level}%. ${level <= 10 ? 'Please charge immediately.' : 'Consider charging soon.'}`,
                    priority: level <= 10 ? 'high' : 'medium',
                    category: 'system'
                });
                this.setAlertCooldown('battery');
            }
        };

        // Check immediately
        await checkBattery();

        // Listen for battery events
        battery.addEventListener('levelchange', checkBattery);
        battery.addEventListener('chargingchange', checkBattery);
    }

    async checkStorageQuota() {
        if (!('storage' in navigator && 'estimate' in navigator.storage)) return;

        try {
            const estimate = await navigator.storage.estimate();
            const usedMB = Math.round(estimate.usage / 1048576);
            const quotaMB = Math.round(estimate.quota / 1048576);
            const usagePercent = (estimate.usage / estimate.quota) * 100;

            if (usagePercent > 80 && this.shouldAlert('storage')) {
                await this.createNotification({
                    type: usagePercent > 95 ? 'error' : 'warning',
                    title: 'Browser Storage Almost Full',
                    message: `Browser storage is ${Math.round(usagePercent)}% full (${usedMB}MB of ${quotaMB}MB). Consider clearing browser data.`,
                    priority: usagePercent > 95 ? 'high' : 'medium',
                    category: 'system'
                });
                this.setAlertCooldown('storage');
            }
        } catch (error) {
            console.error('Error checking storage quota:', error);
        }
    }
    
    // User Activity Monitoring
    setupUserActivityMonitoring() {
        // Monitor user registration attempts
        this.monitorUserRegistrations();
        
        // Monitor login attempts
        this.monitorLoginAttempts();
        
        // Monitor user role changes
        this.monitorRoleChanges();
    }
    
    monitorUserRegistrations() {
        // Listen for new user registrations
        // This would typically be triggered from your registration form
        window.addEventListener('userRegistered', async (event) => {
            const { email, username } = event.detail;
            
            await this.createNotification({
                type: 'info',
                title: 'New User Registration',
                message: `New user "${username}" (${email}) has registered and is pending approval.`,
                priority: 'medium',
                category: 'user',
                actionUrl: '/dashboard'
            });
        });
    }
    
    monitorLoginAttempts() {
        let failedAttempts = 0;
        let lastFailedIP = null;
        
        // Listen for failed login attempts
        window.addEventListener('loginFailed', async (event) => {
            const { email, ip } = event.detail;
            failedAttempts++;
            lastFailedIP = ip;
            
            if (failedAttempts >= this.thresholds.failedLogins) {
                await this.createNotification({
                    type: 'error',
                    title: 'Multiple Failed Login Attempts',
                    message: `${failedAttempts} failed login attempts detected for ${email} from IP ${ip}.`,
                    priority: 'critical',
                    category: 'security',
                    actionUrl: '/dashboard'
                });
                
                failedAttempts = 0; // Reset counter after alert
            }
        });
        
        // Listen for successful logins
        window.addEventListener('loginSuccess', async (event) => {
            const { username, ip } = event.detail;
            failedAttempts = 0; // Reset failed attempts on successful login
            
            // Create notification for admin logins
            if (event.detail.role === 'admin') {
                await this.createNotification({
                    type: 'info',
                    title: 'Admin Login',
                    message: `Administrator "${username}" logged in from IP ${ip}.`,
                    priority: 'medium',
                    category: 'security',
                    actionUrl: '/dashboard'
                });
            }
        });
    }
    
    monitorRoleChanges() {
        // Listen for user role changes
        window.addEventListener('userRoleChanged', async (event) => {
            const { username, oldRole, newRole, changedBy } = event.detail;
            
            await this.createNotification({
                type: 'warning',
                title: 'User Role Changed',
                message: `User "${username}" role changed from ${oldRole} to ${newRole} by ${changedBy}.`,
                priority: newRole === 'admin' ? 'high' : 'medium',
                category: 'user',
                actionUrl: '/dashboard'
            });
        });
    }
    
    // Performance Monitoring
    setupPerformanceMonitoring() {
        // Monitor page load times
        this.monitorPagePerformance();
        
        // Monitor API response times
        this.monitorAPIPerformance();
    }
    
    monitorPagePerformance() {
        // Check page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
                
                if (loadTime > 5000) { // 5 seconds
                    this.createNotification({
                        type: 'warning',
                        title: 'Slow Page Load Detected',
                        message: `Page took ${Math.round(loadTime)}ms to load. Consider optimizing performance.`,
                        priority: 'low',
                        category: 'system',
                        actionUrl: '/dashboard'
                    });
                }
            }, 1000);
        });
    }
    
    monitorAPIPerformance() {
        // Override fetch to monitor API calls
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = Date.now();
            try {
                const response = await originalFetch(...args);
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Alert on slow API calls
                if (duration > 10000) { // 10 seconds
                    await this.createNotification({
                        type: 'warning',
                        title: 'Slow API Response',
                        message: `API call took ${duration}ms to complete. Check server performance.`,
                        priority: 'medium',
                        category: 'system',
                        actionUrl: '/dashboard'
                    });
                }
                
                return response;
            } catch (error) {
                // Alert on API errors
                await this.createNotification({
                    type: 'error',
                    title: 'API Request Failed',
                    message: `API request failed: ${error.message}`,
                    priority: 'high',
                    category: 'system',
                    actionUrl: '/dashboard'
                });
                throw error;
            }
        };
    }
    
    // Security Monitoring
    setupSecurityMonitoring() {
        // Monitor for suspicious activity
        this.monitorSuspiciousActivity();
        
        // Monitor for unauthorized access attempts
        this.monitorUnauthorizedAccess();
    }
    
    monitorSuspiciousActivity() {
        let rapidClicks = 0;
        let lastClickTime = 0;
        
        document.addEventListener('click', () => {
            const now = Date.now();
            if (now - lastClickTime < 100) { // Clicks faster than 100ms
                rapidClicks++;
                if (rapidClicks > 20) {
                    this.createNotification({
                        type: 'warning',
                        title: 'Suspicious Activity Detected',
                        message: 'Rapid clicking detected. Possible automated activity.',
                        priority: 'medium',
                        category: 'security',
                        actionUrl: '/dashboard'
                    });
                    rapidClicks = 0;
                }
            } else {
                rapidClicks = 0;
            }
            lastClickTime = now;
        });
    }
    
    monitorUnauthorizedAccess() {
        // Monitor for access to restricted areas
        window.addEventListener('unauthorizedAccess', async (event) => {
            const { page, user, ip } = event.detail;
            
            await this.createNotification({
                type: 'error',
                title: 'Unauthorized Access Attempt',
                message: `User "${user}" attempted to access restricted page "${page}" from IP ${ip}.`,
                priority: 'critical',
                category: 'security',
                actionUrl: '/dashboard'
            });
        });
    }
    
    // Utility method to create notifications
    async createNotification(notificationData) {
        if (window.notificationManager) {
            return await window.notificationManager.createNotification(notificationData);
        } else {
            console.warn('NotificationManager not available');
            return false;
        }
    }
    
    // Public methods to trigger notifications manually
    async triggerUserRegistration(email, username) {
        window.dispatchEvent(new CustomEvent('userRegistered', {
            detail: { email, username }
        }));
    }
    
    async triggerLoginFailed(email, ip) {
        window.dispatchEvent(new CustomEvent('loginFailed', {
            detail: { email, ip }
        }));
    }
    
    async triggerLoginSuccess(username, role, ip) {
        window.dispatchEvent(new CustomEvent('loginSuccess', {
            detail: { username, role, ip }
        }));
    }
    
    async triggerRoleChange(username, oldRole, newRole, changedBy) {
        window.dispatchEvent(new CustomEvent('userRoleChanged', {
            detail: { username, oldRole, newRole, changedBy }
        }));
    }
    
    async triggerUnauthorizedAccess(page, user, ip) {
        window.dispatchEvent(new CustomEvent('unauthorizedAccess', {
            detail: { page, user, ip }
        }));
    }
}

// Global functions for testing triggers
function showEventTriggersModal() {
    const modal = document.getElementById('event-triggers-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeEventTriggersModal() {
    const modal = document.getElementById('event-triggers-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function runHealthCheck() {
    if (window.systemHealthMonitor) {
        window.systemHealthMonitor.runFullHealthCheck();
        showToast('Running system health check...', 'info');
    }
}

// User Event Triggers
function triggerUserRegistration() {
    if (window.notificationTriggers) {
        const email = 'john.doe@example.com';
        const username = 'john.doe';
        window.notificationTriggers.triggerUserRegistration(email, username);
        showToast('User registration event triggered', 'success');
    }
}

function triggerLoginFailed() {
    if (window.notificationTriggers) {
        const email = 'attacker@malicious.com';
        const ip = '192.168.1.100';
        window.notificationTriggers.triggerLoginFailed(email, ip);
        showToast('Failed login event triggered', 'success');
    }
}

function triggerAdminLogin() {
    if (window.notificationTriggers) {
        const username = 'admin';
        const role = 'admin';
        const ip = '192.168.1.50';
        window.notificationTriggers.triggerLoginSuccess(username, role, ip);
        showToast('Admin login event triggered', 'success');
    }
}

function triggerRoleChange() {
    if (window.notificationTriggers) {
        const username = 'jane.smith';
        const oldRole = 'user';
        const newRole = 'admin';
        const changedBy = 'super.admin';
        window.notificationTriggers.triggerRoleChange(username, oldRole, newRole, changedBy);
        showToast('Role change event triggered', 'success');
    }
}

// Security Event Triggers
function triggerUnauthorizedAccess() {
    if (window.notificationTriggers) {
        const page = '/admin/sensitive-data';
        const user = 'regular.user';
        const ip = '192.168.1.75';
        window.notificationTriggers.triggerUnauthorizedAccess(page, user, ip);
        showToast('Unauthorized access event triggered', 'success');
    }
}

function triggerSuspiciousActivity() {
    if (window.notificationManager) {
        window.notificationManager.createNotification({
            type: 'warning',
            title: 'Suspicious Activity Detected',
            message: 'Multiple rapid requests detected from single IP address. Possible bot activity.',
            priority: 'high',
            category: 'security'
        });
        showToast('Suspicious activity event triggered', 'success');
    }
}

// System Event Triggers
function triggerHighCPU() {
    if (window.notificationManager) {
        window.notificationManager.createNotification({
            type: 'warning',
            title: 'High CPU Usage Alert',
            message: 'CPU usage has exceeded 90% for the past 5 minutes. System performance may be affected.',
            priority: 'high',
            category: 'system',
            actionUrl: '/dashboard'
        });
        showToast('High CPU alert triggered', 'success');
    }
}

function triggerLowDisk() {
    if (window.notificationManager) {
        window.notificationManager.createNotification({
            type: 'error',
            title: 'Critical Disk Space Warning',
            message: 'Disk space is critically low (95% full). Immediate action required to prevent system issues.',
            priority: 'critical',
            category: 'system',
            actionUrl: '/dashboard'
        });
        showToast('Low disk space alert triggered', 'success');
    }
}

function triggerBackupComplete() {
    if (window.notificationManager) {
        window.notificationManager.createNotification({
            type: 'success',
            title: 'Database Backup Completed',
            message: `Scheduled database backup completed successfully at ${new Date().toLocaleTimeString()}.`,
            priority: 'low',
            category: 'maintenance'
        });
        showToast('Backup completion event triggered', 'success');
    }
}

function triggerMaintenanceAlert() {
    if (window.notificationManager) {
        window.notificationManager.createNotification({
            type: 'info',
            title: 'Scheduled Maintenance Notice',
            message: 'System maintenance is scheduled for this weekend from 2:00 AM to 6:00 AM. Please save your work.',
            priority: 'medium',
            category: 'maintenance'
        });
        showToast('Maintenance alert triggered', 'success');
    }
}

// Initialize notification triggers when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for notification manager to be ready
    setTimeout(() => {
        if (window.notificationManager) {
            window.notificationTriggers = new NotificationTriggers();
            console.log('Notification triggers initialized');
        }
    }, 3000);
});
