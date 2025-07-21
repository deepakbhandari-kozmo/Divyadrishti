// Advanced User Interaction Analytics System
class InteractionTracker {
    constructor() {
        this.interactions = [];
        this.userJourney = [];
        this.featureUsage = {};
        this.heatmapData = [];
        this.sessionId = this.getSessionId();
        this.userId = this.getUserId();
        this.currentPage = window.location.pathname;
        this.pageStartTime = Date.now();
        this.scrollDepth = 0;
        this.maxScrollDepth = 0;
        this.timeOnPage = 0;
        this.engagementScore = 0;
        
        this.init();
    }
    
    init() {
        console.log('🎯 Initializing Advanced Interaction Tracker...');
        this.setupInteractionListeners();
        this.setupScrollTracking();
        this.setupFormTracking();
        this.setupFeatureTracking();
        this.setupUserJourneyTracking();
        this.setupEngagementTracking();
        this.startPeriodicTracking();
    }
    
    getSessionId() {
        return window.realAnalytics?.sessionId || 'session_' + Date.now();
    }
    
    getUserId() {
        return window.realAnalytics?.userId || 'anonymous';
    }
    
    setupInteractionListeners() {
        // Enhanced click tracking with detailed context
        document.addEventListener('click', (event) => {
            this.trackInteraction('click', {
                element: this.getElementInfo(event.target),
                coordinates: { x: event.clientX, y: event.clientY },
                timestamp: Date.now(),
                pagePosition: this.getPagePosition(event),
                context: this.getInteractionContext(event.target)
            });
        });
        
        // Hover tracking for engagement analysis
        let hoverTimeout;
        document.addEventListener('mouseover', (event) => {
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                this.trackInteraction('hover', {
                    element: this.getElementInfo(event.target),
                    coordinates: { x: event.clientX, y: event.clientY },
                    timestamp: Date.now(),
                    duration: 1000 // Minimum hover time
                });
            }, 1000);
        });
        
        document.addEventListener('mouseout', () => {
            clearTimeout(hoverTimeout);
        });
        
        // Focus tracking for form elements
        document.addEventListener('focus', (event) => {
            if (this.isFormElement(event.target)) {
                this.trackInteraction('focus', {
                    element: this.getElementInfo(event.target),
                    timestamp: Date.now(),
                    formContext: this.getFormContext(event.target)
                });
            }
        }, true);
        
        // Key press tracking for search and input analysis
        document.addEventListener('keydown', (event) => {
            if (this.isTrackableKeyPress(event)) {
                this.trackInteraction('keypress', {
                    key: event.key,
                    element: this.getElementInfo(event.target),
                    timestamp: Date.now(),
                    modifiers: {
                        ctrl: event.ctrlKey,
                        shift: event.shiftKey,
                        alt: event.altKey
                    }
                });
            }
        });
    }
    
    setupScrollTracking() {
        let scrollTimeout;
        let lastScrollTime = Date.now();
        
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            
            const currentScrollDepth = this.calculateScrollDepth();
            this.scrollDepth = currentScrollDepth;
            this.maxScrollDepth = Math.max(this.maxScrollDepth, currentScrollDepth);
            
            scrollTimeout = setTimeout(() => {
                const scrollDuration = Date.now() - lastScrollTime;
                
                this.trackInteraction('scroll', {
                    scrollDepth: currentScrollDepth,
                    maxScrollDepth: this.maxScrollDepth,
                    scrollY: window.scrollY,
                    viewportHeight: window.innerHeight,
                    documentHeight: document.body.scrollHeight,
                    scrollDuration: scrollDuration,
                    timestamp: Date.now()
                });
                
                lastScrollTime = Date.now();
            }, 500);
        });
    }
    
    setupFormTracking() {
        // Form submission tracking
        document.addEventListener('submit', (event) => {
            const form = event.target;
            const formData = this.getFormData(form);
            
            this.trackInteraction('form_submit', {
                formId: form.id,
                formAction: form.action,
                formMethod: form.method,
                fieldCount: formData.fieldCount,
                completedFields: formData.completedFields,
                timeToComplete: formData.timeToComplete,
                timestamp: Date.now()
            });
            
            this.trackFeatureUsage('form_submission', form.id || 'unnamed_form');
        });
        
        // Form field interaction tracking
        document.addEventListener('input', (event) => {
            if (this.isFormElement(event.target)) {
                this.trackInteraction('input', {
                    element: this.getElementInfo(event.target),
                    inputLength: event.target.value.length,
                    timestamp: Date.now()
                });
            }
        });
        
        // Form abandonment tracking
        document.addEventListener('blur', (event) => {
            if (this.isFormElement(event.target) && event.target.value.trim() === '') {
                this.trackInteraction('field_abandon', {
                    element: this.getElementInfo(event.target),
                    timestamp: Date.now()
                });
            }
        }, true);
    }
    
    setupFeatureTracking() {
        // Track specific dashboard features
        this.trackFeatureInteractions([
            // Navigation features
            { selector: '.nav-link', feature: 'navigation' },
            { selector: '.sidebar-link', feature: 'sidebar_navigation' },
            
            // Dashboard cards
            { selector: '.dashboard-card', feature: 'card_interaction' },
            { selector: '.card-header', feature: 'card_header_click' },
            
            // Analytics features
            { selector: '.time-range-btn', feature: 'time_range_selection' },
            { selector: '.analytics-action-btn', feature: 'analytics_action' },
            
            // Notification features
            { selector: '.notification-control-btn', feature: 'notification_control' },
            { selector: '.delete-btn', feature: 'notification_delete' },
            { selector: '.mark-read-btn', feature: 'notification_mark_read' },
            
            // System monitoring
            { selector: '.system-metric', feature: 'system_metric_view' },
            { selector: '.trigger-btn', feature: 'notification_trigger' },
            
            // User management
            { selector: '.user-action-btn', feature: 'user_management' },
            { selector: '.role-selector', feature: 'role_management' },
            
            // Theme and settings
            { selector: '.theme-toggle', feature: 'theme_toggle' },
            { selector: '.settings-btn', feature: 'settings_access' }
        ]);
    }
    
    trackFeatureInteractions(features) {
        features.forEach(({ selector, feature }) => {
            document.addEventListener('click', (event) => {
                if (event.target.matches(selector) || event.target.closest(selector)) {
                    this.trackFeatureUsage(feature, selector);
                }
            });
        });
    }
    
    setupUserJourneyTracking() {
        // Track page navigation
        this.addJourneyStep('page_visit', {
            page: this.currentPage,
            timestamp: Date.now(),
            referrer: document.referrer
        });
        
        // Track hash changes (SPA navigation)
        window.addEventListener('hashchange', () => {
            this.addJourneyStep('hash_change', {
                oldHash: this.currentHash,
                newHash: window.location.hash,
                timestamp: Date.now()
            });
            this.currentHash = window.location.hash;
        });
        
        // Track back/forward navigation
        window.addEventListener('popstate', () => {
            this.addJourneyStep('navigation', {
                type: 'browser_navigation',
                page: window.location.pathname,
                timestamp: Date.now()
            });
        });
    }
    
    setupEngagementTracking() {
        // Track time spent on page
        setInterval(() => {
            this.timeOnPage += 1000; // Add 1 second
            this.calculateEngagementScore();
        }, 1000);
        
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.addJourneyStep('page_hidden', {
                    timeOnPage: this.timeOnPage,
                    scrollDepth: this.maxScrollDepth,
                    timestamp: Date.now()
                });
            } else {
                this.addJourneyStep('page_visible', {
                    timestamp: Date.now()
                });
            }
        });
    }
    
    trackInteraction(type, data) {
        const interaction = {
            sessionId: this.sessionId,
            userId: this.userId,
            type: type,
            page: this.currentPage,
            timestamp: new Date(),
            data: data,
            engagementScore: this.engagementScore
        };
        
        this.interactions.push(interaction);
        
        // Update heatmap data for clicks
        if (type === 'click' && data.coordinates) {
            this.heatmapData.push({
                x: data.coordinates.x,
                y: data.coordinates.y,
                page: this.currentPage,
                timestamp: Date.now()
            });
        }
        
        // Upload interactions in batches
        if (this.interactions.length >= 15) {
            this.uploadInteractions();
        }
    }
    
    trackFeatureUsage(feature, context = '') {
        if (!this.featureUsage[feature]) {
            this.featureUsage[feature] = {
                count: 0,
                firstUsed: Date.now(),
                lastUsed: Date.now(),
                contexts: {}
            };
        }
        
        this.featureUsage[feature].count++;
        this.featureUsage[feature].lastUsed = Date.now();
        
        if (context) {
            this.featureUsage[feature].contexts[context] = 
                (this.featureUsage[feature].contexts[context] || 0) + 1;
        }
        
        // Track as interaction
        this.trackInteraction('feature_usage', {
            feature: feature,
            context: context,
            usageCount: this.featureUsage[feature].count
        });
    }
    
    addJourneyStep(action, data) {
        const step = {
            sessionId: this.sessionId,
            userId: this.userId,
            action: action,
            timestamp: new Date(),
            data: data,
            stepNumber: this.userJourney.length + 1
        };
        
        this.userJourney.push(step);
        
        // Keep journey manageable
        if (this.userJourney.length > 50) {
            this.userJourney.shift();
        }
    }
    
    calculateEngagementScore() {
        let score = 0;
        
        // Time on page (max 30 points)
        score += Math.min(30, this.timeOnPage / 1000 / 60 * 5); // 5 points per minute
        
        // Scroll depth (max 20 points)
        score += this.maxScrollDepth * 0.2;
        
        // Interaction count (max 25 points)
        const interactionCount = this.interactions.length;
        score += Math.min(25, interactionCount * 2);
        
        // Feature usage diversity (max 25 points)
        const uniqueFeatures = Object.keys(this.featureUsage).length;
        score += Math.min(25, uniqueFeatures * 3);
        
        this.engagementScore = Math.round(score);
        return this.engagementScore;
    }
    
    getElementInfo(element) {
        return {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            textContent: element.textContent?.substring(0, 100) || '',
            attributes: this.getRelevantAttributes(element)
        };
    }
    
    getRelevantAttributes(element) {
        const relevantAttrs = ['data-id', 'data-action', 'data-feature', 'href', 'type', 'name'];
        const attrs = {};
        
        relevantAttrs.forEach(attr => {
            if (element.hasAttribute(attr)) {
                attrs[attr] = element.getAttribute(attr);
            }
        });
        
        return attrs;
    }
    
    getPagePosition(event) {
        return {
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            relativeX: (event.clientX / window.innerWidth) * 100,
            relativeY: (event.clientY / window.innerHeight) * 100
        };
    }
    
    getInteractionContext(element) {
        return {
            parentElement: element.parentElement?.tagName,
            nearbyText: this.getNearbyText(element),
            sectionContext: this.getSectionContext(element)
        };
    }
    
    getNearbyText(element) {
        const parent = element.parentElement;
        if (parent) {
            return parent.textContent?.substring(0, 200) || '';
        }
        return '';
    }
    
    getSectionContext(element) {
        const section = element.closest('section, .card, .dashboard-card, .container');
        if (section) {
            return {
                tagName: section.tagName,
                className: section.className,
                id: section.id
            };
        }
        return null;
    }
    
    isFormElement(element) {
        const formElements = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
        return formElements.includes(element.tagName);
    }
    
    isTrackableKeyPress(event) {
        // Track meaningful key presses (not every character)
        const trackableKeys = ['Enter', 'Tab', 'Escape', 'Backspace', 'Delete'];
        return trackableKeys.includes(event.key) || 
               (event.ctrlKey && ['s', 'c', 'v', 'z', 'y'].includes(event.key.toLowerCase()));
    }
    
    getFormContext(element) {
        const form = element.closest('form');
        if (form) {
            return {
                formId: form.id,
                formAction: form.action,
                fieldName: element.name,
                fieldType: element.type,
                fieldPosition: Array.from(form.elements).indexOf(element)
            };
        }
        return null;
    }
    
    getFormData(form) {
        const elements = Array.from(form.elements);
        const completedFields = elements.filter(el => 
            el.value && el.value.trim() !== ''
        ).length;
        
        return {
            fieldCount: elements.length,
            completedFields: completedFields,
            completionRate: (completedFields / elements.length) * 100,
            timeToComplete: Date.now() - this.pageStartTime
        };
    }
    
    calculateScrollDepth() {
        const scrollTop = window.scrollY;
        const documentHeight = document.body.scrollHeight;
        const windowHeight = window.innerHeight;
        
        return Math.round((scrollTop / (documentHeight - windowHeight)) * 100);
    }
    
    startPeriodicTracking() {
        // Upload data every 45 seconds
        setInterval(() => {
            this.uploadInteractions();
            this.uploadFeatureUsage();
            this.uploadUserJourney();
        }, 45000);
        
        // Track engagement score every 30 seconds
        setInterval(() => {
            this.trackInteraction('engagement_update', {
                engagementScore: this.calculateEngagementScore(),
                timeOnPage: this.timeOnPage,
                scrollDepth: this.maxScrollDepth,
                interactionCount: this.interactions.length
            });
        }, 30000);
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
    
    async uploadFeatureUsage() {
        if (Object.keys(this.featureUsage).length === 0) return;
        
        try {
            await firebase.firestore()
                .collection('feature_usage')
                .doc(this.sessionId)
                .set({
                    sessionId: this.sessionId,
                    userId: this.userId,
                    page: this.currentPage,
                    features: this.featureUsage,
                    timestamp: new Date(),
                    engagementScore: this.engagementScore
                }, { merge: true });
            
            console.log('✅ Feature usage data uploaded');
        } catch (error) {
            console.error('❌ Error uploading feature usage:', error);
        }
    }
    
    async uploadUserJourney() {
        if (this.userJourney.length === 0) return;
        
        try {
            await firebase.firestore()
                .collection('user_journeys')
                .doc(this.sessionId)
                .set({
                    sessionId: this.sessionId,
                    userId: this.userId,
                    journey: this.userJourney,
                    timestamp: new Date(),
                    journeyLength: this.userJourney.length
                }, { merge: true });
            
            console.log('✅ User journey data uploaded');
        } catch (error) {
            console.error('❌ Error uploading user journey:', error);
        }
    }
    
    // Public methods for getting interaction analytics
    getInteractionStats() {
        const clickCount = this.interactions.filter(i => i.type === 'click').length;
        const scrollCount = this.interactions.filter(i => i.type === 'scroll').length;
        const formInteractions = this.interactions.filter(i => i.type.includes('form')).length;
        
        return {
            totalInteractions: this.interactions.length,
            clickCount,
            scrollCount,
            formInteractions,
            engagementScore: this.engagementScore,
            timeOnPage: this.timeOnPage,
            maxScrollDepth: this.maxScrollDepth,
            featuresUsed: Object.keys(this.featureUsage).length
        };
    }
    
    getTopFeatures(limit = 5) {
        return Object.entries(this.featureUsage)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, limit)
            .map(([feature, data]) => ({
                feature,
                count: data.count,
                lastUsed: data.lastUsed
            }));
    }
    
    getHeatmapData() {
        return this.heatmapData;
    }
    
    destroy() {
        // Upload any remaining data
        this.uploadInteractions();
        this.uploadFeatureUsage();
        this.uploadUserJourney();
    }
}

// Initialize interaction tracker
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.interactionTracker) {
        console.warn('⚠️ Interaction Tracker already initialized');
        return;
    }

    setTimeout(() => {
        try {
            window.interactionTracker = new InteractionTracker();
            console.warn('🎯 Interaction Tracker initialized');
        } catch (error) {
            console.warn('❌ Failed to initialize Interaction Tracker:', error.message);
        }
    }, 7000);
});
