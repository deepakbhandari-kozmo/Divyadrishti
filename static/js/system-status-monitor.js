// Comprehensive System Status Monitor
class SystemStatusMonitor {
    constructor() {
        this.statusData = {
            overall: 'healthy',
            components: {
                api: { status: 'healthy', responseTime: 0, uptime: 100 },
                database: { status: 'healthy', connections: 0, queryTime: 0 },
                frontend: { status: 'healthy', loadTime: 0, errors: 0 },
                analytics: { status: 'healthy', dataPoints: 0, processing: 0 },
                notifications: { status: 'healthy', queue: 0, delivered: 0 }
            },
            metrics: {
                totalUsers: 0,
                activeUsers: 0,
                totalSessions: 0,
                avgEngagement: 0,
                errorRate: 0,
                performanceScore: 100
            },
            alerts: [],
            lastUpdate: new Date()
        };
        
        this.thresholds = {
            responseTime: { warning: 2000, critical: 5000 },
            errorRate: { warning: 5, critical: 10 },
            engagement: { warning: 40, critical: 20 },
            uptime: { warning: 95, critical: 90 }
        };
        
        this.init();
    }
    
    init() {
        console.log('📊 Initializing System Status Monitor...');
        this.startMonitoring();
        this.setupStatusDisplay();
        this.setupHealthChecks();
    }
    
    startMonitoring() {
        // Monitor system status every 10 seconds
        setInterval(() => {
            this.updateSystemStatus();
        }, 10000);
        
        // Comprehensive health check every minute
        setInterval(() => {
            this.performHealthCheck();
        }, 60000);
        
        // Initial status update
        this.updateSystemStatus();
    }
    
    async updateSystemStatus() {
        try {
            // Gather data from all monitoring systems
            await this.gatherAPIMetrics();
            await this.gatherAnalyticsMetrics();
            await this.gatherPerformanceMetrics();
            await this.gatherUserMetrics();
            
            // Calculate overall health
            this.calculateOverallHealth();
            
            // Update displays
            this.updateStatusDisplays();
            
            // Check for alerts
            this.checkAlertConditions();
            
            this.statusData.lastUpdate = new Date();
            
        } catch (error) {
            console.warn('❌ Error updating system status:', error.message);
            this.handleMonitoringError(error);
        }
    }
    
