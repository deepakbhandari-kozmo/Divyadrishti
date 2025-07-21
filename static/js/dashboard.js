// Dashboard JavaScript with Chart.js
let storageChart, activityChart, projectChart;
let refreshInterval;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupAutoRefresh();
});

// Initialize all dashboard components
function initializeDashboard() {
    loadQuickStats();
    loadStorageData();
    loadActivityData();
    loadProjectData();
    loadAlerts();
    loadUsers();
    loadPendingUsers();
    initializeCharts();
}

// Setup auto-refresh for real-time updates
function setupAutoRefresh() {
    refreshInterval = setInterval(() => {
        loadQuickStats();
        loadStorageData();
        loadActivityData();
        loadAlerts();
        loadPendingUsers();
    }, 30000); // Refresh every 30 seconds
}

// Load quick stats for stat cards
async function loadQuickStats() {
    try {
        const [storageResponse, activityResponse, projectResponse, alertsResponse] = await Promise.all([
            fetch('/api/dashboard/storage'),
            fetch('/api/dashboard/user_activity'),
            fetch('/api/dashboard/project_performance'),
            fetch('/api/dashboard/alerts')
        ]);

        const storageData = await storageResponse.json();
        const activityData = await activityResponse.json();
        const projectData = await projectResponse.json();
        const alertsData = await alertsResponse.json();

        // Update stat cards
        document.getElementById('storage-usage').textContent = `${storageData.disk.usage_percent}%`;
        document.getElementById('active-users').textContent = activityData.active_sessions;
        document.getElementById('total-projects').textContent = projectData.metrics.total_projects;
        document.getElementById('alert-count').textContent = alertsData.unread_count;

    } catch (error) {
        console.error('Error loading quick stats:', error);
    }
}

// Load and display storage monitoring data
async function loadStorageData() {
    try {
        const response = await fetch('/api/dashboard/storage');
        const data = await response.json();

        // Update progress bars
        const diskProgress = document.getElementById('disk-progress');
        const memoryProgress = document.getElementById('memory-progress');
        const diskUsage = document.getElementById('disk-usage');
        const memoryUsage = document.getElementById('memory-usage');

        diskProgress.style.width = `${data.disk.usage_percent}%`;
        memoryProgress.style.width = `${data.memory.usage_percent}%`;
        diskUsage.textContent = `${data.disk.used_gb}GB / ${data.disk.total_gb}GB`;
        memoryUsage.textContent = `${data.memory.used_gb}GB / ${data.memory.total_gb}GB`;

        // Update storage chart
        updateStorageChart(data);

    } catch (error) {
        console.error('Error loading storage data:', error);
    }
}

// Load and display user activity analytics
async function loadActivityData() {
    try {
        const response = await fetch('/api/dashboard/user_activity');
        const data = await response.json();

        updateActivityChart(data.weekly_activity);

    } catch (error) {
        console.error('Error loading activity data:', error);
    }
}

// Load and display project performance data
async function loadProjectData() {
    try {
        const response = await fetch('/api/dashboard/project_performance');
        const data = await response.json();

        updateProjectChart(data.metrics);
        displayProjectList(data.projects);

    } catch (error) {
        console.error('Error loading project data:', error);
    }
}

