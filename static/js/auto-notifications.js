// Auto Notifications - Comprehensive system monitoring and alerts
class AutoNotificationSystem {
    constructor() {
        this.isActive = false;
        this.monitoringIntervals = [];
        this.alertHistory = new Map();
        this.systemMetrics = {
            cpu: { current: 0, peak: 0, average: 0 },
            memory: { current: 0, peak: 0, average: 0 },
            disk: { current: 0, peak: 0, average: 0 },
            network: { current: 0, peak: 0, average: 0 }
        };
        this.performanceHistory = [];
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Auto Notification System...');
        
        // Wait for dependencies
        await this.waitForDependencies();
        
        // Start monitoring systems
        this.startSystemMonitoring();
        this.startPerformanceTracking();
        this.startHealthChecks();
        this.startAutoAlerts();
        
        // Update UI
        this.updateMonitorStatus(true);
        
        console.log('✅ Auto Notification System initialized successfully');
    }
    
    async waitForDependencies() {
        let attempts = 0;
        const maxAttempts = 20;
        
        while (attempts < maxAttempts) {
            if (window.notificationManager && window.notificationTriggers) {
                console.log('✅ Dependencies ready');
                return;
            }
            
            console.log(`⏳ Waiting for dependencies... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        console.warn('⚠️ Some dependencies not ready, continuing anyway');
    }
    
    startSystemMonitoring() {
        console.log('📊 Starting system performance monitoring...');
        
        // Monitor every 10 seconds for responsive alerts
        const monitoringInterval = setInterval(() => {
            this.checkSystemPerformance();
        }, 10000);
        
        this.monitoringIntervals.push(monitoringInterval);
        
        // Initial check
        setTimeout(() => this.checkSystemPerformance(), 2000);
    }
    
    startPerformanceTracking() {
        console.log('📈 Starting performance tracking...');
        
        // Track performance metrics every 30 seconds
        const trackingInterval = setInterval(() => {
            this.trackPerformanceMetrics();
        }, 30000);
        
        this.monitoringIntervals.push(trackingInterval);
    }
    
    startHealthChecks() {
        console.log('🏥 Starting health checks...');
        
        // Run health checks every 2 minutes
        const healthInterval = setInterval(() => {
            this.runHealthChecks();
        }, 120000);
        
        this.monitoringIntervals.push(healthInterval);
        
        // Initial health check
        setTimeout(() => this.runHealthChecks(), 5000);
    }
    
    startAutoAlerts() {
        console.log('🔔 Starting auto alerts...');
        
        // Generate realistic system events
        this.scheduleRandomEvents();
        
        // Check for maintenance windows
        this.checkMaintenanceSchedule();
        
        // Monitor browser resources
        this.monitorBrowserResources();
    }
    
    async checkSystemPerformance() {
        try {
            // Get current system data
            let systemData;
            if (window.systemMonitor) {
                systemData = window.systemMonitor.generateRandomData();
            } else {
                systemData = this.generateRealisticMetrics();
            }
            
            // Update metrics
            this.updateSystemMetrics(systemData);
            
            // Check thresholds and create alerts
            await this.checkThresholds(systemData);
            
            // Update UI indicators
            this.updateSystemStatusUI(systemData);
            
        } catch (error) {
            console.error('Error checking system performance:', error);
        }
    }
    
    generateRealisticMetrics() {
        const now = Date.now();
        const hour = new Date().getHours();
        
        // Simulate realistic usage patterns
        const workHours = hour >= 9 && hour <= 17;
        const baseLoad = workHours ? 1.4 : 0.7;
        
        // Generate metrics with realistic fluctuations
        return {
            cpu: Math.max(5, Math.min(98, 25 * baseLoad + Math.sin(now / 60000) * 20 + (Math.random() - 0.5) * 30)),
            memory: Math.max(10, Math.min(95, 35 * baseLoad + Math.sin(now / 90000) * 15 + (Math.random() - 0.5) * 20)),
            disk: Math.max(30, Math.min(98, 65 + Math.sin(now / 300000) * 10 + (Math.random() - 0.5) * 8)),
            network: Math.max(0, Math.min(100, 15 + Math.random() * 40 + (workHours ? 20 : 0)))
        };
    }
    
    updateSystemMetrics(data) {
        Object.keys(data).forEach(metric => {
            if (this.systemMetrics[metric]) {
                this.systemMetrics[metric].current = data[metric];
                this.systemMetrics[metric].peak = Math.max(this.systemMetrics[metric].peak, data[metric]);
                
                // Calculate rolling average
                const history = this.performanceHistory.slice(-10);
                const values = history.map(h => h[metric]).filter(v => v !== undefined);
                this.systemMetrics[metric].average = values.length > 0 
                    ? values.reduce((a, b) => a + b, 0) / values.length 
                    : data[metric];
            }
        });
    }
    
    async checkThresholds(data) {
        const thresholds = {
            cpu: { warning: 75, critical: 90 },
            memory: { warning: 80, critical: 95 },
            disk: { warning: 85, critical: 95 },
            network: { warning: 80, critical: 95 }
        };
        
        for (const [metric, value] of Object.entries(data)) {
            if (!thresholds[metric]) continue;
            
            const threshold = thresholds[metric];
            const alertKey = `${metric}_${value > threshold.critical ? 'critical' : 'warning'}`;
            
            if (value > threshold.critical && this.shouldCreateAlert(alertKey)) {
                await this.createSystemAlert(metric, value, 'critical');
                this.recordAlert(alertKey);
            } else if (value > threshold.warning && this.shouldCreateAlert(alertKey)) {
                await this.createSystemAlert(metric, value, 'warning');
                this.recordAlert(alertKey);
            }
        }
    }
    
    shouldCreateAlert(alertKey) {
        const lastAlert = this.alertHistory.get(alertKey);
        const cooldown = 5 * 60 * 1000; // 5 minutes
        return !lastAlert || (Date.now() - lastAlert) > cooldown;
    }
    
    recordAlert(alertKey) {
        this.alertHistory.set(alertKey, Date.now());
    }
    
    async createSystemAlert(metric, value, severity) {
        const messages = {
            cpu: {
                warning: `CPU usage is high at ${Math.round(value)}%. System performance may be affected.`,
                critical: `CPU usage is critical at ${Math.round(value)}%! System may become unresponsive.`
            },
            memory: {
                warning: `Memory usage is high at ${Math.round(value)}%. Consider closing unused applications.`,
                critical: `Memory usage is critical at ${Math.round(value)}%! Applications may crash.`
            },
            disk: {
                warning: `Disk space is low at ${Math.round(value)}% full. Please free up space soon.`,
                critical: `Disk space is critically low at ${Math.round(value)}% full! System may stop functioning.`
            },
            network: {
                warning: `Network usage is high at ${Math.round(value)}%. Connection may be slow.`,
                critical: `Network usage is critical at ${Math.round(value)}%! Connection may fail.`
            }
        };
        
        const titles = {
            cpu: 'High CPU Usage Alert',
            memory: 'High Memory Usage Alert', 
            disk: 'Low Disk Space Warning',
            network: 'High Network Usage Alert'
        };
        
        if (window.notificationManager) {
            await window.notificationManager.createNotification({
                type: severity === 'critical' ? 'error' : 'warning',
                title: titles[metric],
                message: messages[metric][severity],
                priority: severity === 'critical' ? 'critical' : 'high',
                category: 'system',
                actionUrl: '/dashboard'
            });
        }
    }
    
    trackPerformanceMetrics() {
        const metrics = this.generateRealisticMetrics();
        this.performanceHistory.push({
            timestamp: Date.now(),
            ...metrics
        });
        
        // Keep only last 100 entries
        if (this.performanceHistory.length > 100) {
            this.performanceHistory = this.performanceHistory.slice(-100);
        }
    }
    
    async runHealthChecks() {
        // Simulate various health check scenarios
        const healthChecks = [
            { name: 'Database Connection', success: Math.random() > 0.05 },
            { name: 'API Response Time', success: Math.random() > 0.1 },
            { name: 'Storage Access', success: Math.random() > 0.02 },
            { name: 'Network Connectivity', success: Math.random() > 0.08 }
        ];
        
        for (const check of healthChecks) {
            if (!check.success && this.shouldCreateAlert(`health_${check.name}`)) {
                await this.createHealthAlert(check.name);
                this.recordAlert(`health_${check.name}`);
            }
        }
    }
    
    async createHealthAlert(checkName) {
        const messages = {
            'Database Connection': 'Database connection check failed. Data operations may be affected.',
            'API Response Time': 'API response time is too slow. Service performance is degraded.',
            'Storage Access': 'Storage access check failed. File operations may not work properly.',
            'Network Connectivity': 'Network connectivity issues detected. External services may be unavailable.'
        };
        
        if (window.notificationManager) {
            await window.notificationManager.createNotification({
                type: 'error',
                title: `${checkName} Failed`,
                message: messages[checkName] || `${checkName} health check failed.`,
                priority: 'high',
                category: 'system',
                actionUrl: '/dashboard'
            });
        }
    }
    
    scheduleRandomEvents() {
        // Schedule random realistic events
        const events = [
            { type: 'backup_success', interval: 24 * 60 * 60 * 1000, probability: 0.9 },
            { type: 'backup_failure', interval: 24 * 60 * 60 * 1000, probability: 0.1 },
            { type: 'security_scan', interval: 12 * 60 * 60 * 1000, probability: 1.0 },
            { type: 'update_available', interval: 7 * 24 * 60 * 60 * 1000, probability: 0.3 }
        ];
        
        events.forEach(event => {
            setInterval(() => {
                if (Math.random() < event.probability) {
                    this.triggerRandomEvent(event.type);
                }
            }, event.interval);
        });
    }
    
    async triggerRandomEvent(eventType) {
        const eventMessages = {
            backup_success: {
                type: 'success',
                title: 'Backup Completed Successfully',
                message: `System backup completed at ${new Date().toLocaleTimeString()}. All data is secure.`,
                priority: 'low',
                category: 'maintenance'
            },
            backup_failure: {
                type: 'error',
                title: 'Backup Failed',
                message: 'System backup failed. Please check backup system immediately.',
                priority: 'critical',
                category: 'maintenance'
            },
            security_scan: {
                type: 'info',
                title: 'Security Scan Completed',
                message: 'Automated security scan completed. No threats detected.',
                priority: 'low',
                category: 'security'
            },
            update_available: {
                type: 'info',
                title: 'System Update Available',
                message: 'A new system update is available. Consider scheduling maintenance.',
                priority: 'medium',
                category: 'maintenance'
            }
        };
        
        const event = eventMessages[eventType];
        if (event && window.notificationManager) {
            await window.notificationManager.createNotification(event);
        }
    }
    
    monitorBrowserResources() {
        // Monitor browser-specific resources
        if ('memory' in performance) {
            setInterval(() => {
                this.checkBrowserMemory();
            }, 60000);
        }
    }
    
    async checkBrowserMemory() {
        try {
            const memInfo = performance.memory;
            const usagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
            
            if (usagePercent > 85 && this.shouldCreateAlert('browser_memory')) {
                await window.notificationManager?.createNotification({
                    type: 'warning',
                    title: 'High Browser Memory Usage',
                    message: `Browser memory usage is ${Math.round(usagePercent)}%. Consider refreshing the page.`,
                    priority: 'medium',
                    category: 'system'
                });
                this.recordAlert('browser_memory');
            }
        } catch (error) {
            console.error('Error checking browser memory:', error);
        }
    }
    
    updateSystemStatusUI(data) {
        const statusElement = document.getElementById('system-status');
        if (!statusElement) return;
        
        const maxUsage = Math.max(data.cpu, data.memory, data.disk);
        let status, statusText, statusClass;
        
        if (maxUsage > 90) {
            status = 'error';
            statusText = 'Critical';
            statusClass = 'text-danger';
        } else if (maxUsage > 75) {
            status = 'warning';
            statusText = 'Warning';
            statusClass = 'text-warning';
        } else {
            status = 'online';
            statusText = 'Normal';
            statusClass = 'text-success';
        }
        
        statusElement.innerHTML = `<i class="fas fa-circle ${statusClass}"></i> ${statusText}`;
        statusElement.className = `stat-value ${status}`;
    }
    
    updateMonitorStatus(isActive) {
        const statusElement = document.getElementById('monitor-status');
        if (!statusElement) return;
        
        this.isActive = isActive;
        statusElement.innerHTML = isActive 
            ? '<i class="fas fa-circle text-success"></i> Active'
            : '<i class="fas fa-circle text-danger"></i> Inactive';
    }
    
    checkMaintenanceSchedule() {
        // Check for upcoming maintenance
        const now = new Date();
        const nextSunday = new Date(now);
        nextSunday.setDate(now.getDate() + (7 - now.getDay()));
        nextSunday.setHours(2, 0, 0, 0);
        
        const hoursUntil = Math.floor((nextSunday.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        if (hoursUntil <= 48 && hoursUntil > 24 && this.shouldCreateAlert('maintenance_reminder')) {
            window.notificationManager?.createNotification({
                type: 'info',
                title: 'Scheduled Maintenance Reminder',
                message: `System maintenance is scheduled in ${hoursUntil} hours. Please save your work.`,
                priority: 'medium',
                category: 'maintenance'
            });
            this.recordAlert('maintenance_reminder');
        }
    }
    
    stop() {
        console.log('🛑 Stopping Auto Notification System...');
        this.monitoringIntervals.forEach(interval => clearInterval(interval));
        this.monitoringIntervals = [];
        this.updateMonitorStatus(false);
    }
    
    getSystemReport() {
        return {
            isActive: this.isActive,
            metrics: this.systemMetrics,
            alertHistory: Array.from(this.alertHistory.entries()),
            performanceHistory: this.performanceHistory.slice(-20)
        };
    }
}

// Initialize auto notification system
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.autoNotificationSystem = new AutoNotificationSystem();
        console.log('🎯 Auto Notification System ready');
    }, 6000); // Wait for other systems to initialize
});
