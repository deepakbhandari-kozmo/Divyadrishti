// Real-time Dashboard Integration System
class RealtimeDashboard {
    constructor() {
        this.updateInterval = null;
        this.liveCharts = {};
        this.liveMetrics = {};
        this.healthIndicators = {};
        this.alertSystem = null;
        this.isActive = true;
        this.updateFrequency = 5000; // 5 seconds for real-time updates
        
        this.init();
    }
    
    init() {
        console.log('🔴 Initializing Real-time Dashboard...');
        this.setupLiveMetrics();
        this.setupHealthIndicators();
        this.setupLiveCharts();
        this.setupAlertSystem();
        this.startRealtimeUpdates();
        this.setupVisibilityHandling();
    }
    
    setupLiveMetrics() {
        // Create live metric displays
        this.createLiveMetricElements();
        this.initializeLiveCounters();
    }
    
    createLiveMetricElements() {
        // Add real-time indicators to existing metrics
        const metricsToEnhance = [
            { id: 'active-users-count', label: 'Active Users', type: 'counter' },
            { id: 'avg-load-time', label: 'Load Time', type: 'gauge' },
            { id: 'error-count', label: 'Errors', type: 'counter' },
            { id: 'uptime-percentage', label: 'Uptime', type: 'percentage' }
        ];
        
        metricsToEnhance.forEach(metric => {
            const element = document.getElementById(metric.id);
            if (element) {
                this.enhanceMetricElement(element, metric);
            }
        });
    }
    
    enhanceMetricElement(element, metric) {
        // Add live indicator
        const liveIndicator = document.createElement('div');
        liveIndicator.className = 'live-indicator';
        liveIndicator.innerHTML = '<span class="live-dot"></span>LIVE';
        
        // Add trend indicator
        const trendIndicator = document.createElement('div');
        trendIndicator.className = 'trend-indicator';
        trendIndicator.id = `${metric.id}-trend`;
        
        // Insert indicators
        const parent = element.parentElement;
        if (parent) {
            parent.appendChild(liveIndicator);
            parent.appendChild(trendIndicator);
        }
        
        // Store reference
        this.liveMetrics[metric.id] = {
            element: element,
            trendElement: trendIndicator,
            type: metric.type,
            history: [],
            lastValue: 0
        };
    }
    
    initializeLiveCounters() {
        // Initialize animated counters for metrics
        Object.keys(this.liveMetrics).forEach(metricId => {
            const metric = this.liveMetrics[metricId];
            if (metric.type === 'counter') {
                this.initializeCounter(metric);
            }
        });
    }
    
    initializeCounter(metric) {
        metric.animatedValue = 0;
        metric.targetValue = 0;
        metric.animationFrame = null;
    }
    
    setupHealthIndicators() {
        // Create system health indicators
        this.createHealthStatusPanel();
        this.initializeHealthMetrics();
    }
    
    createHealthStatusPanel() {
        // Find or create health status container
        let healthContainer = document.getElementById('health-status-panel');
        
        if (!healthContainer) {
            healthContainer = document.createElement('div');
            healthContainer.id = 'health-status-panel';
            healthContainer.className = 'health-status-panel';
            
            // Insert after analytics controls
            const analyticsControls = document.querySelector('.analytics-controls');
            if (analyticsControls) {
                analyticsControls.parentNode.insertBefore(healthContainer, analyticsControls.nextSibling);
            }
        }
        
        healthContainer.innerHTML = `
            <div class="health-indicators">
                <div class="health-indicator" id="api-health">
                    <div class="health-icon">🌐</div>
                    <div class="health-info">
                        <div class="health-label">API Health</div>
                        <div class="health-value" id="api-health-value">Checking...</div>
                        <div class="health-trend" id="api-health-trend"></div>
                    </div>
                    <div class="health-status" id="api-health-status"></div>
                </div>
                
                <div class="health-indicator" id="performance-health">
                    <div class="health-icon">⚡</div>
                    <div class="health-info">
                        <div class="health-label">Performance</div>
                        <div class="health-value" id="performance-health-value">Checking...</div>
                        <div class="health-trend" id="performance-health-trend"></div>
                    </div>
                    <div class="health-status" id="performance-health-status"></div>
                </div>
                
                <div class="health-indicator" id="error-health">
                    <div class="health-icon">🚨</div>
                    <div class="health-info">
                        <div class="health-label">Error Rate</div>
                        <div class="health-value" id="error-health-value">Checking...</div>
                        <div class="health-trend" id="error-health-trend"></div>
                    </div>
                    <div class="health-status" id="error-health-status"></div>
                </div>
                
                <div class="health-indicator" id="engagement-health">
                    <div class="health-icon">👥</div>
                    <div class="health-info">
                        <div class="health-label">User Engagement</div>
                        <div class="health-value" id="engagement-health-value">Checking...</div>
                        <div class="health-trend" id="engagement-health-trend"></div>
                    </div>
                    <div class="health-status" id="engagement-health-status"></div>
                </div>
            </div>
        `;
    }
    
