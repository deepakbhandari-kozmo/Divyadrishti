// Simple Toast Notification System
class ToastManager {
    constructor() {
        this.toasts = [];
        this.container = null;
        this.init();
    }
    
    init() {
        this.createContainer();
    }
    
    createContainer() {
        // Create toast container if it doesn't exist
        this.container = document.getElementById('toast-container');
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }
    
    show(message, type = 'info', duration = 4000) {
        const toast = this.createToast(message, type, duration);
        this.container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        return toast;
    }
    
    createToast(message, type, duration) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        return toast;
    }
    
    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        
        return icons[type] || icons.info;
    }
    
    removeToast(toast) {
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }
    
    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }
    
    error(message, duration = 6000) {
        return this.show(message, 'error', duration);
    }
    
    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }
    
    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }
}

// Global toast function
function showToast(message, type = 'info', duration = 4000) {
    if (!window.toastManager) {
        window.toastManager = new ToastManager();
    }
    
    return window.toastManager.show(message, type, duration);
}

// Initialize toast manager
document.addEventListener('DOMContentLoaded', function() {
    window.toastManager = new ToastManager();
    console.log('🍞 Toast Manager initialized');
});
