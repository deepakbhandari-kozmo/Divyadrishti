// User Activity & Performance Analytics
class AnalyticsManager {
    constructor() {
        this.charts = {};
        this.currentTimeRange = '24h';
        this.updateInterval = null;
        this.analyticsData = {
            userActivity: [],
            performance: [],
            devices: {},
            topPages: {},
            quickStats: {}
        };
        
        this.init();
    }
    
    init() {
        console.log('🔍 Initializing Analytics Manager...');
        console.log('👤 Analytics available for all logged-in users');
        this.setupTimeRangeSelector();
        this.waitForRealData();
    }

    waitForRealData(attempts = 0) {
        const maxAttempts = 10; // Wait up to 10 seconds

        // Wait for real analytics processor to be ready
        if (window.realAnalyticsProcessor) {
            this.useRealData = true;
            this.loadRealData();
            return;
        }

        if (attempts < maxAttempts) {
            console.log(`⏳ Waiting for real analytics data... (${attempts + 1}/${maxAttempts})`);
            setTimeout(() => this.waitForRealData(attempts + 1), 1000);
        } else {
            console.log('⚠️ Real analytics processor not available, using dummy data');
            this.useRealData = false;
            this.loadDummyData();
        }
    }

    async loadDummyData() {
        console.log('📊 Loading dummy analytics data...');

        try {
            // Try to fetch data from new analytics API first
            const response = await fetch(`/api/analytics/combined?range=${this.currentTimeRange}`);
            if (response.ok) {
                const apiData = await response.json();
                if (apiData.success) {
                    console.log('✅ Using backend analytics API data');

                    // Use API data for charts
                    this.analyticsData.userActivity = apiData.userActivity || this.generateUserActivityData();
                    this.analyticsData.performance = apiData.performance || this.generatePerformanceData();

                    // Generate quick stats from the chart data
                    this.analyticsData.quickStats = this.generateQuickStatsFromData();
                    this.analyticsData.quickStats.dataSource = 'backend_api';
                } else {
                    throw new Error('API returned error: ' + apiData.error);
                }
            } else {
                throw new Error('API not available');
            }
        } catch (error) {
            console.log('⚠️ Backend API not available, using local dummy data:', error.message);
            // Generate all data locally
            this.generateInitialData();
        }

        this.createCharts();
        this.updateQuickStats();
        this.startRealTimeUpdates();
        console.log('✅ Dummy analytics data loaded');
        this.updateDataSourceIndicator('dummy');
    }

    loadRealData() {
        console.log('📊 Loading real analytics data...');

        try {
            // Get real data for current time range
            const realData = window.realAnalyticsProcessor.getDataForTimeRange(this.currentTimeRange);
            const realStats = window.realAnalyticsProcessor.getRealTimeStats();

            // Check if we have sufficient real data
            const hasUserActivity = realData.userActivity && realData.userActivity.length > 0;
            const hasPerformanceData = realData.performance && realData.performance.length > 0;
            const hasRealStats = realStats && Object.keys(realStats).length > 0;

            if (hasUserActivity || hasPerformanceData || hasRealStats) {
                console.log('✅ Using real analytics data');

                // Use real data where available, fall back to dummy data for missing parts
                this.analyticsData.userActivity = realData.userActivity || this.generateUserActivityData();
                this.analyticsData.performance = realData.performance || this.generatePerformanceData();
                this.analyticsData.devices = this.convertDeviceStats(realStats.deviceBreakdown) || this.generateDeviceData();
                this.analyticsData.topPages = realStats.topPages || this.generateTopPagesData();
                this.analyticsData.quickStats = realStats || this.generateQuickStatsData();

                // Register for real-time updates
                if (window.realAnalyticsProcessor.addListener) {
                    window.realAnalyticsProcessor.addListener((type, data) => {
                        this.handleRealDataUpdate(type, data);
                    });
                }
            } else {
                console.log('⚠️ No real data available, using dummy data');
                this.loadDummyData();
                return;
            }

            // Create charts and update UI
            this.createCharts();
            this.updateQuickStats();
            this.startRealTimeUpdates();

            console.log('✅ Real analytics data loaded successfully');
            this.updateDataSourceIndicator('real');

        } catch (error) {
            console.error('❌ Error loading real analytics data:', error);
            console.log('🔄 Falling back to dummy data');
            this.loadDummyData();
        }
    }

    convertDeviceStats(deviceBreakdown) {
        if (!deviceBreakdown) return null;

        const total = Object.values(deviceBreakdown).reduce((sum, count) => sum + count, 0);
        if (total === 0) return null;

        return {
            Desktop: Math.round((deviceBreakdown.desktop / total) * 100),
            Mobile: Math.round((deviceBreakdown.mobile / total) * 100),
            Tablet: Math.round((deviceBreakdown.tablet / total) * 100),
            Other: Math.round((deviceBreakdown.other / total) * 100)
        };
    }

    // Helper functions for generating fallback data
    generateUserActivityData() {
        const now = new Date();
        const dataPoints = this.getDataPointsForRange(this.currentTimeRange);
        const userActivity = [];

        for (let i = dataPoints - 1; i >= 0; i--) {
            const time = new Date(now.getTime() - i * this.getIntervalForRange(this.currentTimeRange));
            const hour = time.getHours();
            const baseUsers = this.getBaseUsersForHour(hour);
            const activeUsers = baseUsers + Math.floor(Math.random() * 20) - 10;
            const pageViews = activeUsers * (2 + Math.random() * 3);

            userActivity.push({
                time: time,
                activeUsers: Math.max(0, activeUsers),
                pageViews: Math.max(0, Math.floor(pageViews))
            });
        }
        return userActivity;
    }

