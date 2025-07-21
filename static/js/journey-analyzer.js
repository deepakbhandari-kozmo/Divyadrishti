// User Journey Analysis and Visualization System
class JourneyAnalyzer {
    constructor() {
        this.journeys = [];
        this.commonPaths = {};
        this.dropoffPoints = {};
        this.conversionFunnels = {};
        this.userSegments = {};
        this.engagementPatterns = {};
        
        this.init();
    }
    
    init() {
        console.log('🗺️ Initializing Journey Analyzer...');
        this.setupRealtimeListeners();
        this.startAnalysisUpdates();
    }
    
    setupRealtimeListeners() {
        if (!firebase || !firebase.firestore) return;
        
        const db = firebase.firestore();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Listen to user journeys
        const journeyListener = db.collection('user_journeys')
            .where('timestamp', '>=', yesterday)
            .onSnapshot((snapshot) => {
                this.processJourneys(snapshot);
            });
        
        // Listen to feature usage
        const featureListener = db.collection('feature_usage')
            .where('timestamp', '>=', yesterday)
            .onSnapshot((snapshot) => {
                this.processFeatureUsage(snapshot);
            });
        
        // Listen to user interactions for engagement analysis
        const interactionListener = db.collection('user_interactions')
            .where('timestamp', '>=', yesterday)
            .orderBy('timestamp', 'desc')
            .limit(1000)
            .onSnapshot((snapshot) => {
                this.processInteractions(snapshot);
            });
    }
    
