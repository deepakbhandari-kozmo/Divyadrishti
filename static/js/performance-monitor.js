// Enhanced Performance Monitoring System
class PerformanceMonitor {
    constructor() {
        this.apiCalls = [];
        this.errorLogs = [];
        this.resourceMetrics = [];
        this.networkMetrics = [];
        this.memoryMetrics = [];
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.sessionId = this.getSessionId();
        
        this.init();
    }
    
    init() {
        console.log('⚡ Initializing Enhanced Performance Monitor...');
        this.setupAPIMonitoring();
        this.setupErrorTracking();
        this.setupResourceMonitoring();
        this.setupMemoryMonitoring();
        this.setupNetworkMonitoring();
        this.startContinuousMonitoring();
    }
    
    getSessionId() {
        return window.realAnalytics?.sessionId || 'session_' + Date.now();
    }
    
    setupAPIMonitoring() {
        // Override fetch to monitor API calls
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = args[0];
            const options = args[1] || {};
            
            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                // Track API call performance
                this.trackAPICall({
                    url: typeof url === 'string' ? url : url.toString(),
                    method: options.method || 'GET',
                    status: response.status,
                    duration: duration,
                    success: response.ok,
                    timestamp: new Date(),
                    size: this.getResponseSize(response)
                });
                
                // Alert on slow API calls
                if (duration > 5000) {
                    this.trackPerformanceAlert('slow_api', {
                        url: url,
                        duration: duration,
                        threshold: 5000
                    });
                }
                
                return response;
            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                // Track failed API call
                this.trackAPICall({
                    url: typeof url === 'string' ? url : url.toString(),
                    method: options.method || 'GET',
                    status: 0,
                    duration: duration,
                    success: false,
                    error: error.message,
                    timestamp: new Date()
                });
                
                // Track API error
                this.trackError('api_error', error, {
                    url: url,
                    duration: duration
                });
                
                throw error;
            }
        };
    }
    
    setupErrorTracking() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.trackError('javascript_error', event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                message: event.message
            });
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError('promise_rejection', event.reason, {
                type: 'unhandled_promise_rejection'
            });
        });
        
        // Console error override disabled to prevent recursion
        // Note: Console error tracking disabled to prevent infinite loops
        // const originalConsoleError = console.error;
        // console.error = (...args) => {
        //     this.trackError('console_error', new Error(args.join(' ')), {
        //         arguments: args
        //     });
        //     originalConsoleError.apply(console, args);
        // };
    }
    
    setupResourceMonitoring() {
        // Monitor resource loading performance
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.entryType === 'resource') {
                            this.trackResourceMetric({
                                name: entry.name,
                                type: this.getResourceType(entry.name),
                                duration: entry.duration,
                                size: entry.transferSize || 0,
                                startTime: entry.startTime,
                                timestamp: new Date()
                            });
                            
                            // Alert on slow resources
                            if (entry.duration > 3000) {
                                this.trackPerformanceAlert('slow_resource', {
                                    resource: entry.name,
                                    duration: entry.duration,
                                    type: this.getResourceType(entry.name)
                                });
                            }
                        }
                    });
                });
                
                observer.observe({ entryTypes: ['resource'] });
            } catch (error) {
                console.log('Resource monitoring not supported:', error);
            }
        }
    }
    
    setupMemoryMonitoring() {
        // Monitor memory usage if available
        if ('memory' in performance) {
            setInterval(() => {
                const memInfo = performance.memory;
                const memoryMetric = {
                    usedJSHeapSize: memInfo.usedJSHeapSize,
                    totalJSHeapSize: memInfo.totalJSHeapSize,
                    jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
                    usagePercent: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100,
                    timestamp: new Date()
                };
                
                this.memoryMetrics.push(memoryMetric);
                
                // Keep only last 100 entries
                if (this.memoryMetrics.length > 100) {
                    this.memoryMetrics.shift();
                }
                
                // Alert on high memory usage
                if (memoryMetric.usagePercent > 90) {
                    this.trackPerformanceAlert('high_memory', {
                        usagePercent: memoryMetric.usagePercent,
                        usedMB: Math.round(memInfo.usedJSHeapSize / 1048576),
                        limitMB: Math.round(memInfo.jsHeapSizeLimit / 1048576)
                    });
                }
            }, 60000); // Check every 60 seconds (reduced frequency)
        }
    }
    
    setupNetworkMonitoring() {
        // Monitor network connection if available
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            const trackNetworkChange = () => {
                const networkMetric = {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData,
                    timestamp: new Date()
                };
                
                this.networkMetrics.push(networkMetric);
                
                // Alert on poor connection
                if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                    this.trackPerformanceAlert('poor_connection', {
                        effectiveType: connection.effectiveType,
                        downlink: connection.downlink,
                        rtt: connection.rtt
                    });
                }
            };
            
            // Track initial state
            trackNetworkChange();
            
            // Track changes
            connection.addEventListener('change', trackNetworkChange);
        }
    }
    
    startContinuousMonitoring() {
        this.isMonitoring = true;
        
        // Monitor page performance every 5 minutes (reduced to prevent quota exhaustion)
        this.monitoringInterval = setInterval(() => {
            this.collectPagePerformanceMetrics();
            this.uploadMetricsBatch();
        }, 300000); // 5 minutes instead of 30 seconds
    }
    
    collectPagePerformanceMetrics() {
        // Collect current page performance
        if ('performance' in window) {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                const pageMetric = {
                    page: window.location.pathname,
                    loadTime: navigation.loadEventEnd - navigation.navigationStart,
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
                    firstPaint: this.getFirstPaint(),
                    firstContentfulPaint: this.getFirstContentfulPaint(),
                    largestContentfulPaint: this.getLargestContentfulPaint(),
                    timestamp: new Date()
                };
                
                this.trackPagePerformance(pageMetric);
            }
        }
    }
    
    getFirstPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : null;
    }
    
    getFirstContentfulPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        return fcp ? fcp.startTime : null;
    }
    
    getLargestContentfulPaint() {
        // This would require PerformanceObserver for LCP
        return null; // Simplified for now
    }
    
    trackAPICall(apiData) {
        this.apiCalls.push({
            sessionId: this.sessionId,
            ...apiData
        });
        
        // Upload in batches
        if (this.apiCalls.length >= 10) {
            this.uploadAPIMetrics();
        }
    }
    
    trackError(type, error, context = {}) {
        const errorData = {
            sessionId: this.sessionId,
            type: type,
            message: error.message || error.toString(),
            stack: error.stack,
            page: window.location.pathname,
            userAgent: navigator.userAgent,
            timestamp: new Date(),
            context: context
        };
        
        this.errorLogs.push(errorData);
        
        // Upload errors immediately for critical issues
        if (type === 'javascript_error' || type === 'api_error') {
            this.uploadErrorLogs();
        }
    }
    
    trackResourceMetric(resourceData) {
        this.resourceMetrics.push({
            sessionId: this.sessionId,
            ...resourceData
        });
        
        // Keep only recent metrics
        if (this.resourceMetrics.length > 50) {
            this.resourceMetrics.shift();
        }
    }
    
    trackPagePerformance(pageData) {
        // Save to Firestore
        this.saveToFirestore('page_performance', {
            sessionId: this.sessionId,
            ...pageData
        });
    }
    
    trackPerformanceAlert(alertType, data) {
        const alert = {
            sessionId: this.sessionId,
            type: alertType,
            page: window.location.pathname,
            timestamp: new Date(),
            data: data
        };
        
        // Save alert and potentially create notification
        this.saveToFirestore('performance_alerts', alert);
        
        // Create notification for critical performance issues
        if (alertType === 'slow_api' || alertType === 'high_memory') {
            this.createPerformanceNotification(alertType, data);
        }
    }
    
    async createPerformanceNotification(alertType, data) {
        // Disabled automatic performance notifications for analytics system
        // Performance data is now displayed in the analytics dashboard instead of creating notifications
        // This prevents spam and focuses notifications on actionable system issues

        if (!window.notificationManager) return;

        // Only create notifications for truly critical performance issues
        const criticalNotifications = {
            high_memory: {
                type: 'error',
                title: 'Critical Memory Usage',
                message: `Memory usage is critically high: ${Math.round(data.usagePercent)}% (${data.usedMB}MB)`,
                priority: 'critical',
                category: 'system'
            }
        };

        // Only notify for critical memory issues (>95%)
        if (alertType === 'high_memory' && data.usagePercent > 95) {
            const notification = criticalNotifications[alertType];
            if (notification) {
                await window.notificationManager.createNotification(notification);
            }
        }

        // All other performance data is available in the analytics dashboard
        // without creating repetitive notifications
    }
    
    getResourceType(url) {
        if (url.includes('.css')) return 'css';
        if (url.includes('.js')) return 'javascript';
        if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return 'image';
        if (url.includes('/api/')) return 'api';
        if (url.includes('.woff') || url.includes('.ttf')) return 'font';
        return 'other';
    }
    
    getResponseSize(response) {
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength) : 0;
    }
    
    async uploadAPIMetrics() {
        if (this.apiCalls.length === 0) return;
        
        try {
            const batch = firebase.firestore().batch();
            const apiRef = firebase.firestore().collection('api_metrics');
            
            this.apiCalls.forEach((apiCall, index) => {
                const docId = `${this.sessionId}_${Date.now()}_${index}`;
                batch.set(apiRef.doc(docId), apiCall);
            });
            
            await batch.commit();
            console.log(`✅ Uploaded ${this.apiCalls.length} API metrics`);
            this.apiCalls = [];
        } catch (error) {
            console.warn('❌ Error uploading API metrics:', error.message);
        }
    }
    
    async uploadErrorLogs() {
        if (this.errorLogs.length === 0) return;
        
        try {
            const batch = firebase.firestore().batch();
            const errorRef = firebase.firestore().collection('error_logs');
            
            this.errorLogs.forEach((errorLog, index) => {
                const docId = `${this.sessionId}_${Date.now()}_${index}`;
                batch.set(errorRef.doc(docId), errorLog);
            });
            
            await batch.commit();
            console.log(`✅ Uploaded ${this.errorLogs.length} error logs`);
            this.errorLogs = [];
        } catch (error) {
            console.warn('❌ Error uploading error logs:', error.message);
        }
    }
    
    async uploadMetricsBatch() {
        // Upload all pending metrics
        await Promise.all([
            this.uploadAPIMetrics(),
            this.uploadErrorLogs(),
            this.uploadResourceMetrics()
        ]);
    }
    
    async uploadResourceMetrics() {
        if (this.resourceMetrics.length === 0) return;
        
        try {
            const batch = firebase.firestore().batch();
            const resourceRef = firebase.firestore().collection('resource_metrics');
            
            this.resourceMetrics.forEach((metric, index) => {
                const docId = `${this.sessionId}_${Date.now()}_${index}`;
                batch.set(resourceRef.doc(docId), metric);
            });
            
            await batch.commit();
            console.log(`✅ Uploaded ${this.resourceMetrics.length} resource metrics`);
            this.resourceMetrics = [];
        } catch (error) {
            console.warn('❌ Error uploading resource metrics:', error.message);
        }
    }
    
    async saveToFirestore(collection, data) {
        if (!firebase || !firebase.firestore) return;
        
        try {
            await firebase.firestore()
                .collection(collection)
                .add(data);
        } catch (error) {
            console.warn(`Error saving to ${collection}:`, error.message);
        }
    }
    
    // Public methods for getting performance data
    getAPIPerformanceStats() {
        if (this.apiCalls.length === 0) return null;
        
        const totalCalls = this.apiCalls.length;
        const successfulCalls = this.apiCalls.filter(call => call.success).length;
        const avgResponseTime = this.apiCalls.reduce((sum, call) => sum + call.duration, 0) / totalCalls;
        const slowCalls = this.apiCalls.filter(call => call.duration > 3000).length;
        
        return {
            totalCalls,
            successRate: (successfulCalls / totalCalls) * 100,
            avgResponseTime,
            slowCallsPercent: (slowCalls / totalCalls) * 100
        };
    }
    
    getErrorStats() {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentErrors = this.errorLogs.filter(error => error.timestamp >= last24h);
        
        const errorsByType = {};
        recentErrors.forEach(error => {
            errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
        });
        
        return {
            totalErrors: recentErrors.length,
            errorsByType,
            errorRate: recentErrors.length // Simplified calculation
        };
    }
    
    getMemoryStats() {
        if (this.memoryMetrics.length === 0) return null;
        
        const latest = this.memoryMetrics[this.memoryMetrics.length - 1];
        const peak = Math.max(...this.memoryMetrics.map(m => m.usagePercent));
        
        return {
            currentUsage: latest.usagePercent,
            peakUsage: peak,
            usedMB: Math.round(latest.usedJSHeapSize / 1048576),
            limitMB: Math.round(latest.jsHeapSizeLimit / 1048576)
        };
    }
    
    destroy() {
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        // Upload any remaining metrics
        this.uploadMetricsBatch();
    }
}

// Initialize performance monitor
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.performanceMonitor) {
        console.warn('⚠️ Performance Monitor already initialized');
        return;
    }

    setTimeout(() => {
        try {
            window.performanceMonitor = new PerformanceMonitor();
            console.warn('⚡ Performance Monitor initialized');
        } catch (error) {
            console.warn('❌ Failed to initialize Performance Monitor:', error.message);
        }
    }, 5000);
});