    generatePerformanceData() {
        const now = new Date();
        const dataPoints = this.getDataPointsForRange(this.currentTimeRange);
        const performance = [];

        for (let i = dataPoints - 1; i >= 0; i--) {
            const time = new Date(now.getTime() - i * this.getIntervalForRange(this.currentTimeRange));
            performance.push({
                time: time,
                loadTime: 800 + Math.random() * 1200,
                responseTime: 50 + Math.random() * 200
            });
        }
        return performance;
    }

    generateDeviceData() {
        return {
            'Desktop': 45 + Math.random() * 10,
            'Mobile': 35 + Math.random() * 10,
            'Tablet': 15 + Math.random() * 5,
            'Other': 5 + Math.random() * 3
        };
    }

    generateTopPagesData() {
        return {
            '/dashboard': Math.floor(Math.random() * 100) + 50,
            '/map': Math.floor(Math.random() * 80) + 30,
            '/profile': Math.floor(Math.random() * 60) + 20,
            '/settings': Math.floor(Math.random() * 40) + 10,
            '/help': Math.floor(Math.random() * 30) + 5
        };
    }

    generateQuickStatsData() {
        return {
            activeUsers: Math.floor(Math.random() * 50) + 20,
            avgUserTime: Math.floor(Math.random() * 300) + 120, // 2-7 minutes
            bounceRate: Math.floor(Math.random() * 30) + 20, // 20-50%
            pageViews: Math.floor(Math.random() * 500) + 200
        };
    }

    generateQuickStatsFromData() {
        // Generate quick stats from actual chart data
        const userActivity = this.analyticsData.userActivity || [];
        const performance = this.analyticsData.performance || [];

        if (userActivity.length === 0 || performance.length === 0) {
            return this.generateQuickStatsData();
        }

        // Calculate current active users (latest data point)
        const latestUserData = userActivity[userActivity.length - 1];
        const activeUsers = latestUserData ? latestUserData.activeUsers : 0;

        // Calculate average load time from performance data
        const avgLoadTime = performance.length > 0
            ? Math.round(performance.reduce((sum, p) => sum + (p.loadTime || 0), 0) / performance.length)
            : 1000;

        // Calculate uptime based on performance (good performance = high uptime)
        const avgResponseTime = performance.length > 0
            ? performance.reduce((sum, p) => sum + (p.responseTime || 0), 0) / performance.length
            : 100;

        const uptime = Math.max(95, Math.min(99.9, 100 - (avgResponseTime / 50))); // Convert response time to uptime

        // Calculate error count based on performance
        const errorCount = Math.floor(avgLoadTime > 2000 ? Math.random() * 10 : Math.random() * 3);

        return {
            activeUsers: activeUsers,
            avgLoadTime: avgLoadTime,
            uptime: uptime.toFixed(1),
            errorCount: errorCount,
            pageViews: latestUserData ? latestUserData.pageViews : 0
        };
    }