    processJourneys(snapshot) {
        const journeys = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            journeys.push({
                sessionId: data.sessionId,
                userId: data.userId,
                journey: data.journey || [],
                timestamp: data.timestamp.toDate(),
                journeyLength: data.journeyLength || 0
            });
        });
        
        this.journeys = journeys;
        this.analyzeCommonPaths();
        this.analyzeDropoffPoints();
        this.analyzeConversionFunnels();
        this.segmentUsers();
        
        console.log('🗺️ Processed', journeys.length, 'user journeys');
    }
    
    processFeatureUsage(snapshot) {
        const featureData = {};
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            const sessionId = data.sessionId;
            
            featureData[sessionId] = {
                features: data.features || {},
                engagementScore: data.engagementScore || 0,
                page: data.page,
                timestamp: data.timestamp.toDate()
            };
        });
        
        this.analyzeFeatureAdoption(featureData);
        this.analyzeEngagementPatterns(featureData);
        
        console.log('🎯 Processed feature usage for', Object.keys(featureData).length, 'sessions');
    }
    
    processInteractions(snapshot) {
        const interactions = [];
        
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
        });
        
        this.analyzeInteractionPatterns(interactions);
        console.log('🎯 Processed', interactions.length, 'interactions');
    }
    
    analyzeCommonPaths() {
        const pathCounts = {};
        
        this.journeys.forEach(journey => {
            const steps = journey.journey.map(step => step.action);
            
            // Analyze 2-step paths
            for (let i = 0; i < steps.length - 1; i++) {
                const path = `${steps[i]} → ${steps[i + 1]}`;
                pathCounts[path] = (pathCounts[path] || 0) + 1;
            }
            
            // Analyze 3-step paths
            for (let i = 0; i < steps.length - 2; i++) {
                const path = `${steps[i]} → ${steps[i + 1]} → ${steps[i + 2]}`;
                pathCounts[path] = (pathCounts[path] || 0) + 1;
            }
        });
        
        // Sort by frequency
        this.commonPaths = Object.entries(pathCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20)
            .reduce((obj, [path, count]) => {
                obj[path] = count;
                return obj;
            }, {});
    }
    
    analyzeDropoffPoints() {
        const stepCounts = {};
        const exitCounts = {};
        
        this.journeys.forEach(journey => {
            const steps = journey.journey;
            
            steps.forEach((step, index) => {
                const action = step.action;
                stepCounts[action] = (stepCounts[action] || 0) + 1;
                
                // If this is the last step, count it as an exit
                if (index === steps.length - 1) {
                    exitCounts[action] = (exitCounts[action] || 0) + 1;
                }
            });
        });
        
        // Calculate dropoff rates
        this.dropoffPoints = {};
        Object.keys(stepCounts).forEach(action => {
            const exits = exitCounts[action] || 0;
            const total = stepCounts[action];
            this.dropoffPoints[action] = {
                total: total,
                exits: exits,
                dropoffRate: (exits / total) * 100
            };
        });
    }
    
    analyzeConversionFunnels() {
        // Define key conversion funnels
        const funnels = {
            'User Registration': [
                'page_visit',
                'form_focus',
                'form_submit',
                'registration_complete'
            ],
            'Dashboard Engagement': [
                'page_visit',
                'card_interaction',
                'feature_usage',
                'analytics_action'
            ],
            'Notification Management': [
                'notification_view',
                'notification_control',
                'notification_action',
                'notification_complete'
            ]
        };
        
        Object.entries(funnels).forEach(([funnelName, steps]) => {
            this.conversionFunnels[funnelName] = this.calculateFunnelConversion(steps);
        });
    }
    
    calculateFunnelConversion(steps) {
        const stepCounts = {};
        
        this.journeys.forEach(journey => {
            const journeyActions = journey.journey.map(step => step.action);
            let currentStep = 0;
            
            journeyActions.forEach(action => {
                if (currentStep < steps.length && this.matchesStep(action, steps[currentStep])) {
                    stepCounts[currentStep] = (stepCounts[currentStep] || 0) + 1;
                    currentStep++;
                }
            });
        });
        
        // Calculate conversion rates
        const funnel = [];
        const totalUsers = stepCounts[0] || 0;
        
        steps.forEach((step, index) => {
            const count = stepCounts[index] || 0;
            const conversionRate = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
            
            funnel.push({
                step: step,
                users: count,
                conversionRate: conversionRate,
                dropoff: index > 0 ? ((stepCounts[index - 1] || 0) - count) : 0
            });
        });
        
        return funnel;
    }
    
    matchesStep(action, stepPattern) {
        // Simple pattern matching - can be enhanced
        return action.includes(stepPattern) || stepPattern.includes(action);
    }
    
    segmentUsers() {
        const segments = {
            'High Engagement': [],
            'Medium Engagement': [],
            'Low Engagement': [],
            'New Users': [],
            'Power Users': [],
            'At Risk': []
        };
        
        this.journeys.forEach(journey => {
            const sessionId = journey.sessionId;
            const journeyLength = journey.journeyLength;
            const avgEngagement = this.calculateAverageEngagement(journey);
            
            // Segment based on engagement and activity
            if (avgEngagement > 70) {
                segments['High Engagement'].push(sessionId);
            } else if (avgEngagement > 40) {
                segments['Medium Engagement'].push(sessionId);
            } else {
                segments['Low Engagement'].push(sessionId);
            }
            
            // Additional segmentation
            if (journeyLength > 20) {
                segments['Power Users'].push(sessionId);
            } else if (journeyLength < 3) {
                segments['At Risk'].push(sessionId);
            }
            
            // Check if new user (simplified)
            if (journey.journey.some(step => step.action.includes('registration'))) {
                segments['New Users'].push(sessionId);
            }
        });
        
        this.userSegments = segments;
    }
    
    calculateAverageEngagement(journey) {
        const engagementScores = journey.journey
            .map(step => step.data?.engagementScore || 0)
            .filter(score => score > 0);
        
        if (engagementScores.length === 0) return 0;
        
        return engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length;
    }
    
    analyzeFeatureAdoption(featureData) {
        const featureStats = {};
        
        Object.values(featureData).forEach(session => {
            Object.entries(session.features || {}).forEach(([feature, data]) => {
                if (!featureStats[feature]) {
                    featureStats[feature] = {
                        totalUsers: 0,
                        totalUsage: 0,
                        avgUsagePerUser: 0,
                        adoptionRate: 0
                    };
                }
                
                featureStats[feature].totalUsers++;
                featureStats[feature].totalUsage += data.count || 0;
            });
        });
        
        // Calculate averages and adoption rates
        const totalSessions = Object.keys(featureData).length;
        
        Object.keys(featureStats).forEach(feature => {
            const stats = featureStats[feature];
            stats.avgUsagePerUser = stats.totalUsage / stats.totalUsers;
            stats.adoptionRate = (stats.totalUsers / totalSessions) * 100;
        });
        
        this.featureAdoption = featureStats;
    }
    
    analyzeEngagementPatterns(featureData) {
        const patterns = {
            'High Engagement Sessions': 0,
            'Medium Engagement Sessions': 0,
            'Low Engagement Sessions': 0,
            'Feature Exploration': 0,
            'Task Focused': 0,
            'Quick Visits': 0
        };
        
        Object.values(featureData).forEach(session => {
            const engagement = session.engagementScore || 0;
            const featureCount = Object.keys(session.features || {}).length;
            
            // Engagement level patterns
            if (engagement > 70) {
                patterns['High Engagement Sessions']++;
            } else if (engagement > 40) {
                patterns['Medium Engagement Sessions']++;
            } else {
                patterns['Low Engagement Sessions']++;
            }
            
            // Behavior patterns
            if (featureCount > 5) {
                patterns['Feature Exploration']++;
            } else if (featureCount <= 2) {
                patterns['Task Focused']++;
            }
            
            if (engagement < 20 && featureCount <= 1) {
                patterns['Quick Visits']++;
            }
        });
        
        this.engagementPatterns = patterns;
    }
    
    analyzeInteractionPatterns(interactions) {
        const patterns = {
            clickPatterns: {},
            scrollBehavior: {},
            timePatterns: {},
            pageEngagement: {}
        };
        
        // Analyze click patterns
        interactions.filter(i => i.type === 'click').forEach(interaction => {
            const hour = interaction.timestamp.getHours();
            patterns.clickPatterns[hour] = (patterns.clickPatterns[hour] || 0) + 1;
        });
        
        // Analyze scroll behavior
        interactions.filter(i => i.type === 'scroll').forEach(interaction => {
            const depth = interaction.data.scrollDepth || 0;
            const depthRange = Math.floor(depth / 20) * 20; // Group by 20% ranges
            patterns.scrollBehavior[depthRange] = (patterns.scrollBehavior[depthRange] || 0) + 1;
        });
        
        // Analyze page engagement
        const pageEngagement = {};
        interactions.forEach(interaction => {
            const page = interaction.page;
            if (!pageEngagement[page]) {
                pageEngagement[page] = {
                    interactions: 0,
                    avgEngagement: 0,
                    engagementScores: []
                };
            }
            
            pageEngagement[page].interactions++;
            if (interaction.engagementScore > 0) {
                pageEngagement[page].engagementScores.push(interaction.engagementScore);
            }
        });
        
        // Calculate average engagement per page
        Object.keys(pageEngagement).forEach(page => {
            const scores = pageEngagement[page].engagementScores;
            if (scores.length > 0) {
                pageEngagement[page].avgEngagement = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            }
        });
        
        patterns.pageEngagement = pageEngagement;
        this.interactionPatterns = patterns;
    }
    
    startAnalysisUpdates() {
        // Update analysis every 2 minutes
        setInterval(() => {
            this.notifyAnalyticsUpdate();
        }, 120000);
    }
    
    notifyAnalyticsUpdate() {
        // Notify analytics dashboard of journey insights
        if (window.analyticsManager) {
            window.analyticsManager.handleJourneyUpdate({
                commonPaths: this.commonPaths,
                dropoffPoints: this.dropoffPoints,
                conversionFunnels: this.conversionFunnels,
                userSegments: this.userSegments,
                featureAdoption: this.featureAdoption,
                engagementPatterns: this.engagementPatterns,
                interactionPatterns: this.interactionPatterns
            });
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('journeyAnalysisUpdate', {
            detail: this.getAnalyticsSummary()
        }));
    }
    
    getAnalyticsSummary() {
        return {
            totalJourneys: this.journeys.length,
            avgJourneyLength: this.calculateAverageJourneyLength(),
            topPaths: Object.entries(this.commonPaths).slice(0, 5),
            highestDropoff: this.getHighestDropoffPoint(),
            topFeatures: this.getTopFeatures(),
            engagementDistribution: this.getEngagementDistribution(),
            conversionRates: this.getConversionRates()
        };
    }
    
    calculateAverageJourneyLength() {
        if (this.journeys.length === 0) return 0;
        
        const totalLength = this.journeys.reduce((sum, journey) => sum + journey.journeyLength, 0);
        return Math.round(totalLength / this.journeys.length);
    }
    
    getHighestDropoffPoint() {
        let highest = { action: 'none', rate: 0 };
        
        Object.entries(this.dropoffPoints).forEach(([action, data]) => {
            if (data.dropoffRate > highest.rate) {
                highest = { action, rate: data.dropoffRate };
            }
        });
        
        return highest;
    }
    
    getTopFeatures() {
        if (!this.featureAdoption) return [];
        
        return Object.entries(this.featureAdoption)
            .sort(([,a], [,b]) => b.adoptionRate - a.adoptionRate)
            .slice(0, 5)
            .map(([feature, data]) => ({
                feature,
                adoptionRate: Math.round(data.adoptionRate),
                totalUsers: data.totalUsers
            }));
    }
    
    getEngagementDistribution() {
        const total = Object.values(this.engagementPatterns).reduce((sum, count) => sum + count, 0);
        
        return Object.entries(this.engagementPatterns).map(([pattern, count]) => ({
            pattern,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0
        }));
    }
    
    getConversionRates() {
        const rates = {};
        
        Object.entries(this.conversionFunnels).forEach(([funnel, steps]) => {
            if (steps.length > 0) {
                rates[funnel] = {
                    overallConversion: steps[steps.length - 1]?.conversionRate || 0,
                    biggestDropoff: this.getBiggestDropoff(steps)
                };
            }
        });
        
        return rates;
    }
    
    getBiggestDropoff(steps) {
        let biggest = { step: 'none', dropoff: 0 };
        
        steps.forEach(step => {
            if (step.dropoff > biggest.dropoff) {
                biggest = { step: step.step, dropoff: step.dropoff };
            }
        });
        
        return biggest;
    }
    
    // Public methods for getting journey analytics
    getJourneyInsights() {
        return {
            commonPaths: this.commonPaths,
            dropoffPoints: this.dropoffPoints,
            conversionFunnels: this.conversionFunnels,
            userSegments: this.userSegments,
            featureAdoption: this.featureAdoption,
            engagementPatterns: this.engagementPatterns,
            summary: this.getAnalyticsSummary()
        };
    }
}

// Initialize journey analyzer
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.journeyAnalyzer) {
        console.warn('⚠️ Journey Analyzer already initialized');
        return;
    }

    setTimeout(() => {
        try {
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
                window.journeyAnalyzer = new JourneyAnalyzer();
                console.warn('🗺️ Journey Analyzer initialized');
            } else {
                console.warn('⚠️ Firebase not available, journey analyzer disabled');
            }
        } catch (error) {
            console.warn('❌ Failed to initialize Journey Analyzer:', error.message);
        }
    }, 8000);
});