// Load and display alerts
async function loadAlerts() {
    try {
        const response = await fetch('/api/dashboard/alerts');
        const data = await response.json();

        displayAlerts(data.alerts);

    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

// Load and display users for role management
async function loadUsers() {
    try {
        console.log('Loading users...');
        const response = await fetch('/api/dashboard/users');
        console.log('Users API response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Users data received:', data);

        if (data.users) {
            displayUsers(data.users);
        } else if (data.error) {
            displayUsersError(data.error);
        } else {
            displayUsersError('No user data received');
        }

    } catch (error) {
        console.error('Error loading users:', error);
        displayUsersError(`Failed to load users: ${error.message}`);
    }
}

// Load and display pending users
async function loadPendingUsers() {
    try {
        const response = await fetch('/api/dashboard/pending_users');
        const data = await response.json();

        displayPendingUsers(data.pending_users);
        document.getElementById('pending-count').textContent = data.count;

    } catch (error) {
        console.error('Error loading pending users:', error);
    }
}

// Initialize Chart.js charts
function initializeCharts() {
    // Storage Chart (Doughnut)
    const storageCtx = document.getElementById('storageChart').getContext('2d');
    storageChart = new Chart(storageCtx, {
        type: 'doughnut',
        data: {
            labels: ['Used Space', 'Free Space'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#e74c3c', '#2ecc71'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            layout: {
                padding: 10
            }
        }
    });

    // Activity Chart (Line)
    const activityCtx = document.getElementById('activityChart').getContext('2d');
    activityChart = new Chart(activityCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Logins',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4
            }, {
                label: 'Map Views',
                data: [],
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                tension: 0.4
            }, {
                label: 'Exports',
                data: [],
                borderColor: '#f39c12',
                backgroundColor: 'rgba(243, 156, 18, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            layout: {
                padding: 10
            }
        }
    });

    // Project Chart (Bar)
    const projectCtx = document.getElementById('projectChart').getContext('2d');
    projectChart = new Chart(projectCtx, {
        type: 'bar',
        data: {
            labels: ['Active', 'Completed', 'Pending'],
            datasets: [{
                label: 'Projects',
                data: [0, 0, 0],
                backgroundColor: ['#3498db', '#2ecc71', '#f39c12'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            layout: {
                padding: 10
            }
        }
    });
}

// Update storage chart with new data
function updateStorageChart(data) {
    if (storageChart) {
        storageChart.data.datasets[0].data = [data.disk.used_gb, data.disk.free_gb];
        storageChart.update();
    }
}

// Update activity chart with new data
function updateActivityChart(activityData) {
    if (activityChart) {
        const labels = activityData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }).reverse();

        activityChart.data.labels = labels;
        activityChart.data.datasets[0].data = activityData.map(item => item.logins).reverse();
        activityChart.data.datasets[1].data = activityData.map(item => item.map_views).reverse();
        activityChart.data.datasets[2].data = activityData.map(item => item.exports).reverse();
        activityChart.update();
    }
}

// Update project chart with new data
function updateProjectChart(metrics) {
    if (projectChart) {
        projectChart.data.datasets[0].data = [
            metrics.active_projects,
            metrics.completed_projects,
            metrics.total_projects - metrics.active_projects - metrics.completed_projects
        ];
        projectChart.update();
    }
}

// Display project list
function displayProjectList(projects) {
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';

    projects.forEach(project => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        projectItem.innerHTML = `
            <div class="project-header">
                <span class="project-name">${project.name}</span>
                <span class="project-status ${project.status}">${project.status.charAt(0).toUpperCase() + project.status.slice(1)}</span>
            </div>
            <div class="project-progress">
                <div class="project-progress-fill" style="width: ${project.completion}%"></div>
            </div>
            <div class="project-meta">
                <span>${project.layers} layers • ${project.size_mb}MB</span>
                <span>Updated ${project.last_updated}</span>
            </div>
        `;
        projectList.appendChild(projectItem);
    });
}

// Display alerts
function displayAlerts(alerts) {
    const alertsContainer = document.getElementById('alerts-container');
    alertsContainer.innerHTML = '';

    alerts.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.className = `alert-item ${alert.type}`;
        
        const alertTime = new Date(alert.timestamp).toLocaleString();
        
        alertItem.innerHTML = `
            <div class="alert-header">
                <span class="alert-title">${alert.title}</span>
                <span class="alert-time">${alertTime}</span>
            </div>
            <div class="alert-message">${alert.message}</div>
        `;
        alertsContainer.appendChild(alertItem);
    });
}

