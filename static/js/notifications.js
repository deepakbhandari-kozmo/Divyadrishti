// Real-time Notification System
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.filteredNotifications = [];
        this.unreadCount = 0;
        this.currentUser = null;
        this.notificationsRef = null;
        this.unsubscribe = null;
        this.filters = {
            type: 'all',
            status: 'all',
            priority: 'all'
        };

        this.init();
    }
    
    async init() {
        // Wait for Firebase to be ready
        if (typeof firebase === 'undefined') {
            console.log('Firebase SDK not loaded, waiting...');
            setTimeout(() => this.init(), 1000);
            return;
        }

        if (!firebase.apps || firebase.apps.length === 0) {
            console.log('Firebase not initialized, waiting...');
            setTimeout(() => this.init(), 1000);
            return;
        }

        try {
            // Test Firestore access
            const firestore = firebase.firestore();
            console.log('Firestore instance created:', firestore);

            // Initialize Firestore reference
            this.notificationsRef = firestore.collection('notifications');
            console.log('Notifications collection reference created:', this.notificationsRef);

            this.getCurrentUser();
            this.setupRealtimeListener();
            this.createSampleNotifications();
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            console.error('Firebase apps:', firebase.apps);
            setTimeout(() => this.init(), 2000);
        }
    }
    
    getCurrentUser() {
        // Get current user from session or Firebase Auth
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user.uid;
            } else {
                // Fallback to session username if available
                this.currentUser = document.querySelector('.welcome-text')?.textContent?.replace('Welcome, ', '') || 'admin';
            }
        });
    }
    
    setupRealtimeListener() {
        // Listen for real-time updates to notifications
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        console.log('Setting up real-time listener for notifications...');

        // Try simple query first, then add orderBy if it works
        this.unsubscribe = this.notificationsRef
            .where('isGlobal', '==', true)
            .limit(50)
            .onSnapshot((snapshot) => {
                console.log('Notification snapshot received, docs:', snapshot.size);

                this.notifications = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log('Processing notification:', doc.id, data);
                    this.notifications.push({
                        id: doc.id,
                        ...data
                    });
                });

                // Sort by timestamp manually since orderBy might not work without index
                this.notifications.sort((a, b) => {
                    const aTime = a.timestamp?.toDate?.() || new Date(0);
                    const bTime = b.timestamp?.toDate?.() || new Date(0);
                    return bTime.getTime() - aTime.getTime();
                });

                console.log('Updated notifications array:', this.notifications.length);
                console.log('Notifications:', this.notifications.map(n => ({ id: n.id, title: n.title })));
                this.updateUI();
            }, (error) => {
                console.error('Error in real-time listener:', error);
                console.error('Error details:', error.code, error.message);

                // Try fallback query without orderBy
                this.setupFallbackListener();
            });
    }

    setupFallbackListener() {
        console.log('Setting up fallback listener without orderBy...');

        this.unsubscribe = this.notificationsRef
            .where('isGlobal', '==', true)
            .onSnapshot((snapshot) => {
                console.log('Fallback snapshot received, docs:', snapshot.size);

                this.notifications = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    this.notifications.push({
                        id: doc.id,
                        ...data
                    });
                });

                // Sort manually
                this.notifications.sort((a, b) => {
                    const aTime = a.timestamp?.toDate?.() || new Date(0);
                    const bTime = b.timestamp?.toDate?.() || new Date(0);
                    return bTime.getTime() - aTime.getTime();
                });

                console.log('Fallback notifications loaded:', this.notifications.length);
                this.updateUI();
            }, (error) => {
                console.error('Fallback listener also failed:', error);
                // Try manual refresh as last resort
                setTimeout(() => {
                    this.forceRefresh();
                }, 5000);
            });
    }
    
    async createSampleNotifications() {
        try {
            // Check if sample notifications already exist
            console.log('Checking for existing notifications...');
            const existingNotifications = await this.notificationsRef.limit(1).get();
            console.log('Existing notifications found:', existingNotifications.size);

            if (!existingNotifications.empty) {
                console.log('Sample notifications already exist, skipping creation');
                return; // Sample notifications already exist
            }

            console.log('Creating sample notifications...');
        } catch (error) {
            console.error('Error checking existing notifications:', error);
            return;
        }
        
        const sampleNotifications = [
            {
                type: 'success',
                title: 'System Update Complete',
                message: 'Server maintenance completed successfully. All services are now running normally.',
                timestamp: firebase.firestore.Timestamp.now(),
                isRead: false,
                isGlobal: true,
                priority: 'medium',
                category: 'system',
                actionUrl: '/dashboard'
            },
            {
                type: 'warning',
                title: 'High Memory Usage Detected',
                message: 'System memory usage has exceeded 85%. Consider reviewing running processes.',
                timestamp: firebase.firestore.Timestamp.fromDate(new Date(Date.now() - 15 * 60 * 1000)), // 15 minutes ago
                isRead: false,
                isGlobal: true,
                priority: 'high',
                category: 'system',
                actionUrl: '/dashboard'
            },
            {
                type: 'info',
                title: 'New User Registration',
                message: 'A new user "john.doe@example.com" has registered and is pending approval.',
                timestamp: firebase.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)), // 2 hours ago
                isRead: false,
                isGlobal: true,
                priority: 'medium',
                category: 'user',
                actionUrl: '/dashboard'
            },
            {
                type: 'error',
                title: 'Failed Login Attempts',
                message: 'Multiple failed login attempts detected from IP 192.168.1.100.',
                timestamp: firebase.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 60 * 60 * 1000)), // 4 hours ago
                isRead: true,
                isGlobal: true,
                priority: 'critical',
                category: 'security',
                actionUrl: '/dashboard'
            },
            {
                type: 'success',
                title: 'Database Backup Completed',
                message: 'Scheduled database backup completed successfully at 02:00 AM.',
                timestamp: firebase.firestore.Timestamp.fromDate(new Date(Date.now() - 6 * 60 * 60 * 1000)), // 6 hours ago
                isRead: true,
                isGlobal: true,
                priority: 'low',
                category: 'maintenance',
                actionUrl: null
            }
        ];
        
        // Add sample notifications to Firestore
        for (const notification of sampleNotifications) {
            try {
                await this.notificationsRef.add(notification);
            } catch (error) {
                console.error('Error creating sample notification:', error);
            }
        }
    }
    
    updateUI() {
        this.applyFilters();
        this.updateNotificationsList();
        this.updateUnreadCount();
        this.updateQuickStatsCard();
        this.updateNotificationStats();
    }
    
    applyFilters() {
        this.filteredNotifications = this.notifications.filter(notification => {
            // Type filter
            if (this.filters.type !== 'all' && notification.type !== this.filters.type) {
                return false;
            }

            // Status filter
            if (this.filters.status === 'unread' && notification.isRead) {
                return false;
            }
            if (this.filters.status === 'read' && !notification.isRead) {
                return false;
            }

            // Priority filter
            if (this.filters.priority !== 'all' && notification.priority !== this.filters.priority) {
                return false;
            }

            return true;
        });
    }

    updateNotificationsList() {
        const container = document.getElementById('alerts-container');
        if (!container) return;

        if (this.filteredNotifications.length === 0) {
            const hasNotifications = this.notifications.length > 0;
            container.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-${hasNotifications ? 'filter' : 'bell-slash'}"></i>
                    <p>${hasNotifications ? 'No notifications match the current filters' : 'No notifications at this time'}</p>
                    ${hasNotifications ? '<button onclick="clearAllFilters()" class="btn-secondary">Clear Filters</button>' : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredNotifications.map(notification =>
            this.createNotificationHTML(notification)
        ).join('');

        // Add event listeners for notification actions
        this.attachEventListeners();
    }
    
    createNotificationHTML(notification) {
        const timeAgo = this.getTimeAgo(notification.timestamp);
        const iconClass = this.getNotificationIcon(notification.type);
        const priorityClass = notification.priority || 'medium';
        const readClass = notification.isRead ? 'read' : 'unread';
        
        return `
            <div class="notification-item ${notification.type} ${priorityClass} ${readClass}" data-id="${notification.id}">
                <div class="notification-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <h4>${notification.title}</h4>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    <p class="notification-message">${notification.message}</p>
                    <div class="notification-actions">
                        ${!notification.isRead ? '<button class="mark-read-btn" data-id="' + notification.id + '">Mark as Read</button>' : ''}
                        <button class="delete-btn" data-id="${notification.id}">Delete</button>
                    </div>
                </div>
                <div class="notification-priority">
                    <span class="priority-indicator ${priorityClass}"></span>
                </div>
            </div>
        `;
    }
    
    getNotificationIcon(type) {
        const icons = {
            'success': 'fas fa-check-circle',
            'warning': 'fas fa-exclamation-triangle',
            'error': 'fas fa-times-circle',
            'info': 'fas fa-info-circle'
        };
        return icons[type] || 'fas fa-bell';
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const notificationTime = timestamp.toDate();
        const diffInSeconds = Math.floor((now - notificationTime) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }
    
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        
        // Update alert count in quick stats
        const alertCountElement = document.getElementById('alert-count');
        if (alertCountElement) {
            alertCountElement.textContent = this.unreadCount;
        }
    }
    
    updateQuickStatsCard() {
        // Update the quick stats card with real notification count
        const alertCard = document.querySelector('.stat-card:last-child h3');
        if (alertCard) {
            alertCard.textContent = this.unreadCount;
        }
    }

    updateNotificationStats() {
        // Update total notifications
        const totalElement = document.getElementById('total-notifications');
        if (totalElement) {
            totalElement.textContent = this.notifications.length;
        }

        // Update unread notifications
        const unreadElement = document.getElementById('unread-notifications');
        if (unreadElement) {
            unreadElement.textContent = this.unreadCount;
        }

        // Update critical notifications
        const criticalCount = this.notifications.filter(n => n.priority === 'critical').length;
        const criticalElement = document.getElementById('critical-notifications');
        if (criticalElement) {
            criticalElement.textContent = criticalCount;
        }
    }
    
    async markAsRead(notificationId) {
        try {
            await this.notificationsRef.doc(notificationId).update({
                isRead: true
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
    
    async dismissNotification(notificationId) {
        try {
            console.log('🗑️ Starting dismissNotification for ID:', notificationId);
            console.log('🔍 Notifications ref available:', !!this.notificationsRef);

            if (!this.notificationsRef) {
                throw new Error('Notifications reference not available');
            }

            console.log('🔥 Deleting from Firestore...');
            await this.notificationsRef.doc(notificationId).delete();
            console.log('✅ Notification dismissed successfully from Firestore');

            // Also remove from local array for immediate UI update
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            this.updateUI();

            showToast('Notification deleted', 'success');
        } catch (error) {
            console.error('❌ Error dismissing notification:', error);
            console.error('Error details:', error.message);
            showToast('Error deleting notification: ' + error.message, 'error');
        }
    }
    
    async clearAllAlerts() {
        try {
            const batch = firebase.firestore().batch();
            this.notifications.forEach(notification => {
                const docRef = this.notificationsRef.doc(notification.id);
                batch.update(docRef, { isRead: true });
            });
            await batch.commit();
            showToast('All notifications marked as read', 'success');
        } catch (error) {
            console.error('Error clearing all alerts:', error);
            showToast('Error marking notifications as read', 'error');
        }
    }

    async deleteReadNotifications() {
        try {
            const readNotifications = this.notifications.filter(n => n.isRead);

            if (readNotifications.length === 0) {
                showToast('No read notifications to delete', 'info');
                return;
            }

            const batch = firebase.firestore().batch();
            readNotifications.forEach(notification => {
                const docRef = this.notificationsRef.doc(notification.id);
                batch.delete(docRef);
            });

            await batch.commit();
            showToast(`Deleted ${readNotifications.length} read notifications`, 'success');
        } catch (error) {
            console.error('Error deleting read notifications:', error);
            showToast('Error deleting notifications', 'error');
        }
    }
    
    attachEventListeners() {
        // Remove existing listeners to prevent duplicates
        const container = document.getElementById('alerts-container');
        if (!container) return;

        // Use event delegation for better performance
        container.removeEventListener('click', this.handleNotificationClick);
        container.addEventListener('click', this.handleNotificationClick.bind(this));
    }

    handleNotificationClick(event) {
        const target = event.target;

        if (target.classList.contains('delete-btn')) {
            const notificationId = target.getAttribute('data-id');
            console.log('🗑️ Delete button clicked for notification:', notificationId);
            this.dismissNotification(notificationId);
        } else if (target.classList.contains('mark-read-btn')) {
            const notificationId = target.getAttribute('data-id');
            console.log('📖 Mark as read button clicked for notification:', notificationId);
            this.markAsRead(notificationId);
        }
    }
    
    // Public method to create new notifications (for admin use)
    async createNotification(notificationData) {
        try {
            // Check if Firebase is properly initialized
            if (!this.notificationsRef) {
                console.error('Firestore not initialized. Attempting to reinitialize...');
                await this.init();

                // If still not initialized, return error
                if (!this.notificationsRef) {
                    throw new Error('Failed to initialize Firestore');
                }
            }

            const notification = {
                ...notificationData,
                timestamp: firebase.firestore.Timestamp.now(),
                isRead: false,
                isGlobal: true
            };

            console.log('Creating notification:', notification);
            const docRef = await this.notificationsRef.add(notification);
            console.log('Notification created successfully with ID:', docRef.id);

            // Force refresh the UI after a short delay to ensure the real-time listener catches it
            setTimeout(() => {
                this.forceRefresh();
            }, 1000);

            return true;
        } catch (error) {
            console.error('Error creating notification:', error);
            return false;
        }
    }

    // Force refresh notifications from database
    async forceRefresh() {
        try {
            console.log('Force refreshing notifications...');

            // Try with orderBy first
            let snapshot;
            try {
                snapshot = await this.notificationsRef
                    .where('isGlobal', '==', true)
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .get();
            } catch (orderByError) {
                console.warn('OrderBy failed, trying without:', orderByError);
                // Fallback without orderBy
                snapshot = await this.notificationsRef
                    .where('isGlobal', '==', true)
                    .get();
            }

            this.notifications = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Force refresh - processing doc:', doc.id, data);
                this.notifications.push({
                    id: doc.id,
                    ...data
                });
            });

            // Sort manually if we couldn't use orderBy
            this.notifications.sort((a, b) => {
                const aTime = a.timestamp?.toDate?.() || new Date(0);
                const bTime = b.timestamp?.toDate?.() || new Date(0);
                return bTime.getTime() - aTime.getTime();
            });

            console.log('Force refresh complete, notifications:', this.notifications.length);
            console.log('Notification titles:', this.notifications.map(n => n.title));
            this.updateUI();
        } catch (error) {
            console.error('Error force refreshing notifications:', error);
            console.error('Error details:', error.code, error.message);
        }
    }
}

// Global functions for dashboard
function clearAllAlerts() {
    if (window.notificationManager) {
        window.notificationManager.clearAllAlerts();
    }
}

function deleteReadNotifications() {
    if (window.notificationManager) {
        // Confirm before deleting
        if (confirm('Are you sure you want to delete all read notifications? This action cannot be undone.')) {
            window.notificationManager.deleteReadNotifications();
        }
    }
}

// Global function to delete individual notification
window.deleteNotification = function(notificationId) {
    console.log('🗑️ Global deleteNotification called with ID:', notificationId);
    console.log('🔍 Notification manager available:', !!window.notificationManager);

    if (window.notificationManager) {
        console.log('✅ Calling dismissNotification...');
        window.notificationManager.dismissNotification(notificationId);
    } else {
        console.error('❌ Notification manager not available');
        alert('Error: Notification manager not available');
    }
};

// Also define as regular function for compatibility
function deleteNotification(notificationId) {
    window.deleteNotification(notificationId);
}

// Test function to check if delete works
window.testDeleteFunction = function() {
    console.log('🧪 Testing delete function...');
    console.log('Notification manager:', window.notificationManager);
    console.log('Available notifications:', window.notificationManager?.notifications?.length || 0);

    if (window.notificationManager && window.notificationManager.notifications.length > 0) {
        const firstNotification = window.notificationManager.notifications[0];
        console.log('Testing delete on first notification:', firstNotification.id, firstNotification.title);
        window.deleteNotification(firstNotification.id);
    } else {
        console.log('No notifications available to test delete');
    }
};

// Global function to mark notification as read
window.markNotificationAsRead = function(notificationId) {
    console.log('📖 Global markNotificationAsRead called with ID:', notificationId);
    if (window.notificationManager) {
        window.notificationManager.markAsRead(notificationId);
    } else {
        console.error('Notification manager not available');
        showToast('Error: Notification manager not available', 'error');
    }
};

// Also define as regular function for compatibility
function markNotificationAsRead(notificationId) {
    window.markNotificationAsRead(notificationId);
}

function showAddNotificationModal() {
    const modal = document.getElementById('notification-modal');
    if (modal) {
        modal.style.display = 'block';
        // Reset form
        document.getElementById('notification-form').reset();
    }
}

function closeNotificationModal() {
    const modal = document.getElementById('notification-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function createNotification() {
    const form = document.getElementById('notification-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const notificationData = {
        type: document.getElementById('notification-type').value,
        priority: document.getElementById('notification-priority').value,
        category: document.getElementById('notification-category').value,
        title: document.getElementById('notification-title').value,
        message: document.getElementById('notification-message').value,
        actionUrl: document.getElementById('notification-action-url').value || null
    };

    try {
        let success = false;

        // Try using the notification manager first
        if (window.notificationManager && window.notificationManager.notificationsRef) {
            success = await window.notificationManager.createNotification(notificationData);
        } else {
            // Fallback: create notification directly
            console.log('Using fallback method to create notification');

            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
                const notification = {
                    ...notificationData,
                    timestamp: firebase.firestore.Timestamp.now(),
                    isRead: false,
                    isGlobal: true
                };

                await firebase.firestore().collection('notifications').add(notification);
                success = true;
            } else {
                throw new Error('Firebase not available');
            }
        }

        if (success) {
            closeNotificationModal();
            showToast('Notification created successfully!', 'success');
        } else {
            showToast('Error creating notification. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error in createNotification:', error);
        showToast('Error creating notification: ' + error.message, 'error');
    }
}

function showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Filter functions
function filterNotifications() {
    if (!window.notificationManager) return;

    const typeFilter = document.getElementById('filter-type').value;
    const statusFilter = document.getElementById('filter-status').value;
    const priorityFilter = document.getElementById('filter-priority').value;

    window.notificationManager.filters = {
        type: typeFilter,
        status: statusFilter,
        priority: priorityFilter
    };

    window.notificationManager.updateUI();
}

function clearAllFilters() {
    // Reset all filter dropdowns
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-status').value = 'all';
    document.getElementById('filter-priority').value = 'all';

    // Apply the cleared filters
    filterNotifications();
}

function refreshNotifications() {
    const btn = document.querySelector('.notification-control-btn:last-child');
    if (btn) {
        btn.classList.add('spinning');
        btn.disabled = true;
    }

    if (window.notificationManager) {
        window.notificationManager.forceRefresh().then(() => {
            showToast('Notifications refreshed', 'success');
        }).catch((error) => {
            showToast('Error refreshing notifications', 'error');
        }).finally(() => {
            if (btn) {
                btn.classList.remove('spinning');
                btn.disabled = false;
            }
        });
    } else {
        showToast('Notification manager not available', 'error');
        if (btn) {
            btn.classList.remove('spinning');
            btn.disabled = false;
        }
    }
}

// Debug function to test Firebase connectivity
async function testFirebaseConnection() {
    console.log('=== Firebase Connection Test ===');
    console.log('Firebase available:', typeof firebase !== 'undefined');
    console.log('Firebase apps:', firebase?.apps?.length || 0);

    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        try {
            const firestore = firebase.firestore();
            console.log('Firestore instance:', firestore);

            // Check authentication status
            const auth = firebase.auth();
            const currentUser = auth.currentUser;
            console.log('Current user:', currentUser);
            console.log('User authenticated:', !!currentUser);

            const testRef = firestore.collection('notifications');
            console.log('Test collection reference:', testRef);

            // Try to read ALL notifications first
            console.log('Attempting to read ALL notifications...');
            const allSnapshot = await testRef.get();
            console.log('Total documents in collection:', allSnapshot.size);

            allSnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Document:', doc.id, {
                    title: data.title,
                    isGlobal: data.isGlobal,
                    timestamp: data.timestamp?.toDate?.()
                });
            });

            // Try to read with isGlobal filter
            console.log('Attempting to read with isGlobal=true filter...');
            const globalSnapshot = await testRef.where('isGlobal', '==', true).get();
            console.log('Global notifications found:', globalSnapshot.size);

            // Try to write a test document
            console.log('Attempting to write test notification...');
            const testNotification = {
                type: 'info',
                title: 'Connection Test - ' + new Date().toLocaleTimeString(),
                message: 'This is a test notification to verify Firebase connectivity.',
                timestamp: firebase.firestore.Timestamp.now(),
                isRead: false,
                isGlobal: true,
                priority: 'low',
                category: 'system'
            };

            const docRef = await testRef.add(testNotification);
            console.log('Write test successful! Document ID:', docRef.id);

            // Verify the document was written
            const verifyDoc = await docRef.get();
            console.log('Verification - document exists:', verifyDoc.exists);
            console.log('Verification - document data:', verifyDoc.data());

            showToast('Firebase connection and permissions working!', 'success');
            return true;
        } catch (error) {
            console.error('Firebase test failed:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);

            if (error.code === 'permission-denied') {
                showToast('Permission denied - check Firestore rules', 'error');
            } else if (error.code === 'unauthenticated') {
                showToast('Authentication required', 'error');
            } else {
                showToast('Firebase error: ' + error.message, 'error');
            }
            return false;
        }
    } else {
        console.error('Firebase not initialized');
        showToast('Firebase not initialized', 'error');
        return false;
    }
}