    initializeHealthMetrics() {
        this.healthIndicators = {
            'api-health': { value: 100, status: 'healthy', trend: 'stable' },
            'performance-health': { value: 85, status: 'good', trend: 'stable' },
            'error-health': { value: 95, status: 'healthy', trend: 'stable' },
            'engagement-health': { value: 75, status: 'good', trend: 'increasing' }
        };
    }
    
    setupLiveCharts() {
        // Enhance existing charts with real-time capabilities
        this.setupLiveUserActivityChart();
        this.setupLivePerformanceChart();
        this.setupLiveInteractionChart();
        this.setupLiveHealthChart();
    }
    
    setupLiveUserActivityChart() {
        // Add real-time data points to user activity chart
        const chartContainer = document.querySelector('#user-activity-chart').parentElement;
        if (chartContainer) {
            this.addLiveChartControls(chartContainer, 'user-activity');
        }
    }
    
    setupLivePerformanceChart() {
        // Add real-time performance monitoring
        const chartContainer = document.querySelector('#performance-chart').parentElement;
        if (chartContainer) {
            this.addLiveChartControls(chartContainer, 'performance');
        }
    }
    
    setupLiveInteractionChart() {
        // Create new live interaction chart
        this.createLiveInteractionChart();
    }
    
    setupLiveHealthChart() {
        // Create system health overview chart
        this.createLiveHealthChart();
    }
    
    addLiveChartControls(container, chartType) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'live-chart-controls';
        controlsDiv.innerHTML = `
            <div class="live-chart-status">
                <span class="live-indicator-small">
                    <span class="live-dot-small"></span>LIVE
                </span>
                <span class="update-frequency">Updates every 5s</span>
            </div>
            <div class="chart-actions">
                <button class="chart-action-btn" onclick="pauseLiveChart('${chartType}')">
                    <i class="fas fa-pause"></i>
                </button>
                <button class="chart-action-btn" onclick="resetLiveChart('${chartType}')">
                    <i class="fas fa-refresh"></i>
                </button>
            </div>
        `;
        
