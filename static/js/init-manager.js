// Initialization Manager - Prevents conflicts and ensures proper loading order
class InitializationManager {
    constructor() {
        this.initialized = new Set();
        this.initQueue = [];
        this.isProcessing = false;
        
        console.warn('🚀 Initialization Manager started');
    }
    
    register(name, initFunction, dependencies = [], delay = 0) {
        this.initQueue.push({
            name,
            initFunction,
            dependencies,
            delay,
            status: 'pending'
        });
        
        console.warn(`📝 Registered: ${name} (dependencies: ${dependencies.join(', ') || 'none'})`);
    }
    
    async start() {
        if (this.isProcessing) {
            console.warn('⚠️ Initialization already in progress');
            return;
        }
        
        this.isProcessing = true;
        console.warn('🚀 Starting initialization sequence...');
        
        while (this.initQueue.length > 0) {
            const readyItems = this.initQueue.filter(item => 
                item.status === 'pending' && 
                this.areDependenciesMet(item.dependencies)
            );
            
            if (readyItems.length === 0) {
                console.warn('⚠️ No ready items, checking for circular dependencies...');
                // Try to initialize items with unmet dependencies (might be optional)
                const fallbackItems = this.initQueue.filter(item => item.status === 'pending');
                if (fallbackItems.length > 0) {
                    await this.initializeItem(fallbackItems[0]);
                } else {
                    break;
                }
            } else {
                // Initialize all ready items
                for (const item of readyItems) {
                    await this.initializeItem(item);
                }
            }
        }
        
        this.isProcessing = false;
        console.warn('✅ Initialization sequence completed');
        this.logStatus();
    }
    
    areDependenciesMet(dependencies) {
        return dependencies.every(dep => this.initialized.has(dep));
    }
    
    async initializeItem(item) {
        try {
            console.warn(`🔄 Initializing: ${item.name}...`);
            
            // Apply delay if specified
            if (item.delay > 0) {
                await new Promise(resolve => setTimeout(resolve, item.delay));
            }
            
            // Call initialization function
            await item.initFunction();
            
            // Mark as initialized
            this.initialized.add(item.name);
            item.status = 'completed';
            
            // Remove from queue
            this.initQueue = this.initQueue.filter(i => i !== item);
            
            console.warn(`✅ Initialized: ${item.name}`);
            
        } catch (error) {
            console.warn(`❌ Failed to initialize ${item.name}:`, error.message);
            item.status = 'failed';
            
            // Remove failed item from queue to prevent blocking
            this.initQueue = this.initQueue.filter(i => i !== item);
        }
    }
    
    logStatus() {
        console.warn('📊 Initialization Status:');
        console.warn('✅ Initialized:', Array.from(this.initialized));
        
        const failed = this.initQueue.filter(item => item.status === 'failed');
        if (failed.length > 0) {
            console.warn('❌ Failed:', failed.map(item => item.name));
        }
        
        const pending = this.initQueue.filter(item => item.status === 'pending');
        if (pending.length > 0) {
            console.warn('⏳ Still pending:', pending.map(item => item.name));
        }
    }
    
    isInitialized(name) {
        return this.initialized.has(name);
    }
    
    waitFor(name, timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (this.initialized.has(name)) {
                resolve();
                return;
            }
            
            const checkInterval = setInterval(() => {
                if (this.initialized.has(name)) {
                    clearInterval(checkInterval);
                    clearTimeout(timeoutHandle);
                    resolve();
                }
            }, 100);
            
            const timeoutHandle = setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error(`Timeout waiting for ${name} to initialize`));
            }, timeout);
        });
    }
}

// Global initialization manager
window.initManager = new InitializationManager();

// Safe initialization wrapper
function safeInit(name, initFunction, dependencies = [], delay = 0) {
    window.initManager.register(name, initFunction, dependencies, delay);
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.warn('📄 DOM loaded, registering analytics components...');
    
    // Register all analytics components with proper dependencies
    
    // Core components (no dependencies)
    safeInit('toast-manager', () => {
        if (!window.toastManager) {
            window.toastManager = new ToastManager();
        }
    }, [], 0);
    
    // Analytics components (require Firebase check)
    safeInit('real-analytics', () => {
        if (!window.realAnalytics) {
            window.realAnalytics = new RealAnalyticsCollector();
        }
    }, ['toast-manager'], 3000);
    
    safeInit('real-analytics-processor', () => {
        if (!window.realAnalyticsProcessor) {
            window.realAnalyticsProcessor = new RealAnalyticsProcessor();
        }
    }, ['real-analytics'], 1000);
    
    safeInit('performance-monitor', () => {
        if (!window.performanceMonitor) {
            window.performanceMonitor = new PerformanceMonitor();
        }
    }, ['toast-manager'], 2000);
    
    safeInit('error-tracker', () => {
        if (!window.errorTracker) {
            window.errorTracker = new ErrorTracker();
        }
    }, ['toast-manager'], 3000);
    
    safeInit('interaction-tracker', () => {
        if (!window.interactionTracker) {
            window.interactionTracker = new InteractionTracker();
        }
    }, ['real-analytics'], 4000);
    
    safeInit('journey-analyzer', () => {
        if (!window.journeyAnalyzer) {
            window.journeyAnalyzer = new JourneyAnalyzer();
        }
    }, ['real-analytics-processor'], 1000);
    
    // Dashboard components (require Chart.js)
    safeInit('analytics-manager', () => {
        if (!window.analyticsManager && typeof Chart !== 'undefined') {
            window.analyticsManager = new AnalyticsManager();
        }
    }, ['real-analytics-processor'], 0);
    
    safeInit('realtime-dashboard', () => {
        if (!window.realtimeDashboard && typeof Chart !== 'undefined') {
            window.realtimeDashboard = new RealtimeDashboard();
        }
    }, ['analytics-manager', 'performance-monitor'], 2000);
    
    safeInit('system-status-monitor', () => {
        if (!window.systemStatusMonitor) {
            window.systemStatusMonitor = new SystemStatusMonitor();
        }
    }, ['realtime-dashboard'], 2000);
    
    // Start initialization after a short delay
    setTimeout(() => {
        window.initManager.start();
    }, 1000);
});