// Debug function to check what's in the database
async function debugNotifications() {
    if (!window.notificationManager) {
        console.error('Notification manager not available');
        return;
    }

    try {
        console.log('=== Debug Notifications ===');
        const firestore = firebase.firestore();
        const notificationsRef = firestore.collection('notifications');

        // Get all documents
        const allDocs = await notificationsRef.get();
        console.log('Total documents in notifications collection:', allDocs.size);

        allDocs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`Document ${index + 1}:`, {
                id: doc.id,
                title: data.title,
                type: data.type,
                isGlobal: data.isGlobal,
                isRead: data.isRead,
                timestamp: data.timestamp?.toDate?.(),
                priority: data.priority,
                category: data.category
            });
        });

        // Check current notifications in manager
        console.log('Notifications in manager:', window.notificationManager.notifications.length);
        window.notificationManager.notifications.forEach((notif, index) => {
            console.log(`Manager notification ${index + 1}:`, {
                id: notif.id,
                title: notif.title,
                type: notif.type
            });
        });

    } catch (error) {
        console.error('Debug failed:', error);
    }
}

// Initialize notification manager when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing notification manager...');

    // Function to check if Firebase is ready
    function initializeNotificationManager() {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            console.log('Firebase is ready, creating NotificationManager');
            window.notificationManager = new NotificationManager();
            return true;
        }
        return false;
    }

    // Try to initialize immediately
    if (!initializeNotificationManager()) {
        console.log('Firebase not ready, waiting...');

        // Retry every second for up to 10 seconds
        let attempts = 0;
        const maxAttempts = 10;

        const retryInterval = setInterval(() => {
            attempts++;
            console.log(`Attempt ${attempts} to initialize Firebase...`);

            if (initializeNotificationManager()) {
                clearInterval(retryInterval);
            } else if (attempts >= maxAttempts) {
                console.error('Failed to initialize Firebase after', maxAttempts, 'attempts');
                clearInterval(retryInterval);
            }
        }, 1000);
    }
});
