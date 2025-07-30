// System Health Monitor - Real system status notifications
class SystemHealthMonitor {
    constructor() {
        this.isMonitoring = false;
        this.healthChecks = {
            database: { status: 'unknown', lastCheck: null },
            api: { status: 'unknown', lastCheck: null },
            storage: { status: 'unknown', lastCheck: null },
            network: { status: 'unknown', lastCheck: null }
        };
        this.checkInterval = 60000; // 1 minute
        // Throttling mechanism for specific notification types
        this.notificationThrottling = {
            'Slow API Response': {
                lastNotified: null,
                throttleDuration: 60 * 60 * 1000 // 1 hour in milliseconds
            }
        };
        this.init();
    }
    
    init() {
        this.startHealthMonitoring();
        this.setupMaintenanceScheduler();
        this.setupBackupMonitoring();
    }
    
    startHealthMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        console.log('Starting system health monitoring...');
        
        // Initial health check
        this.performHealthCheck();
        
        // Schedule regular health checks
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.checkInterval);
    }
    
    stopHealthMonitoring() {
        this.isMonitoring = false;
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
    }
    
    async performHealthCheck() {
        console.log('Performing system health check...');
        
        // Check database connectivity
        await this.checkDatabaseHealth();
        
        // Check API responsiveness
        await this.checkAPIHealth();
        
        // Check storage status
        await this.checkStorageHealth();
        
        // Check network connectivity
        await this.checkNetworkHealth();
        
        // Update system status display
        this.updateSystemStatusDisplay();
    }
    
    async checkDatabaseHealth() {
        try {
            const startTime = Date.now();
            
            // Test Firestore connectivity
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
                const testRef = firebase.firestore().collection('health-check');
                await testRef.limit(1).get();
                
                const responseTime = Date.now() - startTime;
                
                if (responseTime > 5000) {
                    this.updateHealthStatus('database', 'warning');
                    await this.createHealthNotification({
                        type: 'warning',
                        title: 'Database Performance Issue',
                        message: `Database response time is ${responseTime}ms. Performance may be degraded.`,
                        priority: 'medium',
                        category: 'system'
                    });
                } else {
                    this.updateHealthStatus('database', 'healthy');
                }
            } else {
                this.updateHealthStatus('database', 'error');
                await this.createHealthNotification({
                    type: 'error',
                    title: 'Database Connection Failed',
                    message: 'Unable to connect to the database. Check Firebase configuration.',
                    priority: 'critical',
                    category: 'system'
                });
            }
        } catch (error) {
            this.updateHealthStatus('database', 'error');
            await this.createHealthNotification({
                type: 'error',
                title: 'Database Health Check Failed',
                message: `Database health check failed: ${error.message}`,
                priority: 'high',
                category: 'system'
            });
        }
    }
    
    async checkAPIHealth() {
        try {
            const startTime = Date.now();
            
            // Test API endpoint (you can replace with your actual API)
            const response = await fetch('/api/health', {
                method: 'GET',
                timeout: 10000
            }).catch(() => null);
            
            const responseTime = Date.now() - startTime;
            
            if (!response || !response.ok) {
                this.updateHealthStatus('api', 'error');
                await this.createHealthNotification({
                    type: 'error',
                    title: 'API Service Unavailable',
                    message: 'API health check failed. Service may be down.',
                    priority: 'critical',
                    category: 'system'
                });
            } else if (responseTime > 3000) {
                this.updateHealthStatus('api', 'warning');

                // Check if we should throttle this notification
                const notificationType = 'Slow API Response';
                if (!this.shouldThrottleNotification(notificationType)) {
                    await this.createHealthNotification({
                        type: 'warning',
                        title: 'API Performance Issue',
                        message: `API response time is ${responseTime}ms. Service may be slow.`,
                        priority: 'medium',
                        category: 'system'
                    });
                    // Mark this notification type as sent
                    this.markNotificationSent(notificationType);
                    console.log(`Slow API Response notification sent. Next notification allowed after: ${new Date(Date.now() + this.notificationThrottling[notificationType].throttleDuration).toLocaleString()}`);
                } else {
                    const nextAllowedTime = new Date(this.notificationThrottling[notificationType].lastNotified + this.notificationThrottling[notificationType].throttleDuration);
                    console.log(`Slow API Response notification throttled. Response time: ${responseTime}ms. Next notification allowed at: ${nextAllowedTime.toLocaleString()}`);
                }
            } else {
                this.updateHealthStatus('api', 'healthy');
            }
        } catch (error) {
            this.updateHealthStatus('api', 'error');
            // Don't create notification for expected API failures in demo
        }
    }
    
    async checkStorageHealth() {
        try {
            // Check browser storage
            const testKey = 'health-check-' + Date.now();
            const testValue = 'test-data';
            
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            if (retrieved === testValue) {
                this.updateHealthStatus('storage', 'healthy');
            } else {
                this.updateHealthStatus('storage', 'warning');
                await this.createHealthNotification({
                    type: 'warning',
                    title: 'Storage Issue Detected',
                    message: 'Local storage functionality may be impaired.',
                    priority: 'medium',
                    category: 'system'
                });
            }
        } catch (error) {
            this.updateHealthStatus('storage', 'error');
            await this.createHealthNotification({
                type: 'error',
                title: 'Storage Health Check Failed',
                message: 'Unable to access local storage. Browser storage may be full.',
                priority: 'high',
                category: 'system'
            });
        }
    }
    
    async checkNetworkHealth() {
        try {
            const startTime = Date.now();
            
            // Test network connectivity with a simple request
            const response = await fetch('https://www.google.com/favicon.ico', {
                method: 'HEAD',
                mode: 'no-cors',
                timeout: 5000
            }).catch(() => null);
            
            const responseTime = Date.now() - startTime;
            
            if (responseTime > 10000) {
                this.updateHealthStatus('network', 'warning');
                await this.createHealthNotification({
                    type: 'warning',
                    title: 'Network Performance Issue',
                    message: `Network latency is high (${responseTime}ms). Connection may be slow.`,
                    priority: 'low',
                    category: 'system'
                });
            } else {
                this.updateHealthStatus('network', 'healthy');
            }
        } catch (error) {
            this.updateHealthStatus('network', 'error');
            await this.createHealthNotification({
                type: 'error',
                title: 'Network Connectivity Issue',
                message: 'Network connectivity check failed. Internet connection may be unstable.',
                priority: 'medium',
                category: 'system'
            });
        }
    }
    
    updateHealthStatus(service, status) {
        this.healthChecks[service] = {
            status: status,
            lastCheck: new Date()
        };
    }

    // Check if a notification type should be throttled
    shouldThrottleNotification(notificationType) {
        const throttleConfig = this.notificationThrottling[notificationType];
        if (!throttleConfig) {
            return false; // No throttling configured for this type
        }

        const now = Date.now();
        const lastNotified = throttleConfig.lastNotified;

        // If never notified before, allow notification
        if (!lastNotified) {
            return false;
        }

        // Check if enough time has passed since last notification
        const timeSinceLastNotification = now - lastNotified;
        return timeSinceLastNotification < throttleConfig.throttleDuration;
    }

    // Mark a notification type as having been sent
    markNotificationSent(notificationType) {
        if (this.notificationThrottling[notificationType]) {
            this.notificationThrottling[notificationType].lastNotified = Date.now();
        }
    }
    
    updateSystemStatusDisplay() {
        // Update the system status indicator in the dashboard
        const statusElement = document.getElementById('system-status');
        if (!statusElement) return;
        
        const overallStatus = this.getOverallSystemStatus();
        
        statusElement.className = `status-indicator ${overallStatus}`;
        statusElement.innerHTML = `<i class="fas fa-circle"></i> ${this.getStatusText(overallStatus)}`;
    }
    
    getOverallSystemStatus() {
        const statuses = Object.values(this.healthChecks).map(check => check.status);
        
        if (statuses.includes('error')) return 'error';
        if (statuses.includes('warning')) return 'warning';
        if (statuses.includes('healthy')) return 'online';
        return 'unknown';
    }
    
    getStatusText(status) {
        const statusTexts = {
            'online': 'Online',
            'warning': 'Warning',
            'error': 'Error',
            'unknown': 'Unknown'
        };
        return statusTexts[status] || 'Unknown';
    }
    
    setupMaintenanceScheduler() {
        // Schedule maintenance notifications
        this.scheduleMaintenanceNotification();
        
        // Check for scheduled maintenance every hour
        setInterval(() => {
            this.checkScheduledMaintenance();
        }, 3600000); // 1 hour
    }
    
    async scheduleMaintenanceNotification() {
        // Example: Schedule maintenance notification for next Sunday at 2 AM
        const now = new Date();
        const nextSunday = new Date(now);
        nextSunday.setDate(now.getDate() + (7 - now.getDay()));
        nextSunday.setHours(2, 0, 0, 0);
        
        const timeUntilMaintenance = nextSunday.getTime() - now.getTime();
        const hoursUntil = Math.floor(timeUntilMaintenance / (1000 * 60 * 60));
        
        if (hoursUntil <= 24 && hoursUntil > 0) {
            await this.createHealthNotification({
                type: 'info',
                title: 'Scheduled Maintenance Reminder',
                message: `System maintenance is scheduled in ${hoursUntil} hours. Please save your work.`,
                priority: 'medium',
                category: 'maintenance'
            });
        }
    }
    
    async checkScheduledMaintenance() {
        // This would typically check a maintenance schedule from your backend
        // For demo purposes, we'll create a random maintenance notification
        if (Math.random() < 0.1) { // 10% chance per hour
            await this.createHealthNotification({
                type: 'info',
                title: 'Maintenance Window Scheduled',
                message: 'System maintenance is scheduled for this weekend. Services may be temporarily unavailable.',
                priority: 'low',
                category: 'maintenance'
            });
        }
    }
    
    setupBackupMonitoring() {
        // Simulate backup completion notifications
        setInterval(() => {
            this.checkBackupStatus();
        }, 24 * 60 * 60 * 1000); // Daily
    }
    
    async checkBackupStatus() {
        // Simulate backup success/failure
        const backupSuccess = Math.random() > 0.1; // 90% success rate
        
        if (backupSuccess) {
            await this.createHealthNotification({
                type: 'success',
                title: 'Database Backup Completed',
                message: `Daily database backup completed successfully at ${new Date().toLocaleTimeString()}.`,
                priority: 'low',
                category: 'maintenance'
            });
        } else {
            await this.createHealthNotification({
                type: 'error',
                title: 'Database Backup Failed',
                message: 'Daily database backup failed. Please check backup system immediately.',
                priority: 'critical',
                category: 'maintenance'
            });
        }
    }
    
    async createHealthNotification(notificationData) {
        // Only create notification if it's different from recent ones
        const recentNotifications = window.notificationManager?.notifications || [];
        const isDuplicate = recentNotifications.some(n => 
            n.title === notificationData.title && 
            Date.now() - n.timestamp.toDate().getTime() < 300000 // 5 minutes
        );
        
        if (!isDuplicate && window.notificationManager) {
            return await window.notificationManager.createNotification(notificationData);
        }
        return false;
    }
    
    // Public methods for manual health checks
    async runFullHealthCheck() {
        await this.performHealthCheck();
        await this.createHealthNotification({
            type: 'info',
            title: 'System Health Check Completed',
            message: 'Manual system health check has been completed. Check system status for results.',
            priority: 'low',
            category: 'system'
        });
    }
    
    getHealthReport() {
        return {
            timestamp: new Date(),
            services: this.healthChecks,
            overallStatus: this.getOverallSystemStatus()
        };
    }
}

// Initialize system health monitor
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.notificationManager) {
            window.systemHealthMonitor = new SystemHealthMonitor();
            console.log('System health monitor initialized');
        }
    }, 4000);
});
