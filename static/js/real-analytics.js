// Real Analytics Data Collection System
class RealAnalyticsCollector {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.sessionStartTime = Date.now();
        this.currentPage = window.location.pathname;
        this.pageStartTime = Date.now();
        this.interactions = [];
        this.performanceMetrics = [];
        this.isActive = true;
        this.heartbeatInterval = null;
        
        this.init();
    }
    
    init() {
        console.log('📊 Initializing Real Analytics Collector...');
        console.log('Session ID:', this.sessionId);
        console.log('User ID:', this.userId);
        
        this.setupEventListeners();
        this.startSession();
        this.trackPageView();
        this.startHeartbeat();
        this.collectDeviceInfo();
        this.setupPerformanceMonitoring();
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getUserId() {
        // Try to get existing user ID from localStorage or generate new one
        let userId = localStorage.getItem('analytics_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('analytics_user_id', userId);
        }
        return userId;
    }
    
    setupEventListeners() {
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackUserInactive();
            } else {
                this.trackUserActive();
            }
        });
        
        // Track page unload
        window.addEventListener('beforeunload', () => {
            this.endSession();
        });
        
        // Track clicks
        document.addEventListener('click', (event) => {
            this.trackInteraction('click', {
                element: event.target.tagName,
                className: event.target.className,
                id: event.target.id,
                text: event.target.textContent?.substring(0, 50) || '',
                x: event.clientX,
                y: event.clientY
            });
        });
        
        // Track form submissions
        document.addEventListener('submit', (event) => {
            this.trackInteraction('form_submit', {
                formId: event.target.id,
                formAction: event.target.action,
                formMethod: event.target.method
            });
        });
        
        // Track scroll events (throttled)
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.trackInteraction('scroll', {
                    scrollY: window.scrollY,
                    scrollPercent: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
                });
            }, 1000);
        });
        
        // Track hash changes (SPA navigation)
        window.addEventListener('hashchange', () => {
            this.trackPageChange();
        });
        
        // Track popstate (browser navigation)
        window.addEventListener('popstate', () => {
            this.trackPageChange();
        });
    }
    
    async startSession() {
        const sessionData = {
            sessionId: this.sessionId,
            userId: this.userId,
            startTime: new Date(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            referrer: document.referrer,
            landingPage: window.location.pathname,
            screenResolution: `${screen.width}x${screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            isReturningUser: localStorage.getItem('analytics_user_id') !== null
        };
        
        try {
            await this.saveToFirestore('user_sessions', this.sessionId, sessionData);
            console.log('✅ Session started:', sessionData);
        } catch (error) {
            console.error('❌ Error starting session:', error);
        }
    }
    
    async trackPageView() {
        const pageViewData = {
            sessionId: this.sessionId,
            userId: this.userId,
            page: this.currentPage,
            title: document.title,
            timestamp: new Date(),
            referrer: document.referrer,
            loadTime: this.getPageLoadTime()
        };
        
        try {
            const pageViewId = `${this.sessionId}_${Date.now()}`;
            await this.saveToFirestore('page_views', pageViewId, pageViewData);
            console.log('📄 Page view tracked:', pageViewData);
        } catch (error) {
            console.error('❌ Error tracking page view:', error);
        }
    }
    
    trackPageChange() {
        // Track time spent on previous page
        const timeSpent = Date.now() - this.pageStartTime;
        this.trackInteraction('page_exit', {
            page: this.currentPage,
            timeSpent: timeSpent
        });
        
        // Update current page and track new page view
        this.currentPage = window.location.pathname;
        this.pageStartTime = Date.now();
        this.trackPageView();
    }
    
    async trackInteraction(type, data) {
        const interactionData = {
            sessionId: this.sessionId,
            userId: this.userId,
            type: type,
            page: this.currentPage,
            timestamp: new Date(),
            data: data
        };
        
        // Store locally and batch upload
        this.interactions.push(interactionData);
        
        // Upload interactions in batches of 10
        if (this.interactions.length >= 10) {
            await this.uploadInteractions();
        }
    }
    
    async uploadInteractions() {
        if (this.interactions.length === 0) return;
        
        try {
            const batch = firebase.firestore().batch();
            const interactionsRef = firebase.firestore().collection('user_interactions');
            
            this.interactions.forEach((interaction, index) => {
                const docId = `${this.sessionId}_${Date.now()}_${index}`;
                batch.set(interactionsRef.doc(docId), interaction);
            });
            
            await batch.commit();
            console.log(`✅ Uploaded ${this.interactions.length} interactions`);
            this.interactions = [];
        } catch (error) {
            console.error('❌ Error uploading interactions:', error);
        }
    }
    
    trackUserActive() {
        this.isActive = true;
        this.trackInteraction('user_active', {
            timestamp: Date.now()
        });
    }
    
    trackUserInactive() {
        this.isActive = false;
        this.trackInteraction('user_inactive', {
            timestamp: Date.now()
        });
    }
    
    startHeartbeat() {
        // Send heartbeat every 5 minutes to track active users (reduced frequency)
        this.heartbeatInterval = setInterval(async () => {
            if (this.isActive && !document.hidden) {
                try {
                    await this.saveToFirestore('active_users', this.sessionId, {
                        sessionId: this.sessionId,
                        userId: this.userId,
                        lastSeen: new Date(),
                        page: this.currentPage
                    });
                } catch (error) {
                    console.error('❌ Error sending heartbeat:', error);
                }
            }
        }, 300000); // 5 minutes instead of 30 seconds
    }
    
    collectDeviceInfo() {
        const deviceInfo = {
            sessionId: this.sessionId,
            userId: this.userId,
            timestamp: new Date(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screenWidth: screen.width,
            screenHeight: screen.height,
            screenColorDepth: screen.colorDepth,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            deviceMemory: navigator.deviceMemory || 'unknown',
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
        };
        
        // Detect device type
        const userAgent = navigator.userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
            deviceInfo.deviceType = 'mobile';
        } else if (/tablet|ipad/i.test(userAgent)) {
            deviceInfo.deviceType = 'tablet';
        } else {
            deviceInfo.deviceType = 'desktop';
        }
        
        // Detect browser
        if (userAgent.includes('chrome')) deviceInfo.browser = 'chrome';
        else if (userAgent.includes('firefox')) deviceInfo.browser = 'firefox';
        else if (userAgent.includes('safari')) deviceInfo.browser = 'safari';
        else if (userAgent.includes('edge')) deviceInfo.browser = 'edge';
        else deviceInfo.browser = 'other';
        
        // Get connection info if available
        if ('connection' in navigator) {
            const connection = navigator.connection;
            deviceInfo.connectionType = connection.effectiveType;
            deviceInfo.downlink = connection.downlink;
            deviceInfo.rtt = connection.rtt;
        }
        
        this.saveToFirestore('device_info', this.sessionId, deviceInfo);
    }
    
    setupPerformanceMonitoring() {
        // Monitor performance using Performance API
        if ('performance' in window) {
            // Get navigation timing
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.collectNavigationTiming();
                    this.collectResourceTiming();
                }, 1000);
            });
            
            // Monitor long tasks
            if ('PerformanceObserver' in window) {
                try {
                    const observer = new PerformanceObserver((list) => {
                        list.getEntries().forEach((entry) => {
                            if (entry.duration > 50) { // Tasks longer than 50ms
                                this.trackPerformanceMetric('long_task', {
                                    duration: entry.duration,
                                    startTime: entry.startTime
                                });
                            }
                        });
                    });
                    observer.observe({ entryTypes: ['longtask'] });
                } catch (error) {
                    console.log('Long task monitoring not supported');
                }
            }
        }
    }
    
    collectNavigationTiming() {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            const timingData = {
                sessionId: this.sessionId,
                userId: this.userId,
                page: this.currentPage,
                timestamp: new Date(),
                type: 'navigation_timing',
                metrics: {
                    dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
                    tcpConnect: navigation.connectEnd - navigation.connectStart,
                    request: navigation.responseStart - navigation.requestStart,
                    response: navigation.responseEnd - navigation.responseStart,
                    domProcessing: navigation.domContentLoadedEventStart - navigation.responseEnd,
                    domComplete: navigation.domComplete - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    totalTime: navigation.loadEventEnd - navigation.navigationStart
                }
            };
            
            this.saveToFirestore('performance_metrics', `${this.sessionId}_navigation`, timingData);
        }
    }
    
    collectResourceTiming() {
        const resources = performance.getEntriesByType('resource');
        const resourceData = {
            sessionId: this.sessionId,
            userId: this.userId,
            page: this.currentPage,
            timestamp: new Date(),
            type: 'resource_timing',
            resources: resources.map(resource => ({
                name: resource.name,
                type: this.getResourceType(resource.name),
                duration: resource.duration,
                size: resource.transferSize || 0,
                startTime: resource.startTime
            }))
        };
        
        this.saveToFirestore('performance_metrics', `${this.sessionId}_resources`, resourceData);
    }
    
    getResourceType(url) {
        if (url.includes('.css')) return 'css';
        if (url.includes('.js')) return 'javascript';
        if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return 'image';
        if (url.includes('/api/')) return 'api';
        return 'other';
    }
    
    trackPerformanceMetric(type, data) {
        const metricData = {
            sessionId: this.sessionId,
            userId: this.userId,
            page: this.currentPage,
            timestamp: new Date(),
            type: type,
            data: data
        };
        
        this.performanceMetrics.push(metricData);
        
        // Upload performance metrics in batches
        if (this.performanceMetrics.length >= 5) {
            this.uploadPerformanceMetrics();
        }
    }
    
    async uploadPerformanceMetrics() {
        if (this.performanceMetrics.length === 0) return;
        
        try {
            const batch = firebase.firestore().batch();
            const metricsRef = firebase.firestore().collection('performance_metrics');
            
            this.performanceMetrics.forEach((metric, index) => {
                const docId = `${this.sessionId}_${Date.now()}_${index}`;
                batch.set(metricsRef.doc(docId), metric);
            });
            
            await batch.commit();
            console.log(`✅ Uploaded ${this.performanceMetrics.length} performance metrics`);
            this.performanceMetrics = [];
        } catch (error) {
            console.error('❌ Error uploading performance metrics:', error);
        }
    }
    
    getPageLoadTime() {
        if ('performance' in window && performance.timing) {
            return performance.timing.loadEventEnd - performance.timing.navigationStart;
        }
        return null;
    }
    
    async endSession() {
        // Upload any remaining interactions and metrics
        await this.uploadInteractions();
        await this.uploadPerformanceMetrics();
        
        // Update session end time
        try {
            await firebase.firestore()
                .collection('user_sessions')
                .doc(this.sessionId)
                .update({
                    endTime: new Date(),
                    duration: Date.now() - this.sessionStartTime,
                    totalInteractions: this.interactions.length
                });
            
            // Remove from active users
            await firebase.firestore()
                .collection('active_users')
                .doc(this.sessionId)
                .delete();
                
            console.log('✅ Session ended');
        } catch (error) {
            console.error('❌ Error ending session:', error);
        }
        
        // Clear heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }
    
    async saveToFirestore(collection, docId, data) {
        if (!firebase || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }
        
        return await firebase.firestore()
            .collection(collection)
            .doc(docId)
            .set(data, { merge: true });
    }
}

// Initialize real analytics when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.realAnalytics) {
        console.warn('⚠️ Real Analytics already initialized');
        return;
    }

    // Wait for Firebase to be ready
    setTimeout(() => {
        try {
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
                window.realAnalytics = new RealAnalyticsCollector();
                console.warn('📊 Real Analytics Collector initialized');
            } else {
                console.warn('⚠️ Firebase not available, analytics disabled');
            }
        } catch (error) {
            console.warn('❌ Failed to initialize Real Analytics:', error.message);
        }
    }, 3000);
});
