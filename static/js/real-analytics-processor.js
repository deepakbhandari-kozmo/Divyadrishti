// Real Analytics Data Processor - Converts raw data to dashboard metrics
class RealAnalyticsProcessor {
    constructor() {
        this.listeners = [];
        this.cache = {
            activeUsers: 0,
            pageViews: [],
            performanceMetrics: [],
            deviceStats: {},
            topPages: {},
            userSessions: []
        };
        this.lastUpdate = null;
        this.updateInterval = null;
        
        this.init();
    }
    
    init() {
        console.log('🔄 Initializing Real Analytics Processor...');
        this.setupRealtimeListeners();
        this.startPeriodicUpdates();
    }
    
    setupRealtimeListeners() {
        if (!firebase || !firebase.firestore) {
            console.warn('⚠️ Firebase not available for real analytics');
            return;
        }
        
        const db = firebase.firestore();
        
        // Listen to active users
        const activeUsersListener = db.collection('active_users')
            .onSnapshot((snapshot) => {
                this.cache.activeUsers = snapshot.size;
                this.notifyUpdate('activeUsers', this.cache.activeUsers);
                console.log('👥 Active users updated:', this.cache.activeUsers);
            });
        
        this.listeners.push(activeUsersListener);
        
        // Listen to recent page views (last 24 hours)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const pageViewsListener = db.collection('page_views')
            .where('timestamp', '>=', yesterday)
            .orderBy('timestamp', 'desc')
            .limit(1000)
            .onSnapshot((snapshot) => {
                this.processPageViews(snapshot);
            });
        
        this.listeners.push(pageViewsListener);
        
        // Listen to recent performance metrics
        const performanceListener = db.collection('performance_metrics')
            .where('timestamp', '>=', yesterday)
            .orderBy('timestamp', 'desc')
            .limit(500)
            .onSnapshot((snapshot) => {
                this.processPerformanceMetrics(snapshot);
            });
        
        this.listeners.push(performanceListener);
        
        // Listen to user sessions (last 24 hours)
        const sessionsListener = db.collection('user_sessions')
            .where('startTime', '>=', yesterday)
            .orderBy('startTime', 'desc')
            .limit(1000)
            .onSnapshot((snapshot) => {
                this.processUserSessions(snapshot);
            });
        
        this.listeners.push(sessionsListener);

        // Listen to API metrics
        const apiMetricsListener = db.collection('api_metrics')
            .where('timestamp', '>=', yesterday)
            .orderBy('timestamp', 'desc')
            .limit(500)
            .onSnapshot((snapshot) => {
                this.processAPIMetrics(snapshot);
            });

        this.listeners.push(apiMetricsListener);

        // Listen to error logs
        const errorLogsListener = db.collection('error_logs')
            .where('timestamp', '>=', yesterday)
            .orderBy('timestamp', 'desc')
            .limit(200)
            .onSnapshot((snapshot) => {
                this.processErrorLogs(snapshot);
            });

        this.listeners.push(errorLogsListener);

        // Listen to user interactions for detailed analytics
        const interactionsListener = db.collection('user_interactions')
            .where('timestamp', '>=', yesterday)
            .orderBy('timestamp', 'desc')
            .limit(1000)
            .onSnapshot((snapshot) => {
                this.processDetailedInteractions(snapshot);
            });

        this.listeners.push(interactionsListener);

        // Listen to feature usage data
        const featureUsageListener = db.collection('feature_usage')
            .where('timestamp', '>=', yesterday)
            .onSnapshot((snapshot) => {
                this.processFeatureUsageData(snapshot);
            });

        this.listeners.push(featureUsageListener);
    }
    