    updateDataSourceIndicator(source) {
        // Add a data source indicator to the analytics card header
        const cardHeader = document.querySelector('.analytics-card .card-header h3');
        if (cardHeader) {
            // Remove existing indicator
            const existingIndicator = cardHeader.querySelector('.data-source-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }

            // Add new indicator
            const indicator = document.createElement('span');
            indicator.className = 'data-source-indicator';
            indicator.style.cssText = `
                margin-left: 10px;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                ${source === 'real' ?
                    'background: rgba(40, 167, 69, 0.1); color: #28a745; border: 1px solid rgba(40, 167, 69, 0.3);' :
                    'background: rgba(255, 193, 7, 0.1); color: #ffc107; border: 1px solid rgba(255, 193, 7, 0.3);'
                }
            `;
            indicator.textContent = source === 'real' ? '🟢 Live Data' : '🟡 Demo Data';
            cardHeader.appendChild(indicator);
        }
    }

    addChartDataIndicators() {
        const chartContainers = [
            { id: 'user-activity-chart', name: 'User Activity', dataType: 'userActivity' },
            { id: 'performance-chart', name: 'Performance Metrics', dataType: 'performance' }
        ];

        chartContainers.forEach(chart => {
            const chartElement = document.getElementById(chart.id);
            if (chartElement) {
                const container = chartElement.closest('.chart-container');
                if (container) {
                    // Remove existing indicator
                    const existingIndicator = container.querySelector('.chart-data-indicator');
                    if (existingIndicator) {
                        existingIndicator.remove();
                    }

                    // Determine data source for this specific chart
                    const isRealData = this.isChartUsingRealData(chart.dataType);

                    // Add new indicator
                    const indicator = document.createElement('div');
                    indicator.className = 'chart-data-indicator';
                    indicator.style.cssText = `
                        position: absolute;
                        top: 8px;
                        right: 8px;
                        padding: 2px 6px;
                        border-radius: 8px;
                        font-size: 9px;
                        font-weight: 600;
                        z-index: 10;
                        ${isRealData ?
                            'background: rgba(40, 167, 69, 0.8); color: white;' :
                            'background: rgba(255, 193, 7, 0.8); color: white;'
                        }
                    `;
                    indicator.textContent = isRealData ? '🟢 LIVE' : '🟡 DEMO';

                    // Make container relative positioned
                    container.style.position = 'relative';
                    container.appendChild(indicator);
                }
            }
        });
    }

    isChartUsingRealData(dataType) {
        // Check if this specific chart is using real data
        if (!this.useRealData || !window.realAnalyticsProcessor) {
            return false;
        }

        try {
            const realData = window.realAnalyticsProcessor.getDataForTimeRange(this.currentTimeRange);
            const realStats = window.realAnalyticsProcessor.getRealTimeStats();

            switch (dataType) {
                case 'userActivity':
                    return realData.userActivity && realData.userActivity.length > 0;
                case 'performance':
                    return realData.performance && realData.performance.length > 0;
                case 'devices':
                    return realStats.deviceBreakdown && Object.keys(realStats.deviceBreakdown).length > 0;
                case 'topPages':
                    return realStats.topPages && Object.keys(realStats.topPages).length > 0;
                default:
                    return false;
            }
        } catch (error) {
            return false;
        }
    }

    handleRealDataUpdate(type, data) {
        // Handle real-time data updates from processor
        switch (type) {
            case 'activeUsers':
                this.updateActiveUsersDisplay(data);
                break;
            case 'pageViews':
                if (this.currentTimeRange === '24h') {
                    this.analyticsData.userActivity = data;
                    this.updateUserActivityChart();
                }
                break;
            case 'performance':
                if (this.currentTimeRange === '24h') {
                    this.analyticsData.performance = data;
                    this.updatePerformanceChart();
                }
                break;
            case 'deviceStats':
                // Device chart removed
                break;
            case 'topPages':
                // Top pages chart removed
                break;
            case 'realTimeStats':
                this.analyticsData.quickStats = data;
                this.updateQuickStats();
                break;
            case 'interactionStats':
                this.analyticsData.interactionStats = data;
                this.updateInteractionMetrics();
                break;
            case 'featureStats':
                this.analyticsData.featureStats = data;
                this.updateFeatureMetrics();
                break;
        }
    }

    handleJourneyUpdate(journeyData) {
        // Handle journey analysis updates
        this.analyticsData.journeyData = journeyData;
        this.updateJourneyInsights();
    }

    updateInteractionMetrics() {
        // Update interaction-related metrics in the dashboard
        const stats = this.analyticsData.interactionStats;
        if (!stats) return;

        // Update engagement score display
        const engagementElement = document.getElementById('engagement-score');
        if (engagementElement) {
            engagementElement.textContent = Math.round(stats.avgEngagementScore);
        }

        // Update interaction counts
        const interactionCountElement = document.getElementById('interaction-count');
        if (interactionCountElement) {
            interactionCountElement.textContent = stats.totalInteractions;
        }

        console.log('📊 Interaction metrics updated:', stats);
    }

    updateFeatureMetrics() {
        // Update feature usage metrics
        const stats = this.analyticsData.featureStats;
        if (!stats) return;

        // Update feature count display
        const featureCountElement = document.getElementById('features-used');
        if (featureCountElement) {
            featureCountElement.textContent = stats.totalFeatures;
        }

        console.log('🎯 Feature metrics updated:', stats);
    }

    updateJourneyInsights() {
        // Update journey analysis insights
        const journeyData = this.analyticsData.journeyData;
        if (!journeyData) return;

        console.log('🗺️ Journey insights updated:', journeyData.summary);
    }
    
    setupTimeRangeSelector() {
        const timeRangeBtns = document.querySelectorAll('.time-range-btn');
        timeRangeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('📅 Time range button clicked:', e.target.dataset.range);

                // Remove active class from all buttons
                timeRangeBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');

                const newRange = e.target.dataset.range;

                // Handle custom date range
                if (newRange === 'custom') {
                    this.showCustomDatePicker();
                    return;
                }

                this.currentTimeRange = newRange;
                console.log('📊 Updating charts for time range:', this.currentTimeRange);
                this.updateChartsForTimeRange();

                // Show loading indicator
                this.showLoadingIndicator();
            });
        });
    }

    showCustomDatePicker() {
        // Create custom date picker modal
        const modal = document.createElement('div');
        modal.className = 'custom-date-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Select Custom Date Range</h3>
                    <button class="modal-close" onclick="closeCustomDateModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="date-inputs">
                        <div class="date-input-group">
                            <label for="start-date">Start Date:</label>
                            <input type="date" id="start-date" value="${this.getDefaultStartDate()}">
                        </div>
                        <div class="date-input-group">
                            <label for="end-date">End Date:</label>
                            <input type="date" id="end-date" value="${this.getDefaultEndDate()}">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeCustomDateModal()">Cancel</button>
                    <button class="btn-primary" onclick="applyCustomDateRange()">Apply</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    getDefaultStartDate() {
        const date = new Date();
        date.setDate(date.getDate() - 30); // 30 days ago
        return date.toISOString().split('T')[0];
    }

    getDefaultEndDate() {
        const date = new Date();
        return date.toISOString().split('T')[0];
    }

    showLoadingIndicator() {
        // Show loading spinner on charts
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'chart-loading';
            loadingDiv.innerHTML = '<div class="loading-spinner"></div><span>Loading data...</span>';
            container.appendChild(loadingDiv);

            // Remove loading after 2 seconds
            setTimeout(() => {
                loadingDiv.remove();
            }, 2000);
        });
    }
    
    generateInitialData() {
        const now = new Date();
        const dataPoints = this.getDataPointsForRange(this.currentTimeRange);
        
        // Generate user activity data
        this.analyticsData.userActivity = [];
        for (let i = dataPoints - 1; i >= 0; i--) {
            const time = new Date(now.getTime() - i * this.getIntervalForRange(this.currentTimeRange));
            const hour = time.getHours();
            
            // Simulate realistic user activity patterns
            const baseUsers = this.getBaseUsersForHour(hour);
            const activeUsers = baseUsers + Math.floor(Math.random() * 20) - 10;
            const pageViews = activeUsers * (2 + Math.random() * 3);
            
            this.analyticsData.userActivity.push({
                time: time,
                activeUsers: Math.max(0, activeUsers),
                pageViews: Math.max(0, Math.floor(pageViews))
            });
        }
        
        // Generate performance data
        this.analyticsData.performance = [];
        for (let i = dataPoints - 1; i >= 0; i--) {
            const time = new Date(now.getTime() - i * this.getIntervalForRange(this.currentTimeRange));
            
            this.analyticsData.performance.push({
                time: time,
                loadTime: 800 + Math.random() * 1200, // 800-2000ms
                responseTime: 50 + Math.random() * 200  // 50-250ms
            });
        }
        
        // Generate device data
        this.analyticsData.devices = {
            'Desktop': 45 + Math.random() * 10,
            'Mobile': 35 + Math.random() * 10,
            'Tablet': 15 + Math.random() * 5,
            'Other': 5 + Math.random() * 3
        };
        
        // Generate top pages data
        this.analyticsData.topPages = {
            '/dashboard': 1200 + Math.floor(Math.random() * 300),
            '/projects': 800 + Math.floor(Math.random() * 200),
            '/analytics': 600 + Math.floor(Math.random() * 150),
            '/settings': 400 + Math.floor(Math.random() * 100),
            '/profile': 300 + Math.floor(Math.random() * 80)
        };
    }
    
    getDataPointsForRange(range) {
        switch (range) {
            case '24h': return 24;
            case '7d': return 7;
            case '30d': return 30;
            default: return 24;
        }
    }
    
    getIntervalForRange(range) {
        switch (range) {
            case '24h': return 60 * 60 * 1000; // 1 hour
            case '7d': return 24 * 60 * 60 * 1000; // 1 day
            case '30d': return 24 * 60 * 60 * 1000; // 1 day
            default: return 60 * 60 * 1000;
        }
    }
    
    getBaseUsersForHour(hour) {
        // Simulate realistic user activity throughout the day
        if (hour >= 9 && hour <= 17) {
            return 80 + Math.floor(Math.random() * 40); // Work hours: 80-120 users
        } else if (hour >= 18 && hour <= 22) {
            return 60 + Math.floor(Math.random() * 30); // Evening: 60-90 users
        } else {
            return 20 + Math.floor(Math.random() * 20); // Night/early morning: 20-40 users
        }
    }
    
    createCharts() {
        this.createUserActivityChart();
        this.createPerformanceChart();

        // Add data source indicators to each chart
        this.addChartDataIndicators();
    }
    
    createUserActivityChart() {
        const ctx = document.getElementById('user-activity-chart');
        if (!ctx) return;

        console.log('📈 Creating User Activity chart with', this.analyticsData.userActivity.length, 'data points');

        const labels = this.analyticsData.userActivity.map(d =>
            this.currentTimeRange === '24h'
                ? d.time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                : d.time.toLocaleDateString()
        );
        
        this.charts.userActivity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Active Users',
                    data: this.analyticsData.userActivity.map(d => d.activeUsers),
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Page Views',
                    data: this.analyticsData.userActivity.map(d => d.pageViews),
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }
    
    createPerformanceChart() {
        const ctx = document.getElementById('performance-chart');
        if (!ctx) return;

        console.log('⚡ Creating Performance chart with', this.analyticsData.performance.length, 'data points');

        const labels = this.analyticsData.performance.map(d =>
            this.currentTimeRange === '24h'
                ? d.time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                : d.time.toLocaleDateString()
        );
        
        this.charts.performance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Load Time (ms)',
                    data: this.analyticsData.performance.map(d => d.loadTime),
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                }, {
                    label: 'API Response (ms)',
                    data: this.analyticsData.performance.map(d => d.responseTime),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Load Time (ms)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'API Response (ms)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }
    

    
    updateQuickStats() {
        const stats = this.analyticsData.quickStats || {};

        // Update top dashboard stats if analytics is managing them
        if (window.updateTopStatsDisplay && typeof window.updateTopStatsDisplay === 'function') {
            window.updateTopStatsDisplay(stats);
        }

        // Log analytics data for debugging
        console.log('📊 Analytics quick stats updated:', stats);
    }

    calculateErrorCount(stats) {
        // Use real error data if available
        if (stats.errorStats && stats.errorStats.totalErrors !== undefined) {
            return stats.errorStats.totalErrors;
        }

        // Fallback to estimation
        const baseErrorRate = 0.02; // 2% base error rate
        const performanceFactor = (stats.avgLoadTime || 1000) > 3000 ? 1.5 : 1;
        const estimatedErrors = Math.floor((stats.totalPageViews || 0) * baseErrorRate * performanceFactor);
        return Math.min(estimatedErrors, 99); // Cap at 99
    }

    calculateUptime(stats) {
        // Use real API success rate if available
        if (stats.apiStats && stats.apiStats.successRate !== undefined) {
            return Math.max(95, Math.min(99.9, stats.apiStats.successRate.toFixed(1)));
        }

        // Use health score if available
        if (stats.healthScore !== undefined) {
            return Math.max(95, Math.min(99.9, stats.healthScore.toFixed(1)));
        }

        // Fallback calculation
        const totalRequests = stats.totalPageViews || 1;
        const errors = this.calculateErrorCount(stats);
        const successRate = ((totalRequests - errors) / totalRequests) * 100;
        return Math.max(95, Math.min(99.9, successRate.toFixed(1)));
    }

    updateChangeIndicators(stats) {
        // Update percentage change indicators (simplified for now)
        const usersChangeElement = document.getElementById('users-change');
        const loadTimeChangeElement = document.getElementById('load-time-change');
        const uptimeChangeElement = document.getElementById('uptime-change');
        const errorsChangeElement = document.getElementById('errors-change');

        // For now, show static positive changes - in real implementation,
        // you would compare with previous period data
        if (usersChangeElement) {
            const change = this.calculateUserGrowth(stats);
            usersChangeElement.textContent = change >= 0 ? `+${change}%` : `${change}%`;
            usersChangeElement.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
        }

        if (loadTimeChangeElement) {
            const change = this.calculatePerformanceChange(stats);
            loadTimeChangeElement.textContent = change >= 0 ? `+${change}%` : `${change}%`;
            loadTimeChangeElement.className = `stat-change ${change <= 0 ? 'positive' : 'negative'}`;
        }
    }

    calculateUserGrowth(stats) {
        // Simplified growth calculation - in real implementation,
        // compare with previous period
        const newUsers = stats.newUsers || 0;
        const returningUsers = stats.returningUsers || 0;
        const total = newUsers + returningUsers;

        if (total === 0) return 0;
        return Math.round((newUsers / total) * 100) - 50; // Simplified calculation
    }

    calculatePerformanceChange(stats) {
        // Use real API response time if available
        if (stats.apiStats && stats.apiStats.avgResponseTime !== undefined) {
            const avgResponseTime = stats.apiStats.avgResponseTime;
            const baseline = 1000; // 1 second baseline
            return Math.round(((avgResponseTime - baseline) / baseline) * 100);
        }

        // Fallback to page load time
        const avgLoadTime = stats.avgLoadTime || 1000;
        const baseline = 1500; // Baseline load time

        return Math.round(((avgLoadTime - baseline) / baseline) * 100);
    }
    
    async updateChartsForTimeRange() {
        console.log('📊 Updating charts for time range:', this.currentTimeRange);

        if (this.useRealData && window.realAnalyticsProcessor) {
            // Get real data for new time range
            let realData;
            if (this.currentTimeRange === 'custom') {
                realData = window.realAnalyticsProcessor.getDataForTimeRange(
                    this.currentTimeRange,
                    this.customStartDate,
                    this.customEndDate
                );
            } else {
                realData = window.realAnalyticsProcessor.getDataForTimeRange(this.currentTimeRange);
            }

            this.analyticsData.userActivity = realData.userActivity || [];
            this.analyticsData.performance = realData.performance || [];

            console.log('📊 Updated analytics data:', {
                userActivity: this.analyticsData.userActivity.length,
                performance: this.analyticsData.performance.length
            });
        } else {
            // Try backend API as fallback
            try {
                const response = await fetch(`/api/analytics/combined?range=${this.currentTimeRange}`);
                if (response.ok) {
                    const apiData = await response.json();
                    if (apiData.success) {
                        this.analyticsData.userActivity = apiData.userActivity || [];
                        this.analyticsData.performance = apiData.performance || [];
                        console.log('📊 Updated with backend API data for range:', this.currentTimeRange);
                    } else {
                        throw new Error('API returned error');
                    }
                } else {
                    throw new Error('API not available');
                }
            } catch (error) {
                // Final fallback to dummy data
                console.log('📊 Using dummy data (backend API not available):', error.message);
                this.generateInitialData();
            }
        }

        // Destroy existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
                console.log('🗑️ Destroyed chart:', chart.constructor.name);
            }
        });

        // Clear charts object
        this.charts = {};

        // Recreate charts with new data
        console.log('🔄 Recreating charts...');
        this.createCharts();
        this.updateQuickStats();

        console.log('✅ Charts updated for time range:', this.currentTimeRange);
    }

    updateActiveUsersDisplay(count) {
        const activeUsersElement = document.getElementById('active-users-count');
        if (activeUsersElement) {
            activeUsersElement.textContent = count;
        }
    }

    updateUserActivityChart() {
        if (!this.charts.userActivity || !this.analyticsData.userActivity) return;

        const labels = this.analyticsData.userActivity.map(d => {
            const time = new Date(d.time);
            return this.currentTimeRange === '24h'
                ? time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                : time.toLocaleDateString();
        });

        this.charts.userActivity.data.labels = labels;
        this.charts.userActivity.data.datasets[0].data = this.analyticsData.userActivity.map(d => d.activeUsers || 0);
        this.charts.userActivity.data.datasets[1].data = this.analyticsData.userActivity.map(d => d.pageViews || 0);
        this.charts.userActivity.update('none');
    }

    updatePerformanceChart() {
        if (!this.charts.performance || !this.analyticsData.performance) return;

        const labels = this.analyticsData.performance.map(d => {
            const time = new Date(d.time);
            return this.currentTimeRange === '24h'
                ? time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                : time.toLocaleDateString();
        });

        this.charts.performance.data.labels = labels;
        this.charts.performance.data.datasets[0].data = this.analyticsData.performance.map(d => d.avgLoadTime || 0);
        this.charts.performance.data.datasets[1].data = this.analyticsData.performance.map(d => d.avgResponse || d.avgRequest || 0);
        this.charts.performance.update('none');
    }


    
    startRealTimeUpdates() {
        // Update data every 30 seconds
        this.updateInterval = setInterval(() => {
            this.updateRealTimeData();
        }, 30000);
    }
    
    async updateRealTimeData() {
        if (this.currentTimeRange !== '24h') return; // Only update for real-time view

        // Try to get real-time data first
        if (this.useRealData && window.realAnalyticsProcessor) {
            try {
                const realStats = window.realAnalyticsProcessor.getRealTimeStats();
                if (realStats && Object.keys(realStats).length > 0) {
                    // Update with real data
                    this.analyticsData.quickStats = realStats;
                    this.updateQuickStats();
                    console.log('📊 Updated with real-time data');
                    return;
                }
            } catch (error) {
                console.warn('⚠️ Error getting real-time data:', error);
            }
        }

        // Try backend API as fallback
        try {
            const response = await fetch(`/api/analytics/combined?range=${this.currentTimeRange}`);
            if (response.ok) {
                const apiData = await response.json();
                if (apiData.success) {
                    // Update chart data
                    this.analyticsData.userActivity = apiData.userActivity;
                    this.analyticsData.performance = apiData.performance;

                    // Generate quick stats from new data
                    this.analyticsData.quickStats = this.generateQuickStatsFromData();
                    this.analyticsData.quickStats.dataSource = 'backend_api';

                    // Update charts and stats
                    this.updateChartsData();
                    this.updateQuickStats();
                    console.log('📊 Updated with backend API data');
                    return;
                }
            }
        } catch (error) {
            console.warn('⚠️ Backend API not available for real-time updates');
        }

        // Fallback to dummy data updates
        const now = new Date();
        const hour = now.getHours();

        // Add new data point
        const newUserData = {
            time: now,
            activeUsers: this.getBaseUsersForHour(hour) + Math.floor(Math.random() * 20) - 10,
            pageViews: 0
        };
        newUserData.pageViews = newUserData.activeUsers * (2 + Math.random() * 3);

        const newPerfData = {
            time: now,
            loadTime: 800 + Math.random() * 1200,
            responseTime: 50 + Math.random() * 200
        };

        // Update arrays (keep last 24 points for 24h view)
        this.analyticsData.userActivity.push(newUserData);
        this.analyticsData.performance.push(newPerfData);

        // Device and pages charts removed - focusing on user activity and performance only
        
        if (this.analyticsData.userActivity.length > 24) {
            this.analyticsData.userActivity.shift();
            this.analyticsData.performance.shift();
        }
        
        // Update charts
        this.updateChartsData();
        this.updateQuickStats();

        // Refresh chart indicators to show current data source
        this.addChartDataIndicators();
    }
    
    updateChartsData() {
        // Update user activity chart
        if (this.charts.userActivity) {
            const labels = this.analyticsData.userActivity.map(d => 
                d.time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
            );
            
            this.charts.userActivity.data.labels = labels;
            this.charts.userActivity.data.datasets[0].data = this.analyticsData.userActivity.map(d => d.activeUsers);
            this.charts.userActivity.data.datasets[1].data = this.analyticsData.userActivity.map(d => d.pageViews);
            this.charts.userActivity.update('none');
        }
        
        // Update performance chart
        if (this.charts.performance) {
            const labels = this.analyticsData.performance.map(d => 
                d.time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
            );
            
            this.charts.performance.data.labels = labels;
            this.charts.performance.data.datasets[0].data = this.analyticsData.performance.map(d => d.loadTime);
            this.charts.performance.data.datasets[1].data = this.analyticsData.performance.map(d => d.responseTime);
            this.charts.performance.update('none');
        }
    }
    
    setCustomDateRange(startDate, endDate) {
        console.log('📅 Setting custom date range:', startDate, 'to', endDate);

        this.currentTimeRange = 'custom';
        this.customStartDate = new Date(startDate);
        this.customEndDate = new Date(endDate);

        // Update button text to show custom range
        const customBtn = document.querySelector('.time-range-btn[data-range="custom"]');
        if (customBtn) {
            customBtn.textContent = `${startDate} to ${endDate}`;
            customBtn.classList.add('active');
        }

        // Update charts with custom range
        this.updateChartsForTimeRange();
    }

    async exportToExcel() {
        console.log('📊 Generating Excel export...');

        try {
            // Gather all analytics data
            const exportData = await this.gatherExportData();

            // Create Excel workbook
            const workbook = this.createExcelWorkbook(exportData);

            // Generate filename with timestamp and date range
            const filename = this.generateExportFilename();

            // Download the file
            this.downloadExcelFile(workbook, filename);

            showToast('Analytics report exported successfully!', 'success');
            console.log('✅ Excel export completed:', filename);

        } catch (error) {
            console.error('❌ Excel export failed:', error);
            throw new Error('Failed to export analytics data');
        }
    }

    async gatherExportData() {
        console.log('📊 Gathering export data for range:', this.currentTimeRange);

        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                timeRange: this.currentTimeRange,
                startDate: this.getExportStartDate(),
                endDate: this.getExportEndDate(),
                generatedBy: 'Divyadrishti Analytics System'
            },
            summary: {},
            userActivity: [],
            performance: [],
            deviceStats: {},
            topPages: {},
            interactions: [],
            errors: [],
            journeyData: {}
        };

        // Get real-time stats
        if (window.realAnalyticsProcessor) {
            const stats = window.realAnalyticsProcessor.getRealTimeStats();
            exportData.summary = {
                activeUsers: stats.activeUsers || 0,
                totalPageViews: stats.totalPageViews || 0,
                uniqueUsers: stats.uniqueUsers || 0,
                avgLoadTime: Math.round(stats.avgLoadTime || 0),
                avgSessionDuration: Math.round(stats.avgSessionDuration || 0),
                bounceRate: Math.round(stats.bounceRate || 0),
                errorRate: stats.errorStats?.errorRate || 0,
                performanceScore: stats.healthScore || 0
            };

            exportData.deviceStats = stats.deviceBreakdown || {};
            exportData.topPages = stats.topPages || {};
        }

        // Get chart data
        exportData.userActivity = this.analyticsData.userActivity || [];
        exportData.performance = this.analyticsData.performance || [];

        // Get interaction data
        if (window.interactionTracker) {
            const interactionStats = window.interactionTracker.getInteractionStats();
            exportData.interactions = [{
                totalInteractions: interactionStats.totalInteractions,
                clickCount: interactionStats.clickCount,
                scrollCount: interactionStats.scrollCount,
                formInteractions: interactionStats.formInteractions,
                engagementScore: interactionStats.engagementScore,
                timeOnPage: Math.round(interactionStats.timeOnPage / 1000), // Convert to seconds
                maxScrollDepth: interactionStats.maxScrollDepth,
                featuresUsed: interactionStats.featuresUsed
            }];
        }

        // Get error data
        if (window.errorTracker) {
            const errorStats = window.errorTracker.getErrorStats();
            exportData.errors = [{
                totalErrors: errorStats.totalErrors,
                errorsByType: errorStats.errorsByType,
                errorsBySeverity: errorStats.errorsBySeverity,
                criticalErrors: errorStats.criticalErrors
            }];
        }

        // Get journey data
        if (window.journeyAnalyzer) {
            const journeyInsights = window.journeyAnalyzer.getJourneyInsights();
            exportData.journeyData = journeyInsights.summary || {};
        }

        return exportData;
    }

    createExcelWorkbook(data) {
        console.log('📊 Creating Excel workbook...');

        // Create workbook structure (simplified - in real implementation you'd use a library like SheetJS)
        const workbook = {
            sheets: {
                'Summary': this.createSummarySheet(data),
                'User Activity': this.createUserActivitySheet(data),
                'Performance': this.createPerformanceSheet(data),
                'Device Stats': this.createDeviceStatsSheet(data),
                'Top Pages': this.createTopPagesSheet(data),
                'Interactions': this.createInteractionsSheet(data),
                'Errors': this.createErrorsSheet(data),
                'Journey Analysis': this.createJourneySheet(data)
            },
            metadata: data.metadata
        };

        return workbook;
    }

    createSummarySheet(data) {
        return {
            name: 'Summary',
            data: [
                ['Metric', 'Value'],
                ['Export Date', data.metadata.exportDate],
                ['Time Range', data.metadata.timeRange],
                ['Start Date', data.metadata.startDate],
                ['End Date', data.metadata.endDate],
                [''],
                ['Active Users', data.summary.activeUsers],
                ['Total Page Views', data.summary.totalPageViews],
                ['Unique Users', data.summary.uniqueUsers],
                ['Average Load Time (ms)', data.summary.avgLoadTime],
                ['Average Session Duration (ms)', data.summary.avgSessionDuration],
                ['Bounce Rate (%)', data.summary.bounceRate],
                ['Error Rate (per hour)', data.summary.errorRate],
                ['Performance Score', data.summary.performanceScore]
            ]
        };
    }

    createUserActivitySheet(data) {
        const headers = ['Time', 'Active Users', 'Page Views'];
        const rows = data.userActivity.map(item => [
            new Date(item.time).toLocaleString(),
            item.activeUsers || 0,
            item.pageViews || 0
        ]);

        return {
            name: 'User Activity',
            data: [headers, ...rows]
        };
    }

    createPerformanceSheet(data) {
        const headers = ['Time', 'Load Time (ms)', 'API Response (ms)'];
        const rows = data.performance.map(item => [
            new Date(item.time).toLocaleString(),
            Math.round(item.avgLoadTime || 0),
            Math.round(item.avgResponse || item.avgRequest || 0)
        ]);

        return {
            name: 'Performance',
            data: [headers, ...rows]
        };
    }

    createDeviceStatsSheet(data) {
        const headers = ['Device Type', 'Percentage'];
        const rows = Object.entries(data.deviceStats).map(([device, percentage]) => [
            device,
            percentage
        ]);

        return {
            name: 'Device Stats',
            data: [headers, ...rows]
        };
    }

    createTopPagesSheet(data) {
        const headers = ['Page', 'Views'];
        const rows = Object.entries(data.topPages).map(([page, views]) => [
            page,
            views
        ]);

        return {
            name: 'Top Pages',
            data: [headers, ...rows]
        };
    }

    createInteractionsSheet(data) {
        if (data.interactions.length === 0) {
            return {
                name: 'Interactions',
                data: [['No interaction data available']]
            };
        }

        const interaction = data.interactions[0];
        return {
            name: 'Interactions',
            data: [
                ['Metric', 'Value'],
                ['Total Interactions', interaction.totalInteractions],
                ['Click Count', interaction.clickCount],
                ['Scroll Count', interaction.scrollCount],
                ['Form Interactions', interaction.formInteractions],
                ['Engagement Score', interaction.engagementScore],
                ['Time on Page (seconds)', interaction.timeOnPage],
                ['Max Scroll Depth (%)', interaction.maxScrollDepth],
                ['Features Used', interaction.featuresUsed]
            ]
        };
    }

    createErrorsSheet(data) {
        if (data.errors.length === 0) {
            return {
                name: 'Errors',
                data: [['No error data available']]
            };
        }

        const error = data.errors[0];
        const errorTypeRows = Object.entries(error.errorsByType || {}).map(([type, count]) => [
            type, count
        ]);

        return {
            name: 'Errors',
            data: [
                ['Error Summary'],
                ['Total Errors', error.totalErrors],
                ['Critical Errors', error.criticalErrors],
                [''],
                ['Error Types', 'Count'],
                ...errorTypeRows
            ]
        };
    }

    createJourneySheet(data) {
        return {
            name: 'Journey Analysis',
            data: [
                ['Metric', 'Value'],
                ['Total Journeys', data.journeyData.totalJourneys || 0],
                ['Average Journey Length', data.journeyData.avgJourneyLength || 0],
                ['Engagement Distribution', JSON.stringify(data.journeyData.engagementDistribution || {})],
                ['Conversion Rates', JSON.stringify(data.journeyData.conversionRates || {})]
            ]
        };
    }

    generateExportFilename() {
        const now = new Date();
        const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeRange = this.currentTimeRange;

        return `Analytics_Report_${timeRange}_${timestamp}.csv`;
    }

    downloadExcelFile(workbook, filename) {
        console.log('📊 Converting to CSV and downloading...');

        // Convert to CSV format (simplified Excel export)
        let csvContent = '';

        // Add metadata
        csvContent += `Analytics Report\n`;
        csvContent += `Generated: ${workbook.metadata.exportDate}\n`;
        csvContent += `Time Range: ${workbook.metadata.timeRange}\n`;
        csvContent += `Period: ${workbook.metadata.startDate} to ${workbook.metadata.endDate}\n\n`;

        // Add each sheet
        Object.entries(workbook.sheets).forEach(([sheetName, sheet]) => {
            csvContent += `\n=== ${sheetName} ===\n`;
            sheet.data.forEach(row => {
                csvContent += row.join(',') + '\n';
            });
            csvContent += '\n';
        });

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    getExportStartDate() {
        if (this.currentTimeRange === 'custom' && this.customStartDate) {
            return this.customStartDate.toISOString().split('T')[0];
        }

        const now = new Date();
        switch (this.currentTimeRange) {
            case '24h':
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                return yesterday.toISOString().split('T')[0];
            case '7d':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return weekAgo.toISOString().split('T')[0];
            case '30d':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return monthAgo.toISOString().split('T')[0];
            default:
                return now.toISOString().split('T')[0];
        }
    }

    getExportEndDate() {
        if (this.currentTimeRange === 'custom' && this.customEndDate) {
            return this.customEndDate.toISOString().split('T')[0];
        }

        return new Date().toISOString().split('T')[0];
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
    }
}