// Display users table
function displayUsers(users) {
    const usersTableBody = document.getElementById('users-table-body');
    usersTableBody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        const lastLogin = new Date(user.last_login).toLocaleDateString();
        
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><span class="user-role ${user.role}">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span></td>
            <td><span class="user-status ${user.status}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span></td>
            <td>${lastLogin}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editUser('${user.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteUser('${user.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        usersTableBody.appendChild(row);
    });

    // Show no users message if empty
    if (users.length === 0) {
        const usersTableBody = document.getElementById('users-table-body');
        usersTableBody.innerHTML = '<tr><td colspan="6" class="no-users-message">No users found</td></tr>';
    }
}

// Display users error message
function displayUsersError(errorMessage) {
    const usersTableBody = document.getElementById('users-table-body');
    usersTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="error-message">
                <i class="fas fa-exclamation-triangle"></i> ${errorMessage}
            </td>
        </tr>
    `;
}

// Display pending users
function displayPendingUsers(pendingUsers) {
    const container = document.getElementById('pending-users-container');
    container.innerHTML = '';

    if (pendingUsers.length === 0) {
        container.innerHTML = '<div class="no-pending-users">No pending user registrations</div>';
        return;
    }

    pendingUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'pending-user-item';

        const createdDate = new Date(user.created_date).toLocaleDateString();

        userItem.innerHTML = `
            <div class="pending-user-header">
                <div class="pending-user-info">
                    <div class="pending-user-name">${user.full_name}</div>
                    <div class="pending-user-email">${user.email}</div>
                </div>
                <div class="pending-user-actions">
                    <button class="approve-btn" onclick="approveUser('${user.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="reject-btn" onclick="rejectUser('${user.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
            <div class="pending-user-details">
                <div class="pending-detail">
                    <span class="pending-detail-label">Username:</span>
                    <span class="pending-detail-value">${user.username}</span>
                </div>
                <div class="pending-detail">
                    <span class="pending-detail-label">Organization:</span>
                    <span class="pending-detail-value">${user.organization || 'Not specified'}</span>
                </div>
                <div class="pending-detail">
                    <span class="pending-detail-label">Phone:</span>
                    <span class="pending-detail-value">${user.phone || 'Not specified'}</span>
                </div>
                <div class="pending-detail">
                    <span class="pending-detail-label">Requested Role:</span>
                    <span class="pending-detail-value">${user.role}</span>
                </div>
            </div>
            <div class="pending-user-date">Registered on ${createdDate}</div>
        `;
        container.appendChild(userItem);
    });
}

// Approve user function
async function approveUser(userId) {
    console.log('Approve user called with ID:', userId);

    if (!confirm('Are you sure you want to approve this user?')) {
        return;
    }

    try {
        console.log('Making approve request to:', `/api/dashboard/pending_users/${userId}/approve`);

        const response = await fetch(`/api/dashboard/pending_users/${userId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('Approve response status:', response.status);
        const data = await response.json();
        console.log('Approve response data:', data);

        if (data.success) {
            showNotification(data.message, 'success');
            loadPendingUsers();
            loadUsers(); // Refresh users list
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error approving user:', error);
        showNotification('Failed to approve user', 'error');
    }
}

// Reject user function
async function rejectUser(userId) {
    console.log('Reject user called with ID:', userId);

    if (!confirm('Are you sure you want to reject this user? This action cannot be undone.')) {
        return;
    }

    try {
        console.log('Making reject request to:', `/api/dashboard/pending_users/${userId}/reject`);

        const response = await fetch(`/api/dashboard/pending_users/${userId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('Reject response status:', response.status);
        const data = await response.json();
        console.log('Reject response data:', data);

        if (data.success) {
            showNotification(data.message, 'success');
            loadPendingUsers();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error rejecting user:', error);
        showNotification('Failed to reject user', 'error');
    }
}

// Show notification function
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
    `;

    // Add to page
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Refresh functions
function refreshStorageData() {
    loadStorageData();
}

function refreshActivityData() {
    loadActivityData();
}

function refreshProjectData() {
    loadProjectData();
}

// Alert functions
function clearAllAlerts() {
    if (confirm('Are you sure you want to clear all alerts?')) {
        document.getElementById('alerts-container').innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 2rem;">No alerts</p>';
        document.getElementById('alert-count').textContent = '0';
    }
}

// User management functions
async function editUser(userId) {
    console.log('Edit user called with ID:', userId);

    try {
        // Get user data first
        const response = await fetch(`/api/dashboard/users`);
        const data = await response.json();
        const user = data.users.find(u => u.id === userId);

        if (!user) {
            showNotification('User not found', 'error');
            return;
        }

        // Populate modal with user data
        document.getElementById('user-id').value = userId;
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-fullname').value = user.full_name || '';
        document.getElementById('user-role').value = user.role;
        document.getElementById('user-status').value = user.status;

        // Make password optional for existing users
        const passwordField = document.getElementById('user-password');
        passwordField.required = false;
        passwordField.placeholder = 'Leave blank to keep current password';
        passwordField.value = '';

        // Set modal title
        document.getElementById('modal-title').textContent = `Edit User: ${user.username}`;

        // Show modal
        document.getElementById('user-modal').style.display = 'block';

    } catch (error) {
        console.error('Error editing user:', error);
        showNotification('Failed to edit user', 'error');
    }
}

async function deleteUser(userId) {
    console.log('Delete user called with ID:', userId);

    try {
        // Get user data first to show username in confirmation
        const response = await fetch(`/api/dashboard/users`);
        const data = await response.json();
        const user = data.users.find(u => u.id === userId);

        if (!user) {
            showNotification('User not found', 'error');
            return;
        }

        // Prevent deleting admin users
        if (user.role === 'admin') {
            showNotification('Cannot delete admin users', 'error');
            return;
        }

        if (confirm(`Are you sure you want to delete user "${user.username}"?\n\nThis action cannot be undone.`)) {
            const deleteResponse = await fetch(`/api/dashboard/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const deleteData = await deleteResponse.json();

            if (deleteData.success) {
                showNotification(`User ${user.username} deleted successfully`, 'success');
                loadUsers(); // Refresh user list
            } else {
                showNotification(deleteData.message || 'Failed to delete user', 'error');
            }
        }

    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Failed to delete user', 'error');
    }
}

function showAddUserModal() {
    // Reset form
    document.getElementById('user-form').reset();
    document.getElementById('user-id').value = '';

    // Set modal title
    document.getElementById('modal-title').textContent = 'Add New User';

    // Make password field required for new users
    const passwordField = document.getElementById('user-password');
    passwordField.required = true;
    passwordField.placeholder = 'Enter password for new user';

    // Set default values
    document.getElementById('user-role').value = 'user';
    document.getElementById('user-status').value = 'approved';

    // Show modal
    document.getElementById('user-modal').style.display = 'block';
}

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

async function saveUser() {
    const userId = document.getElementById('user-id').value;
    const userData = {
        username: document.getElementById('user-username').value,
        email: document.getElementById('user-email').value,
        role: document.getElementById('user-role').value,
        status: document.getElementById('user-status').value,
        full_name: document.getElementById('user-fullname').value || '',
        password: document.getElementById('user-password').value || ''
    };

    // Validation
    if (!userData.username || !userData.email || !userData.role || !userData.status) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        let response;
        let successMessage;

        if (userId) {
            // Update existing user
            console.log('Updating user:', userId, userData);
            response = await fetch(`/api/dashboard/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            successMessage = `User ${userData.username} updated successfully`;
        } else {
            // Create new user
            console.log('Creating new user:', userData);

            // For new users, password is required
            if (!userData.password) {
                showNotification('Password is required for new users', 'error');
                return;
            }

            response = await fetch('/api/dashboard/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            successMessage = `User ${userData.username} created successfully`;
        }

        const data = await response.json();

        if (data.success) {
            showNotification(successMessage, 'success');
            closeUserModal();
            loadUsers(); // Refresh user list
        } else {
            showNotification(data.message || 'Failed to save user', 'error');
        }

    } catch (error) {
        console.error('Error saving user:', error);
        showNotification('Failed to save user', 'error');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('user-modal');
    if (event.target === modal) {
        closeUserModal();
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
