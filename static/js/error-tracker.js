// Advanced Error Tracking and Reporting System
class ErrorTracker {
    constructor() {
        this.errors = [];
        this.errorCounts = {};
        this.sessionId = this.getSessionId();
        this.userId = this.getUserId();
        this.errorThresholds = {
            javascript: 5,    // Max JS errors per session
            api: 3,          // Max API errors per session
            resource: 10     // Max resource errors per session
        };
        
        this.init();
    }
    
    init() {
        console.log('🚨 Initializing Advanced Error Tracker...');
        this.setupGlobalErrorHandling();
        this.setupAPIErrorTracking();
        this.setupResourceErrorTracking();
        this.setupCustomErrorTracking();
        this.startErrorReporting();
    }
    
    getSessionId() {
        return window.realAnalytics?.sessionId || 'session_' + Date.now();
    }
    
    getUserId() {
        return window.realAnalytics?.userId || 'anonymous';
    }
    
    setupGlobalErrorHandling() {
        // Enhanced JavaScript error tracking
        window.addEventListener('error', (event) => {
            this.trackError({
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: new Date(),
                severity: this.calculateSeverity(event),
                context: this.getPageContext()
            });
        });
        
        // Promise rejection tracking
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError({
                type: 'promise_rejection',
                message: event.reason?.message || event.reason?.toString() || 'Unhandled promise rejection',
                stack: event.reason?.stack,
                timestamp: new Date(),
                severity: 'high',
                context: this.getPageContext()
            });
        });
        
        // Console error interception (disabled to prevent infinite loops)
        // Note: Console error tracking disabled to prevent recursive loops
        // when trackError itself logs errors. This was causing stack overflow.

        // If you need console error tracking, implement it carefully to avoid recursion:
        // const originalConsoleError = console.error;
        // console.error = (...args) => {
        //     // Only track non-analytics related console errors
        //     const message = args.join(' ');
        //     if (!message.includes('analytics') && !message.includes('tracker')) {
        //         this.trackError({
        //             type: 'console_error',
        //             message: message,
        //             timestamp: new Date(),
        //             severity: 'medium',
        //             context: this.getPageContext(),
        //             arguments: args
        //         });
        //     }
        //     originalConsoleError.apply(console, args);
        // };
    }
    
    setupAPIErrorTracking() {
        // Track API errors with detailed context
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                // Track API errors (4xx, 5xx status codes)
                if (!response.ok) {
                    this.trackError({
                        type: 'api_error',
                        message: `API Error: ${response.status} ${response.statusText}`,
                        url: typeof args[0] === 'string' ? args[0] : args[0].toString(),
                        method: args[1]?.method || 'GET',
                        status: response.status,
                        statusText: response.statusText,
                        timestamp: new Date(),
                        severity: response.status >= 500 ? 'critical' : 'high',
                        context: this.getAPIContext(args)
                    });
                }
                
                return response;
            } catch (error) {
                // Track network/connection errors
                this.trackError({
                    type: 'network_error',
                    message: `Network Error: ${error.message}`,
                    url: typeof args[0] === 'string' ? args[0] : args[0].toString(),
                    method: args[1]?.method || 'GET',
                    timestamp: new Date(),
                    severity: 'critical',
                    context: this.getAPIContext(args),
                    stack: error.stack
                });
                
                throw error;
            }
        };
    }
    
    setupResourceErrorTracking() {
        // Track resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                // Resource error (image, script, stylesheet, etc.)
                this.trackError({
                    type: 'resource_error',
                    message: `Failed to load resource: ${event.target.src || event.target.href}`,
                    resource: event.target.src || event.target.href,
                    resourceType: event.target.tagName.toLowerCase(),
                    timestamp: new Date(),
                    severity: this.getResourceErrorSeverity(event.target),
                    context: this.getPageContext()
                });
            }
        }, true);
    }
    
    setupCustomErrorTracking() {
        // Custom error tracking for application-specific errors
        window.trackCustomError = (errorType, message, context = {}) => {
            this.trackError({
                type: 'custom_error',
                subType: errorType,
                message: message,
                timestamp: new Date(),
                severity: context.severity || 'medium',
                context: { ...this.getPageContext(), ...context }
            });
        };
        
        // Firebase error tracking
        if (typeof firebase !== 'undefined') {
            const originalFirebaseError = console.error;
            // This is a simplified approach - in production you'd want more sophisticated Firebase error tracking
        }
    }
    
    trackError(errorData) {
        // Add session and user context
        const enrichedError = {
            ...errorData,
            sessionId: this.sessionId,
            userId: this.userId,
            errorId: this.generateErrorId(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: errorData.timestamp || new Date()
        };
        
        // Add to local storage
        this.errors.push(enrichedError);
        
        // Update error counts
        this.updateErrorCounts(enrichedError.type);
        
        // Check for error thresholds
        this.checkErrorThresholds(enrichedError);
        
        // Log to console for debugging (using console.warn to avoid recursion)
        console.warn('🚨 Error tracked:', enrichedError);
        
        // Upload critical errors immediately
        if (enrichedError.severity === 'critical') {
            this.uploadErrorImmediately(enrichedError);
        }
        
        // Create notification for user-facing errors
        this.createErrorNotification(enrichedError);
        
        // Keep only recent errors in memory
        if (this.errors.length > 100) {
            this.errors.shift();
        }
    }
    
    updateErrorCounts(errorType) {
        this.errorCounts[errorType] = (this.errorCounts[errorType] || 0) + 1;
    }
    
    checkErrorThresholds(error) {
        const count = this.errorCounts[error.type] || 0;
        const threshold = this.errorThresholds[error.type];
        
        if (threshold && count >= threshold) {
            this.createThresholdAlert(error.type, count, threshold);
        }
    }
    
    async createThresholdAlert(errorType, count, threshold) {
        if (!window.notificationManager) return;
        
        await window.notificationManager.createNotification({
            type: 'error',
            title: 'Error Threshold Exceeded',
            message: `${count} ${errorType} errors detected in this session (threshold: ${threshold})`,
            priority: 'critical',
            category: 'system'
        });
    }
    
    async createErrorNotification(error) {
        // Disabled automatic error notifications for analytics system
        // Error data is now tracked and displayed in the analytics dashboard
        // This prevents notification spam while maintaining error tracking

        if (!window.notificationManager) return;

        // Only create notifications for truly critical system errors
        const criticalErrors = ['network_error'];
        if (!criticalErrors.includes(error.type)) return;

        // Only notify for critical network errors that indicate system problems
        if (error.type === 'network_error' && error.severity === 'critical') {
            // Don't spam - limit to 1 network error notification per 10 minutes
            const recentNetworkErrors = this.errors.filter(e =>
                e.timestamp > new Date(Date.now() - 10 * 60 * 1000) && // Last 10 minutes
                e.type === 'network_error'
            ).length;

            if (recentNetworkErrors <= 1) {
                await window.notificationManager.createNotification({
                    type: 'error',
                    title: 'Critical Network Error',
                    message: `System connectivity issue: ${error.message}`,
                    priority: 'critical',
                    category: 'system'
                });
            }
        }

        // All other errors are tracked in analytics without creating notifications
    }
    
    calculateSeverity(event) {
        // Calculate error severity based on various factors
        if (event.filename?.includes('critical') || event.message?.includes('critical')) {
            return 'critical';
        }
        
        if (event.filename?.includes('vendor') || event.filename?.includes('node_modules')) {
            return 'low';
        }
        
        if (event.message?.includes('Script error')) {
            return 'low';
        }
        
        return 'medium';
    }
    
    getResourceErrorSeverity(element) {
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'script') return 'high';
        if (tagName === 'link' && element.rel === 'stylesheet') return 'medium';
        if (tagName === 'img') return 'low';
        
        return 'medium';
    }
    
    getPageContext() {
        return {
            page: window.location.pathname,
            title: document.title,
            referrer: document.referrer,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: new Date().toISOString()
        };
    }
    
    getAPIContext(fetchArgs) {
        return {
            ...this.getPageContext(),
            requestUrl: typeof fetchArgs[0] === 'string' ? fetchArgs[0] : fetchArgs[0].toString(),
            requestMethod: fetchArgs[1]?.method || 'GET',
            requestHeaders: JSON.stringify(fetchArgs[1]?.headers || {}),
            requestBody: fetchArgs[1]?.body ? 'present' : 'none'
        };
    }
    
    generateErrorId() {
        return 'error_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    startErrorReporting() {
        // Upload errors in batches every 30 seconds
        setInterval(() => {
            this.uploadErrorBatch();
        }, 30000);
        
        // Upload errors when page is about to unload
        window.addEventListener('beforeunload', () => {
            this.uploadErrorBatch();
        });
    }
    
    async uploadErrorImmediately(error) {
        try {
            await firebase.firestore()
                .collection('error_logs')
                .doc(error.errorId)
                .set(error);
            
            console.log('✅ Critical error uploaded immediately:', error.errorId);
        } catch (uploadError) {
            console.error('❌ Failed to upload critical error:', uploadError);
        }
    }
    
    async uploadErrorBatch() {
        if (this.errors.length === 0) return;

        try {
            // Check if Firebase is available
            if (!firebase || !firebase.firestore) {
                console.warn('⚠️ Firebase not available, skipping error upload');
                return;
            }

            const batch = firebase.firestore().batch();
            const errorRef = firebase.firestore().collection('error_logs');

            // Upload only errors that haven't been uploaded yet
            const unuploadedErrors = this.errors.filter(error => !error.uploaded);

            unuploadedErrors.forEach(error => {
                batch.set(errorRef.doc(error.errorId), error);
                error.uploaded = true;
            });

            if (unuploadedErrors.length > 0) {
                await batch.commit();
                console.warn(`✅ Uploaded ${unuploadedErrors.length} errors`);
            }
        } catch (error) {
            // Use console.warn to avoid recursion
            console.warn('❌ Error uploading error batch:', error.message);
        }
    }
    
    // Public methods for getting error statistics
    getErrorStats() {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentErrors = this.errors.filter(error => error.timestamp >= last24h);
        
        const errorsByType = {};
        const errorsBySeverity = {};
        
        recentErrors.forEach(error => {
            errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
            errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
        });
        
        return {
            totalErrors: recentErrors.length,
            errorsByType,
            errorsBySeverity,
            errorRate: this.calculateErrorRate(recentErrors),
            criticalErrors: recentErrors.filter(e => e.severity === 'critical').length
        };
    }
    
    calculateErrorRate(errors) {
        // Simple error rate calculation - errors per hour
        const hours = 24;
        return Math.round(errors.length / hours * 100) / 100;
    }
    
    getTopErrors(limit = 5) {
        const errorGroups = {};
        
        this.errors.forEach(error => {
            const key = `${error.type}:${error.message}`;
            if (!errorGroups[key]) {
                errorGroups[key] = {
                    type: error.type,
                    message: error.message,
                    count: 0,
                    lastOccurrence: error.timestamp,
                    severity: error.severity
                };
            }
            errorGroups[key].count++;
            if (error.timestamp > errorGroups[key].lastOccurrence) {
                errorGroups[key].lastOccurrence = error.timestamp;
            }
        });
        
        return Object.values(errorGroups)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
    
    destroy() {
        // Upload any remaining errors
        this.uploadErrorBatch();
    }
}

// Initialize error tracker
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.errorTracker) {
        console.warn('⚠️ Error Tracker already initialized');
        return;
    }

    setTimeout(() => {
        try {
            // Initialize even without Firebase to track client-side errors
            window.errorTracker = new ErrorTracker();
            console.warn('🚨 Error Tracker initialized');
        } catch (error) {
            console.warn('❌ Failed to initialize Error Tracker:', error.message);
        }
    }, 6000);
});