// Global functions for dashboard
async function exportAnalytics() {
    console.log('📊 Starting analytics export...');

    if (!window.analyticsManager) {
        showToast('Analytics system not ready', 'error');
        return;
    }

    try {
        // Show loading indicator
        const exportBtn = document.querySelector('.analytics-action-btn[onclick="exportAnalytics()"]');
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            exportBtn.disabled = true;
        }

        await window.analyticsManager.exportToExcel();

        // Reset button
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="fas fa-download"></i> Export';
            exportBtn.disabled = false;
        }

    } catch (error) {
        console.error('❌ Export failed:', error);
        showToast('Export failed: ' + error.message, 'error');

        // Reset button
        const exportBtn = document.querySelector('.analytics-action-btn[onclick="exportAnalytics()"]');
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="fas fa-download"></i> Export';
            exportBtn.disabled = false;
        }
    }
}

function refreshAnalytics() {
    console.log('🔄 Refreshing analytics...');

    if (!window.analyticsManager) {
        showToast('Analytics system not ready', 'error');
        return;
    }

    try {
        // Show loading indicator
        const refreshBtn = document.querySelector('.analytics-action-btn[onclick="refreshAnalytics()"]');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
        }

        window.analyticsManager.updateChartsForTimeRange();
        showToast('Analytics refreshed!', 'success');

        // Reset button after 2 seconds
        setTimeout(() => {
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                refreshBtn.disabled = false;
            }
        }, 2000);

    } catch (error) {
        console.error('❌ Refresh failed:', error);
        showToast('Refresh failed: ' + error.message, 'error');
    }
}

// Global function to close custom date modal
function closeCustomDateModal() {
    const modal = document.querySelector('.custom-date-modal');
    if (modal) {
        modal.remove();
    }
}

// Global function for custom date range
function applyCustomDateRange() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!startDate || !endDate) {
        showToast('Please select both start and end dates', 'error');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showToast('Start date must be before end date', 'error');
        return;
    }

    console.log('📅 Applying custom date range:', startDate, 'to', endDate);

    if (window.analyticsManager) {
        window.analyticsManager.setCustomDateRange(startDate, endDate);
        showToast(`Custom range applied: ${startDate} to ${endDate}`, 'success');
    }

    // Close the modal
    closeCustomDateModal();
}

// Initialize analytics when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.analyticsManager) {
        console.warn('⚠️ Analytics Manager already initialized');
        return;
    }

    // Wait for Chart.js to be loaded
    setTimeout(() => {
        try {
            if (typeof Chart !== 'undefined') {
                window.analyticsManager = new AnalyticsManager();
                console.warn('📊 Analytics Manager initialized');
            } else {
                console.warn('⚠️ Chart.js not loaded, analytics disabled');
            }
        } catch (error) {
            console.warn('❌ Failed to initialize Analytics Manager:', error.message);
        }
    }, 2000);
});
