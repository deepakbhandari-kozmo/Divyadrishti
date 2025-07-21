// Profile Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeProfile();
});

function initializeProfile() {
    // Initialize tab navigation
    initializeTabs();
    
    // Initialize forms
    initializeForms();
    
    // Load user settings
    loadUserSettings();
    
    // Load activity log
    loadActivityLog();
    
    // Apply saved theme
    applySavedTheme();
}

// Tab Navigation
function initializeTabs() {
    const navLinks = document.querySelectorAll('.nav-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all nav links and tab panes
            navLinks.forEach(nav => nav.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked nav link and corresponding tab pane
            this.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// Form Initialization
function initializeForms() {
    // Profile form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Password form
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // Settings form
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettingsUpdate);
        
        // Theme change handler
        const themeInputs = document.querySelectorAll('input[name="theme"]');
        themeInputs.forEach(input => {
            input.addEventListener('change', function() {
                if (this.checked) {
                    applyTheme(this.value);
                }
            });
        });

        // Language change handler
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.addEventListener('change', function() {
                changeLanguage(this.value);
            });
        }
    }
}

// Profile Update Handler
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = {
        full_name: document.getElementById('full_name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        organization: document.getElementById('organization').value
    };
    
    try {
        const response = await fetch('/api/profile/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Failed to update profile', 'error');
    }
}

// Password Change Handler
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current_password').value;
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    
    // Client-side validation
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }
    
    const formData = {
        old_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
    };
    
    try {
        const response = await fetch('/api/profile/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            // Clear password fields
            document.getElementById('password-form').reset();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('Failed to change password', 'error');
    }
}

// Settings Update Handler
async function handleSettingsUpdate(e) {
    e.preventDefault();
    
    const formData = {
        theme: document.querySelector('input[name="theme"]:checked').value,
        language: document.getElementById('language').value,
        notifications: document.getElementById('notifications').checked,
        email_notifications: document.getElementById('email_notifications').checked
    };

    // Save settings locally as well
    localStorage.setItem('theme', formData.theme);
    localStorage.setItem('language', formData.language);
    localStorage.setItem('notifications', formData.notifications);
    localStorage.setItem('email_notifications', formData.email_notifications);
    
    try {
        const response = await fetch('/api/profile/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            // Save theme preference
            localStorage.setItem('theme', formData.theme);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error updating settings:', error);
        showNotification('Failed to update settings', 'error');
    }
}

// Load User Settings
function loadUserSettings() {
    // Load theme setting
    const savedTheme = localStorage.getItem('theme') || 'light';
    const themeInput = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
    if (themeInput) {
        themeInput.checked = true;
    }

    // Load language setting
    const savedLanguage = localStorage.getItem('language') || 'en';
    const languageSelect = document.getElementById('language');
    if (languageSelect) {
        languageSelect.value = savedLanguage;
    }

    // Load other settings from localStorage
    const notifications = localStorage.getItem('notifications') !== 'false';
    const emailNotifications = localStorage.getItem('email_notifications') === 'true';

    document.getElementById('notifications').checked = notifications;
    document.getElementById('email_notifications').checked = emailNotifications;
}

// Load Activity Log
async function loadActivityLog() {
    const activityList = document.getElementById('activity-list');
    
    try {
        // This would typically fetch from the server
        // For now, we'll show some sample data
        const activities = [
            {
                type: 'login',
                title: 'Logged in to account',
                time: '2 hours ago'
            },
            {
                type: 'profile_update',
                title: 'Updated profile information',
                time: '1 day ago'
            },
            {
                type: 'password_change',
                title: 'Changed password',
                time: '3 days ago'
            },
            {
                type: 'settings_update',
                title: 'Updated app settings',
                time: '1 week ago'
            }
        ];
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon activity-${activity.type}">
                    <i class="fas ${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading activity log:', error);
        activityList.innerHTML = '<div class="loading">Failed to load activity log</div>';
    }
}

// Get Activity Icon
function getActivityIcon(type) {
    const icons = {
        login: 'fa-sign-in-alt',
        profile_update: 'fa-user-edit',
        password_change: 'fa-key',
        settings_update: 'fa-cog'
    };
    return icons[type] || 'fa-circle';
}

// Theme Management
function applyTheme(theme) {
    // Apply theme to current page
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }

    // Save theme preference
    localStorage.setItem('theme', theme);

    // Apply theme globally by adding CSS class to html element
    // This ensures theme persists across page navigation
    document.documentElement.setAttribute('data-theme', theme);

    console.log(`Theme changed to: ${theme}`);
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // Update the radio button to match saved theme
    const themeInput = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
    if (themeInput) {
        themeInput.checked = true;
    }
}

// Password Toggle
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Reset Profile Form
function resetProfileForm() {
    const form = document.getElementById('profile-form');
    const originalValues = {
        full_name: form.querySelector('#full_name').defaultValue,
        email: form.querySelector('#email').defaultValue,
        phone: form.querySelector('#phone').defaultValue,
        organization: form.querySelector('#organization').defaultValue
    };
    
    Object.keys(originalValues).forEach(key => {
        document.getElementById(key).value = originalValues[key];
    });
}

// Notification System
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    // Remove on click
    notification.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

// Language Management
function changeLanguage(language) {
    // Save language preference
    localStorage.setItem('language', language);

    // Apply language globally
    document.documentElement.setAttribute('lang', language);

    console.log(`Language changed to: ${language}`);

    // Show notification
    const message = language === 'hi' ? 'भाषा हिंदी में बदल गई' : 'Language changed to English';
    showNotification(message, 'success');

    // Note: Full language implementation would require translating all text
    // For now, we're just saving the preference and showing a notification
}