    processPageViews(snapshot) {
        const pageViews = [];
        const pageStats = {};
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            pageViews.push({
                page: data.page,
                timestamp: data.timestamp.toDate(),
                loadTime: data.loadTime,
                userId: data.userId,
                sessionId: data.sessionId
            });
            
            // Count page visits
            pageStats[data.page] = (pageStats[data.page] || 0) + 1;
        });
        
        this.cache.pageViews = pageViews;
        this.cache.topPages = pageStats;
        
        // Generate hourly aggregation for charts
        const hourlyData = this.aggregateByHour(pageViews);
        this.notifyUpdate('pageViews', hourlyData);
        this.notifyUpdate('topPages', pageStats);
        
        console.log('📄 Page views processed:', pageViews.length);
    }
    
    processPerformanceMetrics(snapshot) {
        const metrics = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.type === 'navigation_timing' && data.metrics) {
                metrics.push({
                    timestamp: data.timestamp.toDate(),
                    totalTime: data.metrics.totalTime,
                    dnsLookup: data.metrics.dnsLookup,
                    tcpConnect: data.metrics.tcpConnect,
                    request: data.metrics.request,
                    response: data.metrics.response,
                    domProcessing: data.metrics.domProcessing,
                    page: data.page
                });
            }
        });
        
        this.cache.performanceMetrics = metrics;
        
        // Generate hourly performance aggregation
        const hourlyPerformance = this.aggregatePerformanceByHour(metrics);
        this.notifyUpdate('performance', hourlyPerformance);
        
        console.log('⚡ Performance metrics processed:', metrics.length);
    }
    
    processUserSessions(snapshot) {
        const sessions = [];
        const deviceStats = { desktop: 0, mobile: 0, tablet: 0, other: 0 };
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            sessions.push({
                sessionId: data.sessionId,
                userId: data.userId,
                startTime: data.startTime.toDate(),
                endTime: data.endTime ? data.endTime.toDate() : null,
                duration: data.duration,
                userAgent: data.userAgent,
                isReturningUser: data.isReturningUser,
                landingPage: data.landingPage
            });
            
            // Detect device type from user agent
            const userAgent = (data.userAgent || '').toLowerCase();
            if (/mobile|android|iphone|phone/i.test(userAgent)) {
                deviceStats.mobile++;
            } else if (/tablet|ipad/i.test(userAgent)) {
                deviceStats.tablet++;
            } else if (/desktop|windows|mac|linux/i.test(userAgent)) {
                deviceStats.desktop++;
            } else {
                deviceStats.other++;
            }
        });
        
        this.cache.userSessions = sessions;
        this.cache.deviceStats = deviceStats;
        
        this.notifyUpdate('deviceStats', deviceStats);
        this.notifyUpdate('userSessions', sessions);
        
        console.log('👤 User sessions processed:', sessions.length);
    }

    processAPIMetrics(snapshot) {
        const apiMetrics = [];
        const apiStats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            avgResponseTime: 0,
            slowCalls: 0
        };

        snapshot.forEach((doc) => {
            const data = doc.data();
            apiMetrics.push({
                url: data.url,
                method: data.method,
                status: data.status,
                duration: data.duration,
                success: data.success,
                timestamp: data.timestamp.toDate(),
                size: data.size || 0
            });

            // Update stats
            apiStats.totalCalls++;
            if (data.success) {
                apiStats.successfulCalls++;
            } else {
                apiStats.failedCalls++;
            }

            if (data.duration > 3000) {
                apiStats.slowCalls++;
            }
        });

        // Calculate averages
        if (apiMetrics.length > 0) {
            apiStats.avgResponseTime = apiMetrics.reduce((sum, api) => sum + api.duration, 0) / apiMetrics.length;
            apiStats.successRate = (apiStats.successfulCalls / apiStats.totalCalls) * 100;
            apiStats.slowCallsPercent = (apiStats.slowCalls / apiStats.totalCalls) * 100;
        }

        this.cache.apiMetrics = apiMetrics;
        this.cache.apiStats = apiStats;

        this.notifyUpdate('apiMetrics', apiStats);
        console.log('🌐 API metrics processed:', apiMetrics.length);
    }

    processErrorLogs(snapshot) {
        const errorLogs = [];
        const errorStats = {
            totalErrors: 0,
            errorsByType: {},
            errorsBySeverity: {},
            criticalErrors: 0,
            errorRate: 0
        };

        snapshot.forEach((doc) => {
            const data = doc.data();
            errorLogs.push({
                type: data.type,
                message: data.message,
                severity: data.severity || 'medium',
                page: data.url || data.page,
                timestamp: data.timestamp.toDate(),
                stack: data.stack,
                context: data.context
            });

            // Update stats
            errorStats.totalErrors++;
            errorStats.errorsByType[data.type] = (errorStats.errorsByType[data.type] || 0) + 1;
            errorStats.errorsBySeverity[data.severity || 'medium'] = (errorStats.errorsBySeverity[data.severity || 'medium'] || 0) + 1;

            if (data.severity === 'critical') {
                errorStats.criticalErrors++;
            }
        });

        // Calculate error rate (errors per hour)
        errorStats.errorRate = Math.round(errorStats.totalErrors / 24 * 100) / 100;

        this.cache.errorLogs = errorLogs;
        this.cache.errorStats = errorStats;

        this.notifyUpdate('errorStats', errorStats);
        console.log('🚨 Error logs processed:', errorLogs.length);
    }

    processDetailedInteractions(snapshot) {
        const interactions = [];
        const interactionStats = {
            totalInteractions: 0,
            clickCount: 0,
            scrollCount: 0,
            formInteractions: 0,
            featureUsageCount: 0,
            avgEngagementScore: 0,
            interactionsByType: {},
            interactionsByPage: {},
            hourlyDistribution: {}
        };

        snapshot.forEach((doc) => {
            const data = doc.data();
            interactions.push({
                sessionId: data.sessionId,
                userId: data.userId,
                type: data.type,
                page: data.page,
                timestamp: data.timestamp.toDate(),
                data: data.data || {},
                engagementScore: data.engagementScore || 0
            });

            // Update stats
            interactionStats.totalInteractions++;
            interactionStats.interactionsByType[data.type] = (interactionStats.interactionsByType[data.type] || 0) + 1;
            interactionStats.interactionsByPage[data.page] = (interactionStats.interactionsByPage[data.page] || 0) + 1;

            // Count specific interaction types
            if (data.type === 'click') interactionStats.clickCount++;
            if (data.type === 'scroll') interactionStats.scrollCount++;
            if (data.type.includes('form')) interactionStats.formInteractions++;
            if (data.type === 'feature_usage') interactionStats.featureUsageCount++;

            // Track hourly distribution
            const hour = data.timestamp.toDate().getHours();
            interactionStats.hourlyDistribution[hour] = (interactionStats.hourlyDistribution[hour] || 0) + 1;
        });

        // Calculate average engagement
        const engagementScores = interactions
            .map(i => i.engagementScore)
            .filter(score => score > 0);

        if (engagementScores.length > 0) {
            interactionStats.avgEngagementScore = engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length;
        }

        this.cache.detailedInteractions = interactions;
        this.cache.interactionStats = interactionStats;

        this.notifyUpdate('interactionStats', interactionStats);
        console.log('🎯 Detailed interactions processed:', interactions.length);
    }

    processFeatureUsageData(snapshot) {
        const featureUsageData = {};
        const featureStats = {
            totalFeatures: 0,
            mostUsedFeatures: {},
            featureAdoptionRates: {},
            avgFeaturesPerSession: 0
        };

        snapshot.forEach((doc) => {
            const data = doc.data();
            featureUsageData[data.sessionId] = {
                features: data.features || {},
                engagementScore: data.engagementScore || 0,
                page: data.page,
                timestamp: data.timestamp.toDate()
            };

            // Aggregate feature usage
            Object.entries(data.features || {}).forEach(([feature, featureData]) => {
                if (!featureStats.mostUsedFeatures[feature]) {
                    featureStats.mostUsedFeatures[feature] = {
                        totalUsage: 0,
                        uniqueUsers: new Set(),
                        avgUsagePerUser: 0
                    };
                }

                featureStats.mostUsedFeatures[feature].totalUsage += featureData.count || 0;
                featureStats.mostUsedFeatures[feature].uniqueUsers.add(data.sessionId);
            });
        });

        // Calculate feature statistics
        const totalSessions = Object.keys(featureUsageData).length;
        let totalFeaturesUsed = 0;

        Object.keys(featureStats.mostUsedFeatures).forEach(feature => {
            const featureData = featureStats.mostUsedFeatures[feature];
            const uniqueUsers = featureData.uniqueUsers.size;

            featureData.avgUsagePerUser = featureData.totalUsage / uniqueUsers;
            featureStats.featureAdoptionRates[feature] = (uniqueUsers / totalSessions) * 100;

            // Convert Set to count for storage
            featureData.uniqueUsers = uniqueUsers;
            totalFeaturesUsed++;
        });

        featureStats.totalFeatures = totalFeaturesUsed;
        featureStats.avgFeaturesPerSession = totalSessions > 0 ? totalFeaturesUsed / totalSessions : 0;

        this.cache.featureUsageData = featureUsageData;
        this.cache.featureStats = featureStats;

        this.notifyUpdate('featureStats', featureStats);
        console.log('🎯 Feature usage processed for', totalSessions, 'sessions');
    }
    
    aggregateByHour(data) {
        const hourlyData = {};
        const now = new Date();
        
        // Initialize last 24 hours
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
            const hourKey = hour.getHours();
            hourlyData[hourKey] = { hour: hourKey, count: 0, users: new Set() };
        }
        
        // Aggregate data by hour
        data.forEach(item => {
            const hour = item.timestamp.getHours();
            if (hourlyData[hour]) {
                hourlyData[hour].count++;
                if (item.userId) {
                    hourlyData[hour].users.add(item.userId);
                }
            }
        });
        
        // Convert to array format for charts
        return Object.values(hourlyData).map(item => ({
            hour: item.hour,
            pageViews: item.count,
            activeUsers: item.users.size,
            time: new Date().setHours(item.hour, 0, 0, 0)
        }));
    }
    
    aggregatePerformanceByHour(metrics) {
        const hourlyData = {};
        const now = new Date();
        
        // Initialize last 24 hours
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
            const hourKey = hour.getHours();
            hourlyData[hourKey] = { 
                hour: hourKey, 
                loadTimes: [], 
                dnsLookups: [],
                requests: [],
                responses: []
            };
        }
        
        // Aggregate metrics by hour
        metrics.forEach(metric => {
            const hour = metric.timestamp.getHours();
            if (hourlyData[hour]) {
                hourlyData[hour].loadTimes.push(metric.totalTime);
                hourlyData[hour].dnsLookups.push(metric.dnsLookup);
                hourlyData[hour].requests.push(metric.request);
                hourlyData[hour].responses.push(metric.response);
            }
        });
        
        // Calculate averages
        return Object.values(hourlyData).map(item => ({
            hour: item.hour,
            avgLoadTime: this.calculateAverage(item.loadTimes),
            avgDnsLookup: this.calculateAverage(item.dnsLookups),
            avgRequest: this.calculateAverage(item.requests),
            avgResponse: this.calculateAverage(item.responses),
            time: new Date().setHours(item.hour, 0, 0, 0)
        }));
    }
    
    calculateAverage(array) {
        if (array.length === 0) return 0;
        return array.reduce((sum, val) => sum + val, 0) / array.length;
    }
    
    // Get real-time statistics for dashboard
    getRealTimeStats() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Calculate stats from cached data
        const recentPageViews = this.cache.pageViews.filter(pv => pv.timestamp >= last24h);
        const recentSessions = this.cache.userSessions.filter(s => s.startTime >= last24h);
        const recentPerformance = this.cache.performanceMetrics.filter(pm => pm.timestamp >= last24h);
        
        const stats = {
            activeUsers: this.cache.activeUsers,
            totalPageViews: recentPageViews.length,
            uniqueUsers: new Set(recentPageViews.map(pv => pv.userId)).size,
            avgLoadTime: this.calculateAverage(recentPerformance.map(p => p.totalTime)),
            avgSessionDuration: this.calculateAverage(recentSessions.filter(s => s.duration).map(s => s.duration)),
            bounceRate: this.calculateBounceRate(recentSessions),
            topPages: this.getTopPages(5),
            deviceBreakdown: this.cache.deviceStats,
            newUsers: recentSessions.filter(s => !s.isReturningUser).length,
            returningUsers: recentSessions.filter(s => s.isReturningUser).length,

            // Enhanced performance metrics
            apiStats: this.cache.apiStats || {
                totalCalls: 0,
                successRate: 100,
                avgResponseTime: 0,
                slowCallsPercent: 0
            },

            // Error statistics
            errorStats: this.cache.errorStats || {
                totalErrors: 0,
                errorsByType: {},
                errorsBySeverity: {},
                criticalErrors: 0,
                errorRate: 0
            },

            // System health score
            healthScore: this.calculateHealthScore(),

            // Interaction analytics
            interactionStats: this.cache.interactionStats || {
                totalInteractions: 0,
                clickCount: 0,
                scrollCount: 0,
                formInteractions: 0,
                avgEngagementScore: 0
            },

            // Feature usage analytics
            featureStats: this.cache.featureStats || {
                totalFeatures: 0,
                mostUsedFeatures: {},
                avgFeaturesPerSession: 0
            },

            // User engagement metrics
            engagementMetrics: this.calculateEngagementMetrics()
        };
        
        return stats;
    }

    calculateHealthScore() {
        // Calculate overall system health score (0-100)
        let score = 100;

        // Deduct points for API issues
        const apiStats = this.cache.apiStats;
        if (apiStats) {
            if (apiStats.successRate < 95) score -= (95 - apiStats.successRate) * 2;
            if (apiStats.avgResponseTime > 2000) score -= Math.min(20, (apiStats.avgResponseTime - 2000) / 100);
            if (apiStats.slowCallsPercent > 10) score -= apiStats.slowCallsPercent;
        }

        // Deduct points for errors
        const errorStats = this.cache.errorStats;
        if (errorStats) {
            score -= Math.min(30, errorStats.totalErrors * 2);
            score -= errorStats.criticalErrors * 5;
        }

        // Deduct points for performance issues
        const recentPerformance = this.cache.performanceMetrics || [];
        if (recentPerformance.length > 0) {
            const avgLoadTime = this.calculateAverage(recentPerformance.map(p => p.totalTime));
            if (avgLoadTime > 3000) score -= Math.min(15, (avgLoadTime - 3000) / 200);
        }

        return Math.max(0, Math.round(score));
    }

    calculateEngagementMetrics() {
        const metrics = {
            avgEngagementScore: 0,
            highEngagementSessions: 0,
            mediumEngagementSessions: 0,
            lowEngagementSessions: 0,
            totalEngagedUsers: 0,
            engagementTrend: 'stable'
        };

        // Calculate from interaction stats
        if (this.cache.interactionStats) {
            metrics.avgEngagementScore = this.cache.interactionStats.avgEngagementScore || 0;
        }

        // Calculate from feature usage data
        if (this.cache.featureUsageData) {
            const sessions = Object.values(this.cache.featureUsageData);
            let highEngagement = 0;
            let mediumEngagement = 0;
            let lowEngagement = 0;

            sessions.forEach(session => {
                const engagement = session.engagementScore || 0;
                if (engagement > 70) {
                    highEngagement++;
                } else if (engagement > 40) {
                    mediumEngagement++;
                } else {
                    lowEngagement++;
                }
            });

            metrics.highEngagementSessions = highEngagement;
            metrics.mediumEngagementSessions = mediumEngagement;
            metrics.lowEngagementSessions = lowEngagement;
            metrics.totalEngagedUsers = sessions.length;

            // Simple trend calculation (could be enhanced with historical data)
            const engagementRatio = highEngagement / sessions.length;
            if (engagementRatio > 0.3) {
                metrics.engagementTrend = 'increasing';
            } else if (engagementRatio < 0.1) {
                metrics.engagementTrend = 'decreasing';
            }
        }

        return metrics;
    }
    
    calculateBounceRate(sessions) {
        if (sessions.length === 0) return 0;
        
        // Count sessions with only one page view
        const singlePageSessions = sessions.filter(session => {
            const sessionPageViews = this.cache.pageViews.filter(pv => pv.sessionId === session.sessionId);
            return sessionPageViews.length === 1;
        });
        
        return (singlePageSessions.length / sessions.length) * 100;
    }
    
    getTopPages(limit = 5) {
        const sortedPages = Object.entries(this.cache.topPages)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit);
        
        return Object.fromEntries(sortedPages);
    }
    
    // Get data for specific time range
    getDataForTimeRange(range, customStartDate = null, customEndDate = null) {
        console.log('📊 Getting data for time range:', range, customStartDate, customEndDate);

        const now = new Date();
        let startTime, endTime;

        if (range === 'custom' && customStartDate && customEndDate) {
            startTime = new Date(customStartDate);
            endTime = new Date(customEndDate);
            endTime.setHours(23, 59, 59, 999); // End of day
        } else {
            endTime = now;
            switch (range) {
                case '24h':
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }
        }

        console.log('📅 Date range:', startTime.toISOString(), 'to', endTime.toISOString());

        // Filter data by time range
        const filteredPageViews = this.cache.pageViews.filter(pv =>
            pv.timestamp >= startTime && pv.timestamp <= endTime
        );
        const filteredSessions = this.cache.userSessions.filter(s =>
            s.startTime >= startTime && s.startTime <= endTime
        );
        const filteredPerformance = this.cache.performanceMetrics.filter(pm =>
            pm.timestamp >= startTime && pm.timestamp <= endTime
        );

        console.log('📊 Filtered data:', {
            pageViews: filteredPageViews.length,
            sessions: filteredSessions.length,
            performance: filteredPerformance.length
        });

        // Aggregate based on time range
        if (range === '24h' || (range === 'custom' && this.isWithin24Hours(startTime, endTime))) {
            return {
                userActivity: this.aggregateByHour(filteredPageViews),
                performance: this.aggregatePerformanceByHour(filteredPerformance)
            };
        } else {
            return {
                userActivity: this.aggregateByDay(filteredPageViews),
                performance: this.aggregatePerformanceByDay(filteredPerformance)
            };
        }
    }

    isWithin24Hours(startTime, endTime) {
        const diffHours = (endTime - startTime) / (1000 * 60 * 60);
        return diffHours <= 24;
    }
    
    aggregateByDay(data) {
        // Similar to aggregateByHour but groups by day
        const dailyData = {};
        
        data.forEach(item => {
            const day = item.timestamp.toDateString();
            if (!dailyData[day]) {
                dailyData[day] = { day, count: 0, users: new Set() };
            }
            dailyData[day].count++;
            if (item.userId) {
                dailyData[day].users.add(item.userId);
            }
        });
        
        return Object.values(dailyData).map(item => ({
            day: item.day,
            pageViews: item.count,
            activeUsers: item.users.size,
            time: new Date(item.day).getTime()
        }));
    }
    
    aggregatePerformanceByDay(metrics) {
        const dailyData = {};
        
        metrics.forEach(metric => {
            const day = metric.timestamp.toDateString();
            if (!dailyData[day]) {
                dailyData[day] = { day, loadTimes: [] };
            }
            dailyData[day].loadTimes.push(metric.totalTime);
        });
        
        return Object.values(dailyData).map(item => ({
            day: item.day,
            avgLoadTime: this.calculateAverage(item.loadTimes),
            time: new Date(item.day).getTime()
        }));
    }
    
    startPeriodicUpdates() {
        // Update dashboard every 30 seconds
        this.updateInterval = setInterval(() => {
            this.notifyUpdate('realTimeStats', this.getRealTimeStats());
        }, 30000);
    }
    
    notifyUpdate(type, data) {
        // Notify analytics dashboard of data updates
        if (window.analyticsManager) {
            window.analyticsManager.handleRealDataUpdate(type, data);
        }
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('analyticsUpdate', {
            detail: { type, data }
        }));
    }
    
    destroy() {
        // Clean up listeners
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize real analytics processor
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.realAnalyticsProcessor) {
        console.warn('⚠️ Real Analytics Processor already initialized');
        return;
    }

    setTimeout(() => {
        try {
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
                window.realAnalyticsProcessor = new RealAnalyticsProcessor();
                console.warn('🔄 Real Analytics Processor initialized');
            } else {
                console.warn('⚠️ Firebase not available, processor disabled');
            }
        } catch (error) {
            console.warn('❌ Failed to initialize Real Analytics Processor:', error.message);
        }
    }, 4000);
});