        container.insertBefore(controlsDiv, container.firstChild.nextSibling);
    }
    
    createLiveInteractionChart() {
        // Create a new chart for real-time interactions
        const chartsGrid = document.querySelector('.charts-grid');
        if (!chartsGrid) return;
        
        const interactionChartContainer = document.createElement('div');
        interactionChartContainer.className = 'chart-container live-chart';
        interactionChartContainer.innerHTML = `
            <div class="chart-header">
                <h4>Live User Interactions</h4>
                <div class="live-chart-controls">
                    <span class="live-indicator-small">
                        <span class="live-dot-small"></span>LIVE
                    </span>
                </div>
            </div>
            <canvas id="live-interaction-chart"></canvas>
        `;
        
        chartsGrid.appendChild(interactionChartContainer);
        
        // Initialize the chart
        this.initializeLiveInteractionChart();
    }
    
    createLiveHealthChart() {
        // Create system health overview chart
        const chartsGrid = document.querySelector('.charts-grid');
        if (!chartsGrid) return;
        
        const healthChartContainer = document.createElement('div');
        healthChartContainer.className = 'chart-container live-chart';
        healthChartContainer.innerHTML = `
            <div class="chart-header">
                <h4>System Health Overview</h4>
                <div class="live-chart-controls">
                    <span class="live-indicator-small">
                        <span class="live-dot-small"></span>LIVE
                    </span>
                </div>
            </div>
            <canvas id="live-health-chart"></canvas>
        `;
        
        chartsGrid.appendChild(healthChartContainer);
        
        // Initialize the chart
        this.initializeLiveHealthChart();
    }
    
    initializeLiveInteractionChart() {
        const ctx = document.getElementById('live-interaction-chart');
        if (!ctx) return;
        
        this.liveCharts.interactions = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Clicks/min',
                    data: [],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Scrolls/min',
                    data: [],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Interactions per minute'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
    
    initializeLiveHealthChart() {
        const ctx = document.getElementById('live-health-chart');
        if (!ctx) return;
        
        this.liveCharts.health = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['API Health', 'Performance', 'Error Rate', 'User Engagement', 'System Load'],
                datasets: [{
                    label: 'Current Health',
                    data: [100, 85, 95, 75, 90],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.2)',
                    pointBackgroundColor: '#007bff',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#007bff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    setupAlertSystem() {
        // Create real-time alert system
        this.alertSystem = {
            alerts: [],
            maxAlerts: 5,
            container: this.createAlertContainer()
        };
    }
    
    createAlertContainer() {
        let alertContainer = document.getElementById('realtime-alerts');
        
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'realtime-alerts';
            alertContainer.className = 'realtime-alerts';
            
            // Insert at top of dashboard
            const dashboard = document.querySelector('.dashboard-container') || document.body;
            dashboard.insertBefore(alertContainer, dashboard.firstChild);
        }
        
        return alertContainer;
    }
    
    startRealtimeUpdates() {
        // Start the main real-time update loop
        this.updateInterval = setInterval(() => {
            if (this.isActive && !document.hidden) {
                this.updateLiveMetrics();
                this.updateHealthIndicators();
                this.updateLiveCharts();
                this.checkForAlerts();
            }
        }, this.updateFrequency);
        
        console.log('🔴 Real-time updates started (every 5 seconds)');
    }
    
    updateLiveMetrics() {
        // Update live metrics with real data
        if (window.realAnalyticsProcessor) {
            const stats = window.realAnalyticsProcessor.getRealTimeStats();
            this.updateMetricValue('active-users-count', stats.activeUsers);
            this.updateMetricValue('avg-load-time', Math.round(stats.avgLoadTime) + 'ms');
            this.updateMetricValue('error-count', stats.errorStats?.totalErrors || 0);
            this.updateMetricValue('uptime-percentage', stats.apiStats?.successRate?.toFixed(1) + '%' || '99.9%');
        }
    }
    
    updateMetricValue(metricId, newValue) {
        const metric = this.liveMetrics[metricId];
        if (!metric) return;
        
        const numericValue = typeof newValue === 'string' ? 
            parseFloat(newValue.replace(/[^\d.]/g, '')) : newValue;
        
        // Update history
        metric.history.push(numericValue);
        if (metric.history.length > 10) {
            metric.history.shift();
        }
        
        // Animate counter
        if (metric.type === 'counter') {
            this.animateCounter(metric, numericValue);
        } else {
            metric.element.textContent = newValue;
        }
        
        // Update trend
        this.updateTrend(metric, numericValue);
        
        metric.lastValue = numericValue;
    }
    
    animateCounter(metric, targetValue) {
        const startValue = metric.animatedValue || 0;
        const duration = 1000; // 1 second animation
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (targetValue - startValue) * easeOut;
            
            metric.animatedValue = currentValue;
            metric.element.textContent = Math.round(currentValue);
            
            if (progress < 1) {
                metric.animationFrame = requestAnimationFrame(animate);
            }
        };
        
        if (metric.animationFrame) {
            cancelAnimationFrame(metric.animationFrame);
        }
        
        animate();
    }
    
    updateTrend(metric, currentValue) {
        if (metric.history.length < 2) return;
        
        const previousValue = metric.history[metric.history.length - 2];
        const change = currentValue - previousValue;
        const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
        
        let trendClass = 'stable';
        let trendIcon = '→';
        let trendText = 'Stable';
        
        if (Math.abs(changePercent) > 5) {
            if (change > 0) {
                trendClass = metricId.includes('error') ? 'negative' : 'positive';
                trendIcon = '↗';
                trendText = `+${Math.abs(changePercent).toFixed(1)}%`;
            } else {
                trendClass = metricId.includes('error') ? 'positive' : 'negative';
                trendIcon = '↘';
                trendText = `-${Math.abs(changePercent).toFixed(1)}%`;
            }
        }
        
        metric.trendElement.className = `trend-indicator ${trendClass}`;
        metric.trendElement.innerHTML = `${trendIcon} ${trendText}`;
    }
    
    updateHealthIndicators() {
        // Update health indicators with real data
        if (window.realAnalyticsProcessor) {
            const stats = window.realAnalyticsProcessor.getRealTimeStats();
            
            // API Health
            const apiHealth = stats.apiStats?.successRate || 100;
            this.updateHealthIndicator('api-health', apiHealth, `${apiHealth.toFixed(1)}% Success Rate`);
            
            // Performance Health
            const perfHealth = Math.max(0, 100 - (stats.avgLoadTime || 1000) / 50);
            this.updateHealthIndicator('performance-health', perfHealth, `${Math.round(stats.avgLoadTime || 0)}ms Avg`);
            
            // Error Health
            const errorHealth = Math.max(0, 100 - (stats.errorStats?.totalErrors || 0) * 5);
            this.updateHealthIndicator('error-health', errorHealth, `${stats.errorStats?.totalErrors || 0} Errors`);
            
            // Engagement Health
            const engagementHealth = stats.engagementMetrics?.avgEngagementScore || 75;
            this.updateHealthIndicator('engagement-health', engagementHealth, `${Math.round(engagementHealth)} Score`);
        }
    }
    
    updateHealthIndicator(indicatorId, value, displayText) {
        const valueElement = document.getElementById(`${indicatorId}-value`);
        const statusElement = document.getElementById(`${indicatorId}-status`);
        
        if (valueElement) {
            valueElement.textContent = displayText;
        }
        
        if (statusElement) {
            let status = 'healthy';
            let statusColor = '#28a745';
            
            if (value < 50) {
                status = 'critical';
                statusColor = '#dc3545';
            } else if (value < 75) {
                status = 'warning';
                statusColor = '#ffc107';
            } else if (value < 90) {
                status = 'good';
                statusColor = '#17a2b8';
            }
            
            statusElement.className = `health-status ${status}`;
            statusElement.style.backgroundColor = statusColor;
        }
        
        // Update health chart
        if (this.liveCharts.health) {
            const chartData = this.liveCharts.health.data.datasets[0].data;
            const index = ['api-health', 'performance-health', 'error-health', 'engagement-health'].indexOf(indicatorId);
            if (index !== -1 && index < chartData.length) {
                chartData[index] = value;
                this.liveCharts.health.update('none');
            }
        }
    }
    
    updateLiveCharts() {
        // Update live interaction chart
        if (this.liveCharts.interactions && window.interactionTracker) {
            const stats = window.interactionTracker.getInteractionStats();
            this.updateInteractionChart(stats);
        }
        
        // Update other live charts
        this.updateExistingCharts();
    }
    
    updateInteractionChart(stats) {
        const chart = this.liveCharts.interactions;
        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
        
        // Add new data point
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(stats.clickCount || 0);
        chart.data.datasets[1].data.push(stats.scrollCount || 0);
        
        // Keep only last 20 data points
        if (chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
            chart.data.datasets[1].data.shift();
        }
        
        chart.update('none');
    }
    
    updateExistingCharts() {
        // Update existing analytics charts with real-time data
        if (window.analyticsManager) {
            // Trigger chart updates through analytics manager
            window.analyticsManager.updateChartsData();
        }
    }
    
    checkForAlerts() {
        // Disabled automatic analytics alerts - these are now handled by the analytics system itself
        // The real-time dashboard focuses on system health rather than analytics notifications

        // Only check for critical system issues that require immediate attention
        if (window.realAnalyticsProcessor) {
            const stats = window.realAnalyticsProcessor.getRealTimeStats();

            // Only alert for truly critical system failures
            if (stats.apiStats?.successRate < 50) {
                this.showAlert('error', 'Critical System Failure', `API success rate is critically low: ${stats.apiStats.successRate.toFixed(1)}%`);
            }

            // Only alert for extremely slow performance that indicates system problems
            if (stats.avgLoadTime > 10000) {
                this.showAlert('warning', 'System Performance Critical', `System response time is critically slow: ${Math.round(stats.avgLoadTime)}ms`);
            }
        }
    }
    
    showAlert(type, title, message) {
        // Prevent duplicate alerts
        const existingAlert = this.alertSystem.alerts.find(alert => 
            alert.title === title && alert.message === message
        );
        
        if (existingAlert) return;
        
        const alert = {
            id: Date.now(),
            type: type,
            title: title,
            message: message,
            timestamp: new Date()
        };
        
        this.alertSystem.alerts.unshift(alert);
        
        // Keep only recent alerts
        if (this.alertSystem.alerts.length > this.alertSystem.maxAlerts) {
            this.alertSystem.alerts.pop();
        }
        
        this.renderAlerts();
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            this.dismissAlert(alert.id);
        }, 10000);
    }
    
    renderAlerts() {
        const container = this.alertSystem.container;
        container.innerHTML = '';
        
        this.alertSystem.alerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = `realtime-alert alert-${alert.type}`;
            alertElement.innerHTML = `
                <div class="alert-icon">
                    ${this.getAlertIcon(alert.type)}
                </div>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-time">${alert.timestamp.toLocaleTimeString()}</div>
                </div>
                <button class="alert-dismiss" onclick="dismissRealtimeAlert(${alert.id})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            container.appendChild(alertElement);
        });
    }
    
    getAlertIcon(type) {
        const icons = {
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>',
            success: '<i class="fas fa-check-circle"></i>'
        };
        
        return icons[type] || icons.info;
    }
    
    dismissAlert(alertId) {
        this.alertSystem.alerts = this.alertSystem.alerts.filter(alert => alert.id !== alertId);
        this.renderAlerts();
    }
    
    setupVisibilityHandling() {
        // Pause updates when page is not visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseUpdates();
            } else {
                this.resumeUpdates();
            }
        });
    }
    
    pauseUpdates() {
        this.isActive = false;
        console.log('⏸️ Real-time updates paused (page hidden)');
    }
    
    resumeUpdates() {
        this.isActive = true;
        console.log('▶️ Real-time updates resumed (page visible)');
        
        // Immediate update when resuming
        this.updateLiveMetrics();
        this.updateHealthIndicators();
        this.updateLiveCharts();
    }
    
    // Public methods for external control
    pauseLiveChart(chartType) {
        console.log(`⏸️ Pausing live chart: ${chartType}`);
        // Implementation for pausing specific charts
    }
    
    resetLiveChart(chartType) {
        console.log(`🔄 Resetting live chart: ${chartType}`);
        // Implementation for resetting specific charts
    }
    
    updateSystemStatus(statusData) {
        // Handle system status updates from system status monitor
        console.log('📊 Received system status update:', statusData.overall);

        // Update health indicators if available
        if (statusData.components) {
            Object.entries(statusData.components).forEach(([component, data]) => {
                if (data.status && data.responseTime !== undefined) {
                    // Update component-specific indicators
                    this.updateComponentStatus(component, data);
                }
            });
        }

        // Update overall health score
        if (statusData.metrics && statusData.metrics.performanceScore !== undefined) {
            this.updateOverallHealthScore(statusData.metrics.performanceScore);
        }
    }

    updateComponentStatus(component, data) {
        // Update individual component status indicators
        const statusElement = document.getElementById(`${component}-health-status`);
        if (statusElement) {
            statusElement.className = `health-status ${data.status}`;
        }

        const valueElement = document.getElementById(`${component}-health-value`);
        if (valueElement && component === 'api') {
            valueElement.textContent = `${data.responseTime}ms`;
        }
    }

    updateOverallHealthScore(score) {
        // Update overall health score display
        const scoreElements = document.querySelectorAll('.score-value');
        scoreElements.forEach(element => {
            if (element.textContent.includes('%')) {
                element.textContent = `${score}%`;
            }
        });
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Clean up charts
        Object.values(this.liveCharts).forEach(chart => {
            if (chart) chart.destroy();
        });

        console.log('🔴 Real-time dashboard destroyed');
    }
}

// Global functions for dashboard controls
window.pauseLiveChart = function(chartType) {
    if (window.realtimeDashboard) {
        window.realtimeDashboard.pauseLiveChart(chartType);
    }
};

window.resetLiveChart = function(chartType) {
    if (window.realtimeDashboard) {
        window.realtimeDashboard.resetLiveChart(chartType);
    }
};

window.dismissRealtimeAlert = function(alertId) {
    if (window.realtimeDashboard) {
        window.realtimeDashboard.dismissAlert(alertId);
    }
};

// Initialize real-time dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.realtimeDashboard) {
        console.warn('⚠️ Real-time Dashboard already initialized');
        return;
    }

    setTimeout(() => {
        try {
            if (typeof Chart !== 'undefined') {
                window.realtimeDashboard = new RealtimeDashboard();
                console.warn('🔴 Real-time Dashboard initialized');
            } else {
                console.warn('⚠️ Chart.js not available, real-time dashboard disabled');
            }
        } catch (error) {
            console.warn('❌ Failed to initialize Real-time Dashboard:', error.message);
        }
    }, 10000); // Wait for all other systems to initialize
});