    async gatherAPIMetrics() {
        try {
            // Test API health endpoint
            const startTime = performance.now();
            const response = await fetch('/api/health', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const endTime = performance.now();

            const responseTime = endTime - startTime;
            const isHealthy = response.ok;

            this.statusData.components.api = {
                status: this.getHealthStatus(isHealthy, responseTime, this.thresholds.responseTime),
                responseTime: Math.round(responseTime),
                uptime: isHealthy ? 100 : 0,
                lastCheck: new Date()
            };

        } catch (error) {
            console.warn('⚠️ API health check failed:', error.message);
            this.statusData.components.api = {
                status: 'critical',
                responseTime: 0,
                uptime: 0,
                error: error.message,
                lastCheck: new Date()
            };
        }
    }
    
    async gatherAnalyticsMetrics() {
        if (window.realAnalyticsProcessor) {
            const stats = window.realAnalyticsProcessor.getRealTimeStats();
            
            this.statusData.components.analytics = {
                status: 'healthy',
                dataPoints: stats.totalPageViews || 0,
                processing: stats.activeUsers || 0,
                lastUpdate: new Date()
            };
            
            // Update user metrics
            this.statusData.metrics.totalUsers = stats.uniqueUsers || 0;
            this.statusData.metrics.activeUsers = stats.activeUsers || 0;
            this.statusData.metrics.avgEngagement = stats.engagementMetrics?.avgEngagementScore || 0;
            this.statusData.metrics.errorRate = stats.errorStats?.errorRate || 0;
        }
    }
    
    async gatherPerformanceMetrics() {
        if (window.performanceMonitor) {
            const apiStats = window.performanceMonitor.getAPIPerformanceStats();
            const errorStats = window.performanceMonitor.getErrorStats();
            const memoryStats = window.performanceMonitor.getMemoryStats();
            
            // Frontend performance
            this.statusData.components.frontend = {
                status: this.getPerformanceStatus(apiStats, errorStats),
                loadTime: apiStats?.avgResponseTime || 0,
                errors: errorStats?.totalErrors || 0,
                memory: memoryStats?.currentUsage || 0
            };
            
            // Calculate performance score
            this.statusData.metrics.performanceScore = this.calculatePerformanceScore(apiStats, errorStats, memoryStats);
        }
    }
    
    async gatherUserMetrics() {
        if (window.interactionTracker) {
            const interactionStats = window.interactionTracker.getInteractionStats();
            
            this.statusData.metrics.totalSessions = 1; // Simplified
            this.statusData.metrics.avgEngagement = interactionStats.engagementScore || 0;
        }
    }
    
    getHealthStatus(isHealthy, value, thresholds) {
        if (!isHealthy || value > thresholds.critical) return 'critical';
        if (value > thresholds.warning) return 'warning';
        return 'healthy';
    }
    
    getPerformanceStatus(apiStats, errorStats) {
        if (!apiStats) return 'unknown';
        
        if (apiStats.successRate < 90 || (errorStats?.totalErrors || 0) > 10) {
            return 'critical';
        }
        
        if (apiStats.successRate < 95 || apiStats.avgResponseTime > 2000) {
            return 'warning';
        }
        
        return 'healthy';
    }
    
    calculatePerformanceScore(apiStats, errorStats, memoryStats) {
        let score = 100;
        
        // API performance impact
        if (apiStats) {
            if (apiStats.successRate < 95) {
                score -= (95 - apiStats.successRate) * 2;
            }
            
            if (apiStats.avgResponseTime > 1000) {
                score -= Math.min(20, (apiStats.avgResponseTime - 1000) / 100);
            }
        }
        
        // Error impact
        if (errorStats) {
            score -= Math.min(30, errorStats.totalErrors * 3);
        }
        
        // Memory impact
        if (memoryStats && memoryStats.currentUsage > 80) {
            score -= (memoryStats.currentUsage - 80) * 2;
        }
        
        return Math.max(0, Math.round(score));
    }
    
    calculateOverallHealth() {
        const componentStatuses = Object.values(this.statusData.components).map(c => c.status);
        
        if (componentStatuses.includes('critical')) {
            this.statusData.overall = 'critical';
        } else if (componentStatuses.includes('warning')) {
            this.statusData.overall = 'warning';
        } else if (componentStatuses.includes('unknown')) {
            this.statusData.overall = 'degraded';
        } else {
            this.statusData.overall = 'healthy';
        }
    }
    
    setupStatusDisplay() {
        // Create system status overview widget
        this.createStatusWidget();
    }
    
    createStatusWidget() {
        // Find or create status widget container
        let statusWidget = document.getElementById('system-status-widget');
        
        if (!statusWidget) {
            statusWidget = document.createElement('div');
            statusWidget.id = 'system-status-widget';
            statusWidget.className = 'system-status-widget';
            
            // Insert in dashboard header or top area
            const dashboardHeader = document.querySelector('.dashboard-header') || 
                                  document.querySelector('.analytics-controls') ||
                                  document.body;
            
            dashboardHeader.appendChild(statusWidget);
        }
        
        this.statusWidget = statusWidget;
        this.renderStatusWidget();
    }
    
    renderStatusWidget() {
        const status = this.statusData.overall;
        const statusIcon = this.getStatusIcon(status);
        const statusColor = this.getStatusColor(status);
        
        this.statusWidget.innerHTML = `
            <div class="status-overview" style="border-left-color: ${statusColor}">
                <div class="status-header">
                    <div class="status-icon" style="color: ${statusColor}">${statusIcon}</div>
                    <div class="status-info">
                        <div class="status-title">System Status</div>
                        <div class="status-value" style="color: ${statusColor}">${status.toUpperCase()}</div>
                    </div>
                    <div class="status-score">
                        <div class="score-label">Performance</div>
                        <div class="score-value">${this.statusData.metrics.performanceScore}%</div>
                    </div>
                </div>
                
                <div class="status-metrics">
                    <div class="metric-item">
                        <span class="metric-label">Active Users:</span>
                        <span class="metric-value">${this.statusData.metrics.activeUsers}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">API Response:</span>
                        <span class="metric-value">${this.statusData.components.api.responseTime}ms</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Error Rate:</span>
                        <span class="metric-value">${this.statusData.metrics.errorRate.toFixed(1)}/hr</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Engagement:</span>
                        <span class="metric-value">${Math.round(this.statusData.metrics.avgEngagement)}%</span>
                    </div>
                </div>
                
                <div class="status-components">
                    ${Object.entries(this.statusData.components).map(([name, component]) => `
                        <div class="component-status ${component.status}">
                            <span class="component-name">${name.toUpperCase()}</span>
                            <span class="component-indicator"></span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="status-footer">
                    <span class="last-update">Last updated: ${this.statusData.lastUpdate.toLocaleTimeString()}</span>
                    <button class="refresh-status" onclick="refreshSystemStatus()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
        `;
    }
    
    getStatusIcon(status) {
        const icons = {
            healthy: '✅',
            warning: '⚠️',
            critical: '🚨',
            degraded: '⚡',
            unknown: '❓'
        };
        return icons[status] || icons.unknown;
    }
    
    getStatusColor(status) {
        const colors = {
            healthy: '#28a745',
            warning: '#ffc107',
            critical: '#dc3545',
            degraded: '#17a2b8',
            unknown: '#6c757d'
        };
        return colors[status] || colors.unknown;
    }
    
    updateStatusDisplays() {
        // Update the status widget
        this.renderStatusWidget();
        
        // Update real-time dashboard if available
        if (window.realtimeDashboard && typeof window.realtimeDashboard.updateSystemStatus === 'function') {
            try {
                window.realtimeDashboard.updateSystemStatus(this.statusData);
            } catch (error) {
                console.warn('⚠️ Failed to update real-time dashboard:', error.message);
            }
        }
        
        // Dispatch status update event
        window.dispatchEvent(new CustomEvent('systemStatusUpdate', {
            detail: this.statusData
        }));
    }
    
    setupHealthChecks() {
        // Periodic comprehensive health checks
        setInterval(() => {
            this.performComprehensiveHealthCheck();
        }, 5 * 60 * 1000); // Every 5 minutes
    }
    
    async performHealthCheck() {
        console.log('🏥 Performing system health check...');
        
        // Check all critical systems
        const healthResults = await Promise.allSettled([
            this.checkAPIHealth(),
            this.checkDatabaseHealth(),
            this.checkAnalyticsHealth(),
            this.checkPerformanceHealth()
        ]);
        
        // Process results
        healthResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Health check ${index} failed:`, result.reason);
            }
        });
    }
    
    async performComprehensiveHealthCheck() {
        console.log('🔍 Performing comprehensive health check...');
        
        // Run all health checks
        await this.performHealthCheck();
        
        // Generate health report
        const healthReport = this.generateHealthReport();
        
        // Store health report
        this.saveHealthReport(healthReport);
        
        console.log('📋 Health check completed:', healthReport);
    }
    
    async checkAPIHealth() {
        try {
            const response = await fetch('/api/health');
            return {
                component: 'api',
                status: response.ok ? 'healthy' : 'critical',
                details: await response.json()
            };
        } catch (error) {
            return {
                component: 'api',
                status: 'critical',
                error: error.message
            };
        }
    }
    
    async checkDatabaseHealth() {
        // Simplified database health check
        return {
            component: 'database',
            status: 'healthy',
            details: { connections: 'active' }
        };
    }
    
    async checkAnalyticsHealth() {
        const isHealthy = window.realAnalyticsProcessor && 
                         window.interactionTracker && 
                         window.performanceMonitor;
        
        return {
            component: 'analytics',
            status: isHealthy ? 'healthy' : 'warning',
            details: {
                processor: !!window.realAnalyticsProcessor,
                tracker: !!window.interactionTracker,
                monitor: !!window.performanceMonitor
            }
        };
    }
    
    async checkPerformanceHealth() {
        const memoryInfo = performance.memory;
        const isHealthy = memoryInfo ? 
            (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) < 0.8 : true;
        
        return {
            component: 'performance',
            status: isHealthy ? 'healthy' : 'warning',
            details: memoryInfo ? {
                memoryUsage: Math.round((memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100)
            } : {}
        };
    }
    
    generateHealthReport() {
        return {
            timestamp: new Date(),
            overallStatus: this.statusData.overall,
            components: this.statusData.components,
            metrics: this.statusData.metrics,
            performanceScore: this.statusData.metrics.performanceScore,
            recommendations: this.generateRecommendations()
        };
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        if (this.statusData.metrics.performanceScore < 80) {
            recommendations.push('Consider optimizing API response times');
        }
        
        if (this.statusData.metrics.errorRate > 5) {
            recommendations.push('Investigate and reduce error rate');
        }
        
        if (this.statusData.metrics.avgEngagement < 50) {
            recommendations.push('Review user experience and engagement features');
        }
        
        return recommendations;
    }
    
    async saveHealthReport(report) {
        try {
            if (firebase && firebase.firestore) {
                await firebase.firestore()
                    .collection('system_health_reports')
                    .add(report);
            }
        } catch (error) {
            console.error('Error saving health report:', error);
        }
    }
    
    checkAlertConditions() {
        // Disabled repetitive analytics alerts - focus on critical system issues only
        const newAlerts = [];

        // Only alert for truly critical API issues (not normal variations)
        if (this.statusData.components.api.responseTime > 10000) { // 10 seconds - truly critical
            newAlerts.push({
                type: 'critical',
                component: 'api',
                message: `API response time is critically slow: ${this.statusData.components.api.responseTime}ms`
            });
        }

        // Only alert for extremely high error rates (not normal analytics data)
        if (this.statusData.metrics.errorRate > 50) { // 50 errors/hr - truly critical
            newAlerts.push({
                type: 'critical',
                component: 'errors',
                message: `Critical error rate detected: ${this.statusData.metrics.errorRate.toFixed(1)}/hr`
            });
        }

        // Remove engagement alerts - these are analytics insights, not system alerts
        // Engagement data should be viewed in the analytics dashboard, not as alerts

        // Send only critical system alerts
        newAlerts.forEach(alert => {
            if (window.realtimeDashboard) {
                window.realtimeDashboard.showAlert(alert.type, `System ${alert.component.toUpperCase()} Alert`, alert.message);
            }
        });
    }
    
    handleMonitoringError(error) {
        console.warn('System monitoring error:', error.message);

        // Update status to indicate monitoring issues
        this.statusData.overall = 'degraded';
        this.statusData.components.monitoring = {
            status: 'critical',
            error: error.message,
            lastError: new Date()
        };

        // Avoid recursive calls - only update local displays
        this.updateLocalStatusDisplays();
    }

    updateLocalStatusDisplays() {
        // Update only local DOM elements, avoid calling external systems
        try {
            const statusElements = document.querySelectorAll('.system-status');
            statusElements.forEach(element => {
                if (element) {
                    element.className = `system-status ${this.statusData.overall}`;
                }
            });

            // Update status text
            const statusTextElements = document.querySelectorAll('.status-text');
            statusTextElements.forEach(element => {
                if (element) {
                    element.textContent = this.statusData.overall.toUpperCase();
                }
            });
        } catch (displayError) {
            console.warn('Failed to update local status displays:', displayError.message);
        }
    }
    
    // Public methods
    getSystemStatus() {
        return this.statusData;
    }
    
    refreshStatus() {
        console.log('🔄 Manual status refresh requested');
        this.updateSystemStatus();
    }
    
    getHealthSummary() {
        return {
            status: this.statusData.overall,
            score: this.statusData.metrics.performanceScore,
            components: Object.keys(this.statusData.components).length,
            lastUpdate: this.statusData.lastUpdate
        };
    }
}

// Global function for manual refresh
window.refreshSystemStatus = function() {
    if (window.systemStatusMonitor) {
        window.systemStatusMonitor.refreshStatus();
    }
};

// Initialize system status monitor
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.systemStatusMonitor) {
        console.warn('⚠️ System Status Monitor already initialized');
        return;
    }

    setTimeout(() => {
        try {
            window.systemStatusMonitor = new SystemStatusMonitor();
            console.warn('📊 System Status Monitor initialized');
        } catch (error) {
            console.warn('❌ Failed to initialize System Status Monitor:', error.message);
        }
    }, 12000); // Wait for all other systems
});
