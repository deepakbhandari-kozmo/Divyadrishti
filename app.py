# app.py

from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
import os
import requests
import time
from datetime import datetime
from functools import wraps
from firebase_config import (
    get_firestore_db, verify_firebase_token, Collections,
    add_user_activity, get_user_by_email, get_user_by_username, test_firebase_connection
)
from google.cloud import firestore
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import io
import base64
from PIL import Image as PILImage, ImageDraw, ImageFont
import tempfile

# Import analytics data blueprint
from api.analytics_data import analytics_data_bp

# Import session tracker
try:
    from session_tracker import session_tracker, create_interaction_api
    SESSION_TRACKING_ENABLED = True
    print("📊 Session tracking enabled")
except ImportError:
    SESSION_TRACKING_ENABLED = False
    print("⚠️ Session tracking not available")

app = Flask(__name__)

# Register analytics data blueprint
app.register_blueprint(analytics_data_bp)

# Initialize session tracking
if SESSION_TRACKING_ENABLED:
    session_tracker.init_app(app)
    create_interaction_api(app)

# --- Configuration ---
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_secret_key_here_change_in_production')
print(f"Flask secret key configured: {app.config['SECRET_KEY'][:10]}...")

# Configure session settings for better reliability
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

GEOSERVER_BASE_URL = "http://localhost:9090/geoserver"
GEOSERVER_USERNAME = os.environ.get('GEOSERVER_USERNAME', 'admin')
GEOSERVER_PASSWORD = os.environ.get('GEOSERVER_PASSWORD', 'geoserver')

# Initialize Firebase
db = get_firestore_db()

# Default admin credentials for initial setup
DEFAULT_ADMIN = {
    'username': 'admin',
    'email': 'admin@droneresearch.gov.in',
    'password': 'admin123',  # Change this in production
    'role': 'admin',
    'status': 'approved'
}

def initialize_default_admin():
    """Initialize default admin user in Firebase if not exists"""
    try:
        print("Checking for default admin user...")
        admin_user = get_user_by_username('admin')
        if not admin_user:
            print("Creating default admin user...")
            admin_data = {
                'username': DEFAULT_ADMIN['username'],
                'email': DEFAULT_ADMIN['email'],
                'password': DEFAULT_ADMIN['password'],  # Store password for verification
                'full_name': 'System Administrator',
                'role': DEFAULT_ADMIN['role'],
                'status': DEFAULT_ADMIN['status'],
                'created_date': datetime.now(),
                'approved_by': 'system',
                'approved_date': datetime.now(),
                'organization': 'Drone Application & Research Center',
                'phone': '',
                'login_count': 0,
                'last_login': None
            }

            # Add to Firestore
            doc_ref = db.collection(Collections.USERS).add(admin_data)
            print(f"Default admin user created in Firebase with ID: {doc_ref[1].id}")
        else:
            print("Default admin user already exists")
            # Check if admin user has password field, if not, update it
            if 'password' not in admin_user or not admin_user.get('password'):
                print("Updating admin user with password...")
                db.collection(Collections.USERS).document(admin_user['id']).update({
                    'password': DEFAULT_ADMIN['password']
                })
                print("Admin user password updated")

    except Exception as e:
        print(f"Error initializing default admin: {e}")
        print("App will continue with mock Firebase functionality")

# Test Firebase connection and initialize default admin on startup
print("=" * 50)
print("FIREBASE CONNECTION TEST")
print("=" * 50)
if test_firebase_connection():
    print("Firebase connection successful! Initializing admin user...")
    initialize_default_admin()
else:
    print("Firebase connection failed! Check your configuration.")
print("=" * 50)

def update_user_last_login(user_id):
    """Update user's last login timestamp"""
    try:
        db.collection(Collections.USERS).document(user_id).update({
            'last_login': datetime.now(),
            'login_count': firestore.Increment(1)
        })
    except Exception as e:
        print(f"Error updating last login: {e}")

def get_pending_users():
    """Get all pending users from Firestore"""
    try:
        pending_users = []
        docs = db.collection(Collections.PENDING_USERS).stream()

        for doc in docs:
            user_data = doc.to_dict()
            user_data['id'] = doc.id
            pending_users.append(user_data)

        return pending_users
    except Exception as e:
        print(f"Error getting pending users: {e}")
        return []

def get_all_users():
    """Get all approved users from Firestore"""
    try:
        print("🔍 get_all_users: Starting database query...")
        users = []

        # Try to get all users first (not just approved)
        print(f"🔍 Querying collection: {Collections.USERS}")
        docs = db.collection(Collections.USERS).stream()

        all_users_count = 0
        for doc in docs:
            all_users_count += 1
            user_data = doc.to_dict()
            user_data['id'] = doc.id
            print(f"🔍 Found user: {user_data.get('username', 'unknown')} - status: {user_data.get('status', 'unknown')}")

            # Include all users for now to see what we have
            users.append(user_data)

        print(f"🔍 Total users in database: {all_users_count}")
        print(f"🔍 Returning {len(users)} users")
        return users

    except Exception as e:
        print(f"❌ Error getting users from database: {e}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return []

# --- Authentication Routes ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')

    # Handle both JSON and form data
    if request.is_json:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        captcha = data.get('captcha')
    else:
        username = request.form.get('username')
        password = request.form.get('password')
        captcha = request.form.get('captcha')

    if not username or not password or not captcha:
        if request.is_json:
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        return render_template('login.html', error='All fields are required')

    # For JSON requests, we skip captcha validation since it's handled client-side
    # In a production environment, you'd want server-side captcha validation

    # Handle Firebase token authentication
    firebase_token = request.headers.get('Authorization')
    if firebase_token and firebase_token.startswith('Bearer '):
        token = firebase_token.split('Bearer ')[1]
        decoded_token = verify_firebase_token(token)

        if decoded_token:
            # Get user from Firestore
            user_data = get_user_by_email(decoded_token.get('email'))

            if user_data and user_data['status'] == 'approved':
                session['logged_in'] = True
                session['username'] = user_data['username']
                session['user_type'] = user_data['role']
                session['user_id'] = user_data['id']
                session['firebase_uid'] = decoded_token['uid']

                # Update last login
                update_user_last_login(user_data['id'])
                add_user_activity(user_data['id'], 'login', {'method': 'firebase_token'})

                return jsonify({'success': True, 'message': 'Login successful'})
            else:
                return jsonify({'success': False, 'message': 'Account not approved or not found'}), 403
        else:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

    # Handle traditional username/password login
    user_data = None

    # Check if it's admin default credentials
    if username == DEFAULT_ADMIN['username'] and password == DEFAULT_ADMIN['password']:
        user_data = get_user_by_username(username)
        if not user_data:
            # Create admin user if doesn't exist
            initialize_default_admin()
            user_data = get_user_by_username(username)
    else:
        # Check user by username or email
        print(f"🔍 LOGIN: Looking up user '{username}'...")
        user_data = get_user_by_username(username) or get_user_by_email(username)
        if user_data:
            print(f"✅ LOGIN: Found user '{username}' in database")
            print(f"   - Username: {user_data.get('username')}")
            print(f"   - Email: {user_data.get('email')}")
            print(f"   - Status: {user_data.get('status')}")
            print(f"   - Role: {user_data.get('role')}")
        else:
            print(f"❌ LOGIN: User '{username}' NOT found in database")

    if user_data:
        # Check password - for now using plain text comparison
        # In production, use proper password hashing (bcrypt, etc.)
        stored_password = user_data.get('password', '')

        print(f"Password verification for user {username}:")
        print(f"  Entered password: {password}")
        print(f"  Stored password: {stored_password}")

        if password != stored_password:
            print("Password mismatch!")
            error_msg = 'Invalid username or password'
            if request.is_json:
                return jsonify({'success': False, 'message': error_msg}), 401
            return render_template('login.html', error=error_msg)

        if user_data['status'] == 'approved':
            session['logged_in'] = True
            session['username'] = user_data['username']
            session['user_type'] = user_data['role']
            session['user_id'] = user_data['id']

            print(f"Login successful - Setting session data:")
            print(f"  logged_in: {session['logged_in']}")
            print(f"  username: {session['username']}")
            print(f"  user_type: {session['user_type']}")
            print(f"  user_id: {session['user_id']}")

            # Update last login
            update_user_last_login(user_data['id'])
            add_user_activity(user_data['id'], 'login', {'method': 'username_password'})

            if request.is_json:
                return jsonify({'success': True, 'message': 'Login successful'})
            return redirect(url_for('index'))

        elif user_data['status'] == 'pending':
            error_msg = 'Your account is pending admin approval. Please wait for approval.'
            if request.is_json:
                return jsonify({'success': False, 'message': error_msg}), 403
            return render_template('login.html', error=error_msg)

        elif user_data['status'] == 'rejected':
            error_msg = 'Your account has been rejected. Please contact administrator.'
            if request.is_json:
                return jsonify({'success': False, 'message': error_msg}), 403
            return render_template('login.html', error=error_msg)

    # Invalid credentials
    error_msg = 'Invalid username or password'
    if request.is_json:
        return jsonify({'success': False, 'message': error_msg}), 401
    return render_template('login.html', error=error_msg)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('register.html')

    # Handle both JSON and form data
    if request.is_json:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        full_name = data.get('full_name')
        organization = data.get('organization')
        phone = data.get('phone')
        captcha = data.get('captcha')
    else:
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        full_name = request.form.get('full_name')
        organization = request.form.get('organization')
        phone = request.form.get('phone')
        captcha = request.form.get('captcha')

    # Validation
    if not all([username, email, password, confirm_password, full_name]):
        error_msg = 'All required fields must be filled'
        if request.is_json:
            return jsonify({'success': False, 'message': error_msg}), 400
        return render_template('register.html', error=error_msg)

    if password != confirm_password:
        error_msg = 'Passwords do not match'
        if request.is_json:
            return jsonify({'success': False, 'message': error_msg}), 400
        return render_template('register.html', error=error_msg)

    if len(password) < 6:
        error_msg = 'Password must be at least 6 characters long'
        if request.is_json:
            return jsonify({'success': False, 'message': error_msg}), 400
        return render_template('register.html', error=error_msg)

    # Check if username or email already exists
    existing_user = get_user_by_username(username) or get_user_by_email(email)
    if existing_user:
        error_msg = 'Username or email already exists'
        if request.is_json:
            return jsonify({'success': False, 'message': error_msg}), 400
        return render_template('register.html', error=error_msg)

    # Check if admin default username
    if username == DEFAULT_ADMIN['username']:
        error_msg = 'Username not available'
        if request.is_json:
            return jsonify({'success': False, 'message': error_msg}), 400
        return render_template('register.html', error=error_msg)

    # Check pending users
    pending_users = get_pending_users()
    for pending_user in pending_users:
        if pending_user.get('username') == username or pending_user.get('email') == email:
            error_msg = 'Username or email already has a pending registration'
            if request.is_json:
                return jsonify({'success': False, 'message': error_msg}), 400
            return render_template('register.html', error=error_msg)

    # Create pending user in Firestore
    try:
        pending_user_data = {
            'username': username,
            'email': email,
            'password': password,  # In production, hash this password
            'full_name': full_name,
            'organization': organization or '',
            'phone': phone or '',
            'role': 'user',
            'status': 'pending',
            'created_date': datetime.now(),
            'approved_by': None,
            'approved_date': None
        }

        # Add to pending users collection
        doc_ref = db.collection(Collections.PENDING_USERS).add(pending_user_data)

        # Log the registration activity
        add_user_activity(None, 'registration_request', {
            'username': username,
            'email': email,
            'full_name': full_name
        })

        success_msg = 'Registration successful! Your account is pending admin approval. You will be notified once approved.'
        if request.is_json:
            return jsonify({'success': True, 'message': success_msg})
        return render_template('register.html', success=success_msg)

    except Exception as e:
        print(f"Error creating pending user: {e}")
        error_msg = 'Registration failed. Please try again.'
        if request.is_json:
            return jsonify({'success': False, 'message': error_msg}), 500
        return render_template('register.html', error=error_msg)

    success_msg = 'Registration successful! Your account is pending admin approval. You will be notified once approved.'
    if request.is_json:
        return jsonify({'success': True, 'message': success_msg})
    return render_template('register.html', success=success_msg)

@app.route('/terms')
def terms_of_service():
    return render_template('terms.html')

@app.route('/privacy')
def privacy_policy():
    return render_template('privacy.html')

@app.route('/favicon.ico')
def favicon():
    return send_file('static/images/logo.png', mimetype='image/png')

# --- Protected Routes ---

def login_required(f):
    """Decorator to require login for routes"""
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def admin_required(f):
    """Decorator to require admin role for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
@login_required
def index():
    return render_template('index.html')









@app.route('/dashboard')
@login_required
def dashboard():
    """Dashboard accessible to all logged-in users"""
    user_type = session.get('user_type', 'user')
    return render_template('dashboard.html', user_type=user_type)

@app.route('/profile')
def profile():
    """User profile page"""
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    # Get current user data
    user_id = session.get('user_id')
    if user_id:
        # Get user from Firestore
        user_doc = db.collection(Collections.USERS).document(user_id).get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            user_data['id'] = user_doc.id
        else:
            # Fallback: get by username
            user_data = get_user_by_username(session.get('username'))
    else:
        user_data = get_user_by_username(session.get('username'))

    if not user_data:
        return redirect(url_for('login'))

    return render_template('profile.html', user=user_data)

# --- Admin Dashboard API Routes ---

@app.route('/api/dashboard/storage')
@admin_required
def get_storage_stats():
    """Get storage monitoring data"""
    import psutil
    import shutil

    try:
        # Get disk usage
        disk_usage = shutil.disk_usage('/')
        total_space = disk_usage.total / (1024**3)  # GB
        used_space = (disk_usage.total - disk_usage.free) / (1024**3)  # GB
        free_space = disk_usage.free / (1024**3)  # GB

        # Get memory usage
        memory = psutil.virtual_memory()

        # Simulate GeoServer storage (in production, query actual GeoServer)
        geoserver_data = {
            'workspaces': 5,
            'layers': 23,
            'data_size_gb': 2.4
        }

        return jsonify({
            'disk': {
                'total_gb': round(total_space, 2),
                'used_gb': round(used_space, 2),
                'free_gb': round(free_space, 2),
                'usage_percent': round((used_space / total_space) * 100, 1)
            },
            'memory': {
                'total_gb': round(memory.total / (1024**3), 2),
                'used_gb': round(memory.used / (1024**3), 2),
                'usage_percent': round(memory.percent, 1)
            },
            'geoserver': geoserver_data
        })
    except Exception as e:
        app.logger.error(f"Error getting storage stats: {e}")
        return jsonify({'error': 'Failed to get storage statistics'}), 500

@app.route('/api/dashboard/user_activity')
@admin_required
def get_user_activity():
    """Get user activity analytics - real data with fallback to dummy data"""
    from datetime import datetime, timedelta
    import random

    # Try to get real analytics data first
    try:
        # Check if we have real analytics data in database/session storage
        # This would connect to your actual analytics database
        real_data = get_real_analytics_data()
        if real_data and real_data.get('has_data'):
            return jsonify(real_data)
    except Exception as e:
        print(f"Could not fetch real analytics data: {e}")

    # Fallback to simulated data if real data is not available
    print("Using dummy analytics data as fallback")
    now = datetime.now()
    activity_data = []

    for i in range(7):
        date = now - timedelta(days=i)
        activity_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'logins': random.randint(5, 25),
            'map_views': random.randint(20, 100),
            'exports': random.randint(2, 15),
            'searches': random.randint(10, 50)
        })

    # Current session info
    current_users = [
        {'username': session.get('username', 'admin'), 'login_time': '2 hours ago', 'status': 'active'},
        {'username': 'user1', 'login_time': '30 minutes ago', 'status': 'active'},
        {'username': 'user2', 'login_time': '1 hour ago', 'status': 'idle'}
    ]

    return jsonify({
        'weekly_activity': activity_data,
        'current_users': current_users,
        'total_users': 15,
        'active_sessions': 3,
        'data_source': 'dummy'
    })

def get_real_analytics_data():
    """
    Get real analytics data from database/storage
    This function should be implemented to connect to your actual analytics database
    """
    try:
        # Example: Connect to your analytics database
        # This could be Firebase, PostgreSQL, MongoDB, etc.

        # Check if we have any real session data
        from datetime import datetime, timedelta

        # Check if there are active sessions with real data
        # This is a placeholder - implement your actual data source

        # Example structure of what real data should look like:
        real_analytics = {
            'has_data': False,  # Set to True when real data is available
            'weekly_activity': [],
            'current_users': [],
            'active_sessions': 0,
            'total_users': 0,
            'data_source': 'real',
            'last_updated': datetime.now().isoformat()
        }

        # TODO: Implement actual data fetching logic here
        # Example:
        # - Query user sessions from database
        # - Get page view analytics
        # - Calculate real metrics

        return real_analytics

    except Exception as e:
        print(f"Error fetching real analytics: {e}")
        return None

@app.route('/api/analytics/realtime')
@admin_required
def get_realtime_analytics():
    """Get real-time analytics data for the analytics dashboard"""
    try:
        # Try to get real analytics data first
        real_data = get_real_analytics_data()
        if real_data and real_data.get('has_data'):
            return jsonify(real_data)

        # Fallback to dummy data with realistic patterns
        from datetime import datetime, timedelta
        import random

        now = datetime.now()

        # Generate realistic quick stats
        quick_stats = {
            'activeUsers': random.randint(15, 45),
            'avgLoadTime': random.randint(800, 2000),
            'bounceRate': random.randint(25, 45),
            'pageViews': random.randint(150, 400),
            'uptime': round(random.uniform(99.5, 99.9), 1),
            'errorCount': random.randint(0, 5)
        }

        # Generate user activity data for last 24 hours
        user_activity = []
        for i in range(24):
            hour_time = now - timedelta(hours=i)
            hour = hour_time.hour

            # Realistic user patterns based on time of day
            if 9 <= hour <= 17:  # Work hours
                base_users = random.randint(20, 40)
            elif 18 <= hour <= 22:  # Evening
                base_users = random.randint(10, 25)
            else:  # Night/early morning
                base_users = random.randint(2, 10)

            user_activity.append({
                'time': hour_time.isoformat(),
                'activeUsers': base_users,
                'pageViews': base_users * random.randint(2, 5)
            })

        return jsonify({
            'quickStats': quick_stats,
            'userActivity': user_activity,
            'dataSource': 'dummy',
            'lastUpdated': now.isoformat()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/project_performance')
@admin_required
def get_project_performance():
    """Get project performance metrics"""
    import random

    # Simulate project performance data
    projects = [
        {
            'name': 'Urban Planning Survey',
            'status': 'active',
            'completion': 75,
            'layers': 8,
            'last_updated': '2 hours ago',
            'size_mb': 245.6
        },
        {
            'name': 'Forest Monitoring',
            'status': 'completed',
            'completion': 100,
            'layers': 12,
            'last_updated': '1 day ago',
            'size_mb': 512.3
        },
        {
            'name': 'Agricultural Analysis',
            'status': 'active',
            'completion': 45,
            'layers': 6,
            'last_updated': '30 minutes ago',
            'size_mb': 189.2
        },
        {
            'name': 'Infrastructure Assessment',
            'status': 'pending',
            'completion': 15,
            'layers': 3,
            'last_updated': '3 days ago',
            'size_mb': 67.8
        }
    ]

    # Performance metrics
    performance_metrics = {
        'total_projects': len(projects),
        'active_projects': len([p for p in projects if p['status'] == 'active']),
        'completed_projects': len([p for p in projects if p['status'] == 'completed']),
        'total_layers': sum(p['layers'] for p in projects),
        'total_size_gb': round(sum(p['size_mb'] for p in projects) / 1024, 2),
        'avg_completion': round(sum(p['completion'] for p in projects) / len(projects), 1)
    }

    return jsonify({
        'projects': projects,
        'metrics': performance_metrics
    })

@app.route('/api/dashboard/alerts')
@admin_required
def get_alerts():
    """Get system alerts and notifications"""
    from datetime import datetime, timedelta

    alerts = [
        {
            'id': 1,
            'type': 'warning',
            'title': 'High Storage Usage',
            'message': 'Disk usage is above 80%. Consider cleaning up old data.',
            'timestamp': (datetime.now() - timedelta(hours=2)).isoformat(),
            'severity': 'medium'
        },
        {
            'id': 2,
            'type': 'info',
            'title': 'GeoServer Update Available',
            'message': 'A new version of GeoServer is available for download.',
            'timestamp': (datetime.now() - timedelta(days=1)).isoformat(),
            'severity': 'low'
        },
        {
            'id': 3,
            'type': 'success',
            'title': 'Backup Completed',
            'message': 'Daily backup completed successfully.',
            'timestamp': (datetime.now() - timedelta(hours=6)).isoformat(),
            'severity': 'low'
        },
        {
            'id': 4,
            'type': 'error',
            'title': 'Layer Processing Failed',
            'message': 'Failed to process layer "urban_roads". Check logs for details.',
            'timestamp': (datetime.now() - timedelta(hours=4)).isoformat(),
            'severity': 'high'
        }
    ]

    return jsonify({
        'alerts': alerts,
        'unread_count': len([a for a in alerts if a['severity'] in ['high', 'medium']])
    })

@app.route('/api/dashboard/users')
@admin_required
def get_users():
    """Get user management data"""
    try:
        print("🔍 GET /api/dashboard/users - Starting user fetch...")
        print(f"🔍 Session data: {dict(session)}")

        users = get_all_users()
        print(f"🔍 Raw users from database: {len(users)} users found")

        if users:
            print(f"🔍 First user sample: {users[0] if users else 'None'}")

        # Format users for frontend
        formatted_users = []
        for user in users:
            try:
                formatted_user = {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'role': user['role'],
                    'status': user['status'],
                    'last_login': user.get('last_login', '').isoformat() if user.get('last_login') else 'Never',
                    'created_date': user.get('created_date', '').strftime('%Y-%m-%d') if user.get('created_date') else '',
                    'login_count': user.get('login_count', 0)
                }
                formatted_users.append(formatted_user)
            except Exception as format_error:
                print(f"🔍 Error formatting user {user.get('id', 'unknown')}: {format_error}")
                continue

        print(f"🔍 Formatted users: {len(formatted_users)} users")

        result = {
            'users': formatted_users,
            'total_users': len(formatted_users),
            'active_users': len([u for u in formatted_users if u['status'] == 'approved']),
            'roles': ['admin', 'analyst', 'user']
        }

        print(f"🔍 Returning result: {len(result['users'])} users")
        return jsonify(result)

    except Exception as e:
        print(f"❌ Error getting users: {e}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to get users: {str(e)}'}), 500

@app.route('/api/dashboard/users/<user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update user role or status"""
    try:
        data = request.get_json()

        # Update user in Firestore
        update_data = {}
        for field, value in data.items():
            if field in ['role', 'status']:
                update_data[field] = value

        if update_data:
            db.collection(Collections.USERS).document(user_id).update(update_data)

            # Log the activity
            add_user_activity(session.get('user_id'), 'user_update', {
                'target_user_id': user_id,
                'updated_fields': update_data
            })

            return jsonify({
                'success': True,
                'message': f'User updated successfully',
                'updated_fields': update_data
            })
        else:
            return jsonify({'success': False, 'message': 'No valid fields to update'}), 400

    except Exception as e:
        print(f"Error updating user: {e}")
        return jsonify({'success': False, 'message': 'Failed to update user'}), 500

@app.route('/api/dashboard/pending_users')
@admin_required
def get_pending_users_api():
    """Get pending user registrations"""
    try:
        pending_users = get_pending_users()
        return jsonify({
            'pending_users': pending_users,
            'count': len(pending_users)
        })
    except Exception as e:
        print(f"Error getting pending users: {e}")
        return jsonify({'error': 'Failed to get pending users'}), 500

@app.route('/api/dashboard/pending_users/<user_id>/approve', methods=['POST'])
@admin_required
def approve_user(user_id):
    """Approve a pending user registration"""
    try:
        print(f"Approve user request received for user_id: {user_id}")

        # Get pending user from Firestore
        pending_doc = db.collection(Collections.PENDING_USERS).document(user_id).get()

        if not pending_doc.exists:
            print(f"Pending user not found: {user_id}")
            return jsonify({'success': False, 'message': 'Pending user not found'}), 404

        user_data = pending_doc.to_dict()
        print(f"Found pending user: {user_data.get('username')}")

        # Update user data for approval
        user_data['status'] = 'approved'
        user_data['approved_by'] = session.get('username')
        user_data['approved_date'] = datetime.now()
        user_data['login_count'] = 0
        user_data['last_login'] = None

        # Add to main users collection
        doc_ref = db.collection(Collections.USERS).add(user_data)
        print(f"User added to main collection with ID: {doc_ref[1].id}")

        # Remove from pending users
        db.collection(Collections.PENDING_USERS).document(user_id).delete()
        print(f"Removed user from pending collection")

        # Log the activity
        add_user_activity(session.get('user_id'), 'user_approval', {
            'approved_user': user_data['username'],
            'approved_email': user_data['email']
        })

        print(f"User {user_data['username']} approved successfully")
        return jsonify({
            'success': True,
            'message': f'User {user_data["username"]} approved successfully'
        })

    except Exception as e:
        print(f"Error approving user: {e}")
        return jsonify({'success': False, 'message': 'Failed to approve user'}), 500

@app.route('/api/dashboard/pending_users/<user_id>/reject', methods=['POST'])
@admin_required
def reject_user(user_id):
    """Reject a pending user registration"""
    try:
        # Get pending user from Firestore
        pending_doc = db.collection(Collections.PENDING_USERS).document(user_id).get()

        if not pending_doc.exists:
            return jsonify({'success': False, 'message': 'Pending user not found'}), 404

        user_data = pending_doc.to_dict()

        # Remove from pending users
        db.collection(Collections.PENDING_USERS).document(user_id).delete()

        # Log the activity
        add_user_activity(session.get('user_id'), 'user_rejection', {
            'rejected_user': user_data['username'],
            'rejected_email': user_data['email']
        })

        return jsonify({
            'success': True,
            'message': f'User {user_data["username"]} rejected successfully'
        })

    except Exception as e:
        print(f"Error rejecting user: {e}")
        return jsonify({'success': False, 'message': 'Failed to reject user'}), 500

@app.route('/api/dashboard/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete a user account"""
    try:
        print(f"Delete user request received for user_id: {user_id}")

        # Get user data first
        user_doc = db.collection(Collections.USERS).document(user_id).get()

        if not user_doc.exists:
            print(f"User not found: {user_id}")
            return jsonify({'success': False, 'message': 'User not found'}), 404

        user_data = user_doc.to_dict()

        # Prevent deleting admin users
        if user_data.get('role') == 'admin':
            print(f"Attempted to delete admin user: {user_data.get('username')}")
            return jsonify({'success': False, 'message': 'Cannot delete admin users'}), 403

        # Delete user from Firestore
        db.collection(Collections.USERS).document(user_id).delete()
        print(f"User deleted from collection")

        # Log the activity
        add_user_activity(session.get('user_id'), 'user_deletion', {
            'deleted_user': user_data['username'],
            'deleted_email': user_data['email']
        })

        print(f"User {user_data['username']} deleted successfully")
        return jsonify({
            'success': True,
            'message': f'User {user_data["username"]} deleted successfully'
        })

    except Exception as e:
        print(f"Error deleting user: {e}")
        return jsonify({'success': False, 'message': 'Failed to delete user'}), 500



@app.route('/api/dashboard/users', methods=['POST'])
@admin_required
def create_user():
    """Create a new user account"""
    try:
        data = request.get_json()
        print(f"Create user request received: {data}")

        # Validation
        required_fields = ['username', 'email', 'password', 'full_name', 'role', 'status']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400

        # Check if username or email already exists
        existing_user = get_user_by_username(data['username']) or get_user_by_email(data['email'])
        if existing_user:
            return jsonify({'success': False, 'message': 'Username or email already exists'}), 400

        # Create user data
        user_data = {
            'username': data['username'],
            'email': data['email'],
            'password': data['password'],  # In production, hash this password
            'full_name': data['full_name'],
            'role': data['role'],
            'status': data['status'],
            'organization': data.get('organization', ''),
            'phone': data.get('phone', ''),
            'created_date': datetime.now(),
            'approved_by': session.get('username'),
            'approved_date': datetime.now(),
            'login_count': 0,
            'last_login': None
        }

        # Add to Firestore
        doc_ref = db.collection(Collections.USERS).add(user_data)
        user_id = doc_ref[1].id
        print(f"✅ User created with ID: {user_id}")

        # Debug: Verify the user was actually created
        created_user = get_user_by_username(data['username'])
        if created_user:
            print(f"✅ VERIFICATION: User {data['username']} found in database after creation")
            print(f"   - Username: {created_user.get('username')}")
            print(f"   - Email: {created_user.get('email')}")
            print(f"   - Password: {created_user.get('password')}")
            print(f"   - Status: {created_user.get('status')}")
            print(f"   - Role: {created_user.get('role')}")
        else:
            print(f"❌ VERIFICATION FAILED: User {data['username']} NOT found in database after creation!")

        # Log the activity
        add_user_activity(session.get('user_id'), 'user_creation', {
            'created_user': data['username'],
            'created_email': data['email'],
            'assigned_role': data['role']
        })

        print(f"User {data['username']} created successfully")
        return jsonify({
            'success': True,
            'message': f'User {data["username"]} created successfully'
        })

    except Exception as e:
        print(f"Error creating user: {e}")
        return jsonify({'success': False, 'message': 'Failed to create user'}), 500

# Profile Management API Routes
@app.route('/api/profile/update', methods=['PUT'])
def update_profile():
    """Update user profile information"""
    if not session.get('logged_in'):
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401

    try:
        data = request.get_json()
        user_id = session.get('user_id')

        # Get current user data
        user_doc = db.collection(Collections.USERS).document(user_id).get()
        if not user_doc.exists:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Prepare update data
        update_data = {}
        allowed_fields = ['full_name', 'email', 'phone', 'organization']

        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]

        if update_data:
            # Update in Firestore
            db.collection(Collections.USERS).document(user_id).update(update_data)

            # Log the activity
            add_user_activity(user_id, 'profile_update', {
                'updated_fields': list(update_data.keys())
            })

            return jsonify({
                'success': True,
                'message': 'Profile updated successfully'
            })
        else:
            return jsonify({'success': False, 'message': 'No valid fields to update'}), 400

    except Exception as e:
        print(f"Error updating profile: {e}")
        return jsonify({'success': False, 'message': 'Failed to update profile'}), 500

@app.route('/api/profile/change-password', methods=['PUT'])
def change_password():
    """Change user password with old password verification"""
    if not session.get('logged_in'):
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401

    try:
        data = request.get_json()
        user_id = session.get('user_id')

        old_password = data.get('old_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')

        if not all([old_password, new_password, confirm_password]):
            return jsonify({'success': False, 'message': 'All password fields are required'}), 400

        if new_password != confirm_password:
            return jsonify({'success': False, 'message': 'New passwords do not match'}), 400

        if len(new_password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters long'}), 400

        # Get current user data
        user_doc = db.collection(Collections.USERS).document(user_id).get()
        if not user_doc.exists:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        user_data = user_doc.to_dict()

        # Verify old password
        if user_data.get('password') != old_password:
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 400

        # Update password
        db.collection(Collections.USERS).document(user_id).update({
            'password': new_password
        })

        # Log the activity
        add_user_activity(user_id, 'password_change', {
            'timestamp': datetime.now().isoformat()
        })

        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        })

    except Exception as e:
        print(f"Error changing password: {e}")
        return jsonify({'success': False, 'message': 'Failed to change password'}), 500

@app.route('/api/profile/settings', methods=['PUT'])
def update_settings():
    """Update user app settings"""
    if not session.get('logged_in'):
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401

    try:
        data = request.get_json()
        user_id = session.get('user_id')

        # Get current user data
        user_doc = db.collection(Collections.USERS).document(user_id).get()
        if not user_doc.exists:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Prepare settings update
        settings_data = {}
        allowed_settings = ['theme', 'language', 'notifications', 'email_notifications']

        for setting in allowed_settings:
            if setting in data:
                settings_data[setting] = data[setting]

        if settings_data:
            # Update settings in user document
            current_settings = user_doc.to_dict().get('settings', {})
            current_settings.update(settings_data)

            db.collection(Collections.USERS).document(user_id).update({
                'settings': current_settings
            })

            # Log the activity
            add_user_activity(user_id, 'settings_update', {
                'updated_settings': list(settings_data.keys())
            })

            return jsonify({
                'success': True,
                'message': 'Settings updated successfully'
            })
        else:
            return jsonify({'success': False, 'message': 'No valid settings to update'}), 400

    except Exception as e:
        print(f"Error updating settings: {e}")
        return jsonify({'success': False, 'message': 'Failed to update settings'}), 500

@app.route('/api/search_location')
@login_required
def search_location():
    query = request.args.get('query')
    if not query:
        return jsonify({'error': 'Query parameter is missing'}), 400

    nominatim_url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1"
    headers = {'User-Agent': 'MyMappingApp/1.0 (your_email@example.com)'}
    try:
        response = requests.get(nominatim_url, headers=headers)
        response.raise_for_status()
        data = response.json()
        if data:
            result = data[0]
            return jsonify({
                'lat': result['lat'],
                'lon': result['lon'],
                'display_name': result['display_name']
            })
        else:
            return jsonify({'error': 'Location not found'}), 404
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error fetching location from Nominatim: {e}")
        return jsonify({'error': 'Failed to connect to geocoding service'}), 500

@app.route('/api/geoserver/workspaces')
@login_required
def get_geoserver_workspaces():
    url = f"{GEOSERVER_BASE_URL}/rest/workspaces.json"
    try:
        response = requests.get(url, auth=(GEOSERVER_USERNAME, GEOSERVER_PASSWORD))
        response.raise_for_status()
        workspaces_data = response.json()
        workspace_names = [ws['name'] for ws in workspaces_data.get('workspaces', {}).get('workspace', [])]
        return jsonify({'workspaces': workspace_names})
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error fetching workspaces from GeoServer: {e}")
        return jsonify({'error': f'Failed to fetch workspaces from GeoServer: {e}'}), 500

@app.route('/api/geoserver/workspaces/<workspace_name>/layers')
def get_geoserver_layers(workspace_name):
    """
    Fetches layers (raster and vector) for a given workspace.
    Robustly determines layer type by making a secondary call to each layer's
    detailed definition URL to find the resource class.
    """
    # URL for the workspace's layers summary
    layers_summary_url = f"{GEOSERVER_BASE_URL}/rest/workspaces/{workspace_name}/layers.json"
    
    try:
        response = requests.get(layers_summary_url, auth=(GEOSERVER_USERNAME, GEOSERVER_PASSWORD))
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        layers_summary_data = response.json()
        
        raster_layers = []
        vector_layers = []

        # GeoServer can return a single layer as a dict, or multiple as a list
        layers_list = layers_summary_data.get('layers', {}).get('layer', [])
        if isinstance(layers_list, dict):
            layers_list = [layers_list] # Convert single dict to a list for consistent iteration

        app.logger.info(f"Processing {len(layers_list)} layers for workspace {workspace_name}")

        for layer_info in layers_list:
            layer_name = layer_info.get('name')
            layer_detail_href = layer_info.get('href') # This is the key: get the URL to the full layer definition
            
            if not layer_name or not layer_detail_href:
                app.logger.warning(f"Layer info missing 'name' or 'href' in workspace {workspace_name}: {layer_info}")
                continue # Skip to next layer if essential info is missing

            detected_type = None

            # Make a secondary API call to get the detailed layer information
            try:
                detailed_layer_response = requests.get(layer_detail_href, auth=(GEOSERVER_USERNAME, GEOSERVER_PASSWORD))
                detailed_layer_response.raise_for_status()
                detailed_layer_data = detailed_layer_response.json()

                # Now, from the detailed_layer_data, we can find the resource class
                resource_class = detailed_layer_data.get('layer', {}).get('resource', {}).get('@class') # Note the '@class' key
                
                if resource_class:
                    if "coverage" in resource_class.lower(): # 'coverage' for rasters
                        detected_type = 'raster'
                    elif "feature" in resource_class.lower(): # 'featureType' for vectors
                        detected_type = 'vector'
                else:
                    app.logger.warning(f"Could not find '@class' for layer '{layer_name}' at '{layer_detail_href}'.")

            except requests.exceptions.RequestException as e:
                app.logger.warning(f"Failed to fetch detailed layer info for '{layer_name}' at '{layer_detail_href}': {e}")
            except ValueError as e: # Catch JSON decoding errors for the detailed response
                app.logger.warning(f"Failed to parse JSON for detailed layer '{layer_name}' at '{layer_detail_href}': {e}")
            
            # Add to lists based on detected type
            if detected_type == 'raster':
                raster_layers.append(layer_name)
            elif detected_type == 'vector':
                vector_layers.append(layer_name)
            else:
                app.logger.warning(f"Could not determine type for layer '{layer_name}' in workspace '{workspace_name}'. Skipping.")

        return jsonify({
            'workspace': workspace_name,
            'raster_layers': raster_layers,
            'vector_layers': vector_layers
        })

    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error fetching workspace layers summary for '{workspace_name}': {e}")
        # Try to extract GeoServer's error message if response is available and JSON
        error_message = f'Failed to fetch layers from GeoServer: {e}'
        status_code = 500
        if response is not None:
            status_code = response.status_code
            try:
                error_json = response.json()
                # Attempt to get GeoServer specific error message if it's structured
                if 'message' in error_json:
                    error_message = f'GeoServer Error: {error_json["message"]}'
                elif 'stackTrace' in error_json: # Sometimes detailed stack traces are returned
                    error_message = f'GeoServer Error: {error_json.get("stackTrace", "Unknown GeoServer error")[:100]}...'
            except ValueError: # Not JSON, might be HTML or plain text error
                error_message = f'GeoServer Error (status {status_code}): {response.text[:100]}...' # Take first 100 chars
        return jsonify({'error': error_message}), status_code
    except Exception as e:
        app.logger.error(f"An unexpected error occurred in get_geoserver_layers for '{workspace_name}': {e}", exc_info=True)
        return jsonify({'error': f'An unexpected server error occurred: {e}'}), 500


### New GeoServer Layer Bounds Endpoint ###
@app.route('/api/geoserver/layer_bounds/<workspace_name>:<layer_name>')
def get_geoserver_layer_bounds(workspace_name, layer_name):
    """
    Fetches the lat/lon bounding box for a specific layer from GeoServer.
    Always returns bounds in EPSG:4326 (WGS84) format for web mapping.
    """
    full_layer_id = f"{workspace_name}:{layer_name}"
    url = f"{GEOSERVER_BASE_URL}/rest/layers/{full_layer_id}.json"
    
    try:
        response = requests.get(url, auth=(GEOSERVER_USERNAME, GEOSERVER_PASSWORD))
        response.raise_for_status()
        layer_data = response.json()

        lat_lon_bbox = {}

        # Check the primary layer resource link for detailed metadata
        resource_href = layer_data.get('layer', {}).get('resource', {}).get('href')

        if resource_href:
            resource_response = requests.get(resource_href, auth=(GEOSERVER_USERNAME, GEOSERVER_PASSWORD))
            resource_response.raise_for_status()
            full_resource_data = resource_response.json()

            # For Coverages (rasters)
            if 'coverage' in full_resource_data:
                coverage_data = full_resource_data['coverage']
                # Always use latLonBoundingBox for web mapping
                lat_lon_bbox = coverage_data.get('latLonBoundingBox', {})
                if not lat_lon_bbox or lat_lon_bbox.get('minx') is None:
                    lat_lon_bbox = coverage_data.get('nativeBoundingBox', {})

            # For FeatureTypes (vectors)
            elif 'featureType' in full_resource_data:
                feature_type_data = full_resource_data['featureType']
                # Always use latLonBoundingBox for web mapping
                lat_lon_bbox = feature_type_data.get('latLonBoundingBox', {})
                if not lat_lon_bbox or lat_lon_bbox.get('minx') is None:
                    lat_lon_bbox = feature_type_data.get('nativeBoundingBox', {})
            
        if lat_lon_bbox and lat_lon_bbox.get('minx') is not None and lat_lon_bbox.get('miny') is not None:
            # GeoServer's bounds are typically [minx, miny, maxx, maxy]
            # Leaflet's fitBounds expects [[min_lat, min_lon], [max_lat, max_lon]]
            bounds = [
                [lat_lon_bbox['miny'], lat_lon_bbox['minx']], # South-West: [min_lat, min_lon]
                [lat_lon_bbox['maxy'], lat_lon_bbox['maxx']]  # North-East: [max_lat, max_lon]
            ]
            
            app.logger.info(f"Returning lat/lon bounds for {full_layer_id}: {bounds}")
            return jsonify({'bounds': bounds, 'crs': 'EPSG:4326'})
        else:
            app.logger.warning(f"No valid lat/lon bounding box found for layer: {full_layer_id}")
            return jsonify({'error': 'Lat/lon bounding box not found for this layer or is incomplete.'}), 404

    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error fetching bounds for {full_layer_id} from GeoServer: {e}")
        return jsonify({'error': f'Failed to fetch bounds for {full_layer_id}: {e}'}), 500

@app.route('/api/geoserver/feature_info/<workspace>/<layer>')
@login_required
def get_feature_info(workspace, layer):
    try:
        # Get query parameters
        bbox = request.args.get('bbox')
        width = request.args.get('width')
        height = request.args.get('height')
        x = request.args.get('x')
        y = request.args.get('y')
        
        if not all([bbox, width, height, x, y]):
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Build GetFeatureInfo URL
        params = {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'SRS': 'EPSG:4326',
            'VERSION': '1.1.1',
            'FORMAT': 'image/png',
            'BBOX': bbox,
            'HEIGHT': height,
            'WIDTH': width,
            'LAYERS': f'{workspace}:{layer}',
            'QUERY_LAYERS': f'{workspace}:{layer}',
            'INFO_FORMAT': 'application/json',
            'X': x,
            'Y': y,
            'FEATURE_COUNT': '1'
        }
        
        url = f"{GEOSERVER_BASE_URL}/{workspace}/wms?" + "&".join([f"{k}={v}" for k, v in params.items()])
        
        app.logger.info(f"GetFeatureInfo URL: {url}")
        
        response = requests.get(url, auth=(GEOSERVER_USERNAME, GEOSERVER_PASSWORD), timeout=10)
        response.raise_for_status()
        
        # Check if response is JSON
        try:
            data = response.json()
            return jsonify(data)
        except ValueError:
            # If not JSON, return the text response
            return jsonify({'error': 'Non-JSON response from GeoServer', 'response': response.text[:500]})
            
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error getting feature info for {workspace}:{layer}: {e}")
        return jsonify({'error': f'Failed to get feature info: {e}'}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error in get_feature_info: {e}", exc_info=True)
        return jsonify({'error': f'Unexpected error: {e}'}), 500

# @app.route('/api/map_screenshot', methods=['POST'])
# def generate_map_screenshot():
#     ... (removed)

@app.route('/api/export_pdf', methods=['POST'])
@login_required
def export_pdf():
    """
    Generate PDF export of current map view with header, map image, scale, address and legends
    """
    try:
        data = request.get_json()
        app.logger.info(f"PDF export request received: {data}")
        
        # Create PDF buffer
        buffer = io.BytesIO()
        
        # Create PDF document in portrait A4 with normal margins
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,  # 1 inch = 72 points (normal margin)
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Build PDF content
        story = []
        styles = getSampleStyleSheet()
        
        # Add header with logo and title (similar to web header)
        logo_img = None
        try:
            # Try to load the logo
            logo_path = os.path.join('static', 'images', 'logo.png')
            if os.path.exists(logo_path):
                logo_img = Image(logo_path, width=40, height=40)
        except Exception as e:
            app.logger.error(f"Error loading logo: {e}")
            logo_img = None
        
        # Create header table with logo and titles (properly aligned horizontally)
        if logo_img:
            header_data = [
                [logo_img, Paragraph('<b>Drone Application & Research Center</b><br/>Uttarakhand Space Application Center', styles['Normal'])]
            ]
            header_table = Table(header_data, colWidths=[60, 390])
            header_table.setStyle(TableStyle([
                ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (1, 0), (1, 0), 14),
                ('TEXTCOLOR', (1, 0), (1, 0), colors.HexColor('#2c3e50')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ]))
        else:
            # Header without logo
            title = Paragraph('<b>Drone Application & Research Center</b>', styles['Title'])
            subtitle = Paragraph('Uttarakhand Space Application Center', styles['Normal'])
            header_table = Table([[title], [subtitle]], colWidths=[450])
            header_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ]))
        
        story.append(header_table)
        story.append(Spacer(1, 20))
        
        # Generate and add map image
        map_image_path = generate_map_image(data)
        if map_image_path and os.path.exists(map_image_path):
            # Add map image with proper sizing for A4 portrait
            img = Image(map_image_path, width=450, height=300)
            story.append(img)
            story.append(Spacer(1, 15))
        else:
            # Add placeholder if image generation fails
            placeholder = Paragraph('<b>Map image could not be generated</b>', styles['Normal'])
            story.append(placeholder)
            story.append(Spacer(1, 15))
        
        # Add map information in a compact table
        info_data = [
            ['Scale:', data.get('scale', 'Not available')],
            ['Coordinates:', f"{data.get('center', {}).get('lat', 0):.6f}, {data.get('center', {}).get('lng', 0):.6f}"],
            ['Address:', (data.get('address', 'Not available')[:80] + '...') if len(data.get('address', '')) > 80 else data.get('address', 'Not available')],
            ['Date:', data.get('timestamp', '').split('T')[0] if data.get('timestamp') else 'Not available'],
            ['North:', '↑ N']
        ]
        
        info_table = Table(info_data, colWidths=[80, 370])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8f9fa')),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 10))
        
        # Add active layers legend with color information
        active_layers = data.get('activeLayers', [])
        
        if active_layers:
            legend_title = Paragraph('<b>Active Layers:</b>', styles['Normal'])
            story.append(legend_title)
            story.append(Spacer(1, 5))
            
            # Enhanced table structure with color column
            legend_data = [['Layer', 'Type', 'Opacity', 'Color']]
            for layer in active_layers[:8]:  # Limit to 8 layers to fit on page
                layer_name = str(layer.get('name', 'Unknown'))
                layer_type = str(layer.get('type', 'Unknown')).title()
                workspace = str(layer.get('workspace', 'topp'))
                
                # Safely truncate layer name
                display_name = layer_name[:20] + '...' if len(layer_name) > 20 else layer_name
                opacity_value = layer.get('opacity', 0.8)
                
                # Ensure opacity is a number
                try:
                    opacity_percent = f"{int(float(opacity_value) * 100)}%"
                except (ValueError, TypeError):
                    opacity_percent = "80%"
                
                # Get color information for vector layers
                color_element = "N/A"
                if layer_type.lower() == 'vector':
                    try:
                        color_hex = get_layer_style_color(workspace, layer_name)
                        if color_hex.startswith('#') and len(color_hex) == 7:
                            # Create a colored line element
                            color_element = create_color_line(color_hex)
                        else:
                            color_element = color_hex  # "Default" or "Unknown"
                    except Exception as e:
                        app.logger.warning(f"Could not get color for layer {layer_name}: {e}")
                        color_element = "Unknown"
                
                legend_data.append([
                    display_name,
                    layer_type,
                    opacity_percent,
                    color_element
                ])
            
            # Create table with adjusted column widths for color column
            legend_table = Table(legend_data, colWidths=[120, 60, 60, 80])
            legend_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e9ecef')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # Center align color column
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ]))
            
            story.append(legend_table)
        
        # Build PDF
        doc.build(story)
        
        # Clean up temporary map image file AFTER PDF is built
        if map_image_path and os.path.exists(map_image_path):
            try:
                os.remove(map_image_path)
            except Exception as e:
                app.logger.warning(f"Failed to cleanup map image file {map_image_path}: {e}")
        
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f'map_export_{data.get("timestamp", "").split("T")[0]}.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        app.logger.error(f"PDF export failed: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to generate PDF: {str(e)}'}), 500

def generate_map_image(data):
    """
    Generate map image using WMS GetMap request with base layer and overlays
    """
    try:
        bounds = data['bounds']
        center = data['center']
        zoom = data['zoom']
        active_layers = data.get('activeLayers', [])
        
        width, height = 800, 600
        
        # Create temporary image file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        temp_file.close()
        
        # First, get base map from OpenStreetMap
        base_image = None
        try:
            # Use OpenStreetMap tiles
            tile_z = min(zoom, 18)  # OSM max zoom is 19, but we limit for better performance
            osm_url = f"https://tile.openstreetmap.org/{tile_z}/{int((center['lng'] + 180) / 360 * (2 ** tile_z))}/{int((1 - (center['lat'] + 90) / 180) * (2 ** tile_z))}.png"
            
            response = requests.get(osm_url, timeout=10, headers={'User-Agent': 'MapExportApp/1.0'})
            if response.status_code == 200:
                base_image = PILImage.open(io.BytesIO(response.content))
                # Resize to our target size
                base_image = base_image.resize((width, height), PILImage.Resampling.LANCZOS)
        except Exception as e:
            app.logger.warning(f"Base map request failed: {e}")
        
        # If no base image, create a simple one
        if base_image is None:
            base_image = PILImage.new('RGB', (width, height), color='#e6f3ff')
            draw = ImageDraw.Draw(base_image)
            
            # Draw grid lines for base map
            for i in range(0, width, 100):
                draw.line([i, 0, i, height], fill='#d0e7ff', width=1)
            for i in range(0, height, 100):
                draw.line([0, i, width, i], fill='#d0e7ff', width=1)
        
        # Now overlay GeoServer layers if available
        if active_layers:
            try:
                workspace = active_layers[0].get('workspace', 'topp')
                layer_names = ','.join([f"{layer.get('workspace', workspace)}:{layer.get('name')}" for layer in active_layers])
                
                # Build WMS GetMap request for overlays
                wms_params = {
                    'SERVICE': 'WMS',
                    'VERSION': '1.1.1',
                    'REQUEST': 'GetMap',
                    'LAYERS': layer_names,
                    'STYLES': '',
                    'SRS': 'EPSG:4326',
                    'BBOX': f"{bounds['west']},{bounds['south']},{bounds['east']},{bounds['north']}",
                    'WIDTH': width,
                    'HEIGHT': height,
                    'FORMAT': 'image/png',
                    'TRANSPARENT': 'TRUE'
                }
                
                wms_url = f"{GEOSERVER_BASE_URL}/{workspace}/wms"
                
                response = requests.get(wms_url, params=wms_params, 
                                      auth=(GEOSERVER_USERNAME, GEOSERVER_PASSWORD), 
                                      timeout=30)
                
                if response.status_code == 200 and 'image' in response.headers.get('content-type', ''):
                    # Overlay the GeoServer layers on base map
                    overlay_image = PILImage.open(io.BytesIO(response.content)).convert('RGBA')
                    base_image = base_image.convert('RGBA')
                    
                    # Composite the images
                    combined = PILImage.alpha_composite(base_image, overlay_image)
                    combined = combined.convert('RGB')
                    base_image = combined
                    
            except Exception as e:
                app.logger.warning(f"WMS overlay request failed: {e}")
        
        # Add map annotations
        draw = ImageDraw.Draw(base_image)
        
        try:
            font = ImageFont.truetype("arial.ttf", 16)
            small_font = ImageFont.truetype("arial.ttf", 12)
        except:
            font = ImageFont.load_default()
            small_font = ImageFont.load_default()
        
        # Add north arrow
        draw.text((width-60, 20), "↑ N", fill='#e74c3c', font=font)
        
        # Add scale info in bottom left
        scale_text = f"Zoom: {zoom}"
        draw.text((20, height-30), scale_text, fill='#2c3e50', font=small_font)
        
        # Save the final image
        base_image.save(temp_file.name, 'PNG')
        return temp_file.name
        
    except Exception as e:
        app.logger.error(f"Map image generation failed: {str(e)}")
        return None

def get_layer_style_color(workspace, layer_name):
    """
    Get the primary color used in a layer's style from GeoServer
    """
    try:
        # Get the layer's default style
        style_url = f"{GEOSERVER_BASE_URL}/rest/layers/{workspace}:{layer_name}.json"
        
        response = requests.get(style_url, auth=(GEOSERVER_USERNAME, GEOSERVER_PASSWORD), timeout=10)
        if not response.ok:
            return "Unknown"
        
        layer_info = response.json()
        default_style = layer_info.get('layer', {}).get('defaultStyle', {}).get('name', '')
        
        if not default_style:
            return "Default"
        
        # Get the style definition
        style_def_url = f"{GEOSERVER_BASE_URL}/rest/styles/{default_style}.sld"
        
        style_response = requests.get(style_def_url, auth=(GEOSERVER_USERNAME, GEOSERVER_PASSWORD), timeout=10)
        if not style_response.ok:
            return "Default"
        
        sld_content = style_response.text
        
        # Parse SLD to extract color information
        color = extract_color_from_sld(sld_content)
        return color
        
    except Exception as e:
        app.logger.warning(f"Error getting style color for {workspace}:{layer_name}: {e}")
        return "Unknown"

def extract_color_from_sld(sld_content):
    """
    Extract primary color from SLD content
    """
    import re
    
    # Look for common color patterns in SLD
    # Check for stroke color (lines/polygons)
    stroke_match = re.search(r'<CssParameter name="stroke"[^>]*>([^<]+)</CssParameter>', sld_content, re.IGNORECASE)
    if stroke_match:
        color = stroke_match.group(1).strip()
        if color.startswith('#'):
            return color.upper()
    
    # Check for fill color (polygons)
    fill_match = re.search(r'<CssParameter name="fill"[^>]*>([^<]+)</CssParameter>', sld_content, re.IGNORECASE)
    if fill_match:
        color = fill_match.group(1).strip()
        if color.startswith('#'):
            return color.upper()
    
    # Check for stroke parameter in different format
    stroke_param = re.search(r'stroke:\s*([#\w]+)', sld_content, re.IGNORECASE)
    if stroke_param:
        color = stroke_param.group(1).strip()
        if color.startswith('#'):
            return color.upper()
    
    # Check for fill parameter in different format
    fill_param = re.search(r'fill:\s*([#\w]+)', sld_content, re.IGNORECASE)
    if fill_param:
        color = fill_param.group(1).strip()
        if color.startswith('#'):
            return color.upper()
    
    return "Default"

def create_color_line(color_hex):
    """
    Create a colored line element for PDF table
    """
    from reportlab.platypus import Flowable
    from reportlab.lib import colors as reportlab_colors
    
    class ColorLine(Flowable):
        def __init__(self, color_hex, width=60, height=8):
            self.color_hex = color_hex
            self.width = width
            self.height = height
            
        def draw(self):
            try:
                # Convert hex color to ReportLab color
                color = reportlab_colors.HexColor(self.color_hex)
                self.canv.setFillColor(color)
                self.canv.setStrokeColor(color)
                
                # Draw a thick line (rectangle)
                self.canv.rect(5, 2, self.width - 10, self.height - 4, fill=1, stroke=0)
                
            except Exception as e:
                # Fallback to drawing text if color parsing fails
                self.canv.setFillColor(reportlab_colors.black)
                self.canv.drawString(5, 2, self.color_hex)
    
    return ColorLine(color_hex)

# Test route for i18n
@app.route('/test_i18n')
def test_i18n():
    """Test page for internationalization"""
    from flask import send_from_directory
    return send_from_directory('.', 'test_i18n.html')

# Test route for auto-translation
@app.route('/test_auto_translate')
def test_auto_translate():
    """Test page for auto-translation system"""
    from flask import send_from_directory
    return send_from_directory('.', 'test_auto_translate.html')

# Translation API configuration
@app.route('/api/translate/config')
def get_translate_config():
    """Get translation API configuration"""
    # In production, you would set this as an environment variable
    # For now, we'll return a config that enables fallback translation
    return jsonify({
        'apiKey': None,  # Set your Google Translate API key here
        'fallbackEnabled': True,
        'supportedLanguages': ['en', 'hi']
    })

# API Health endpoint for analytics monitoring
@app.route('/api/health')
def api_health():
    """API health check endpoint for performance monitoring"""
    start_time = time.time()

    try:
        # Simulate some processing time
        time.sleep(0.01)  # 10ms simulated processing

        # Get basic system info if available
        system_info = {}
        try:
            import psutil
            system_info = {
                'cpu_percent': psutil.cpu_percent(),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent if os.name != 'nt' else psutil.disk_usage('C:').percent
            }
        except ImportError:
            system_info = {'note': 'psutil not available'}

        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'response_time_ms': round(response_time, 2),
            'system_info': system_info,
            'version': '1.0.0'
        }), 200

    except Exception as e:
        response_time = (time.time() - start_time) * 1000
        return jsonify({
            'status': 'error',
            'timestamp': datetime.now().isoformat(),
            'response_time_ms': round(response_time, 2),
            'error': str(e)
        }), 500

@app.route('/api/system/metrics')
@admin_required
def get_system_metrics():
    """Get real-time system performance metrics"""
    try:
        import psutil
        import platform

        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()

        # Memory metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()

        # Disk metrics
        disk_usage = psutil.disk_usage('/' if os.name != 'nt' else 'C:')
        disk_io = psutil.disk_io_counters()

        # Network metrics
        network_io = psutil.net_io_counters()
        network_connections = len(psutil.net_connections())

        # Process metrics
        process_count = len(psutil.pids())

        # System uptime
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time

        return jsonify({
            'timestamp': datetime.now().isoformat(),
            'cpu': {
                'percent': round(cpu_percent, 1),
                'count': cpu_count,
                'frequency_mhz': round(cpu_freq.current, 0) if cpu_freq else None,
                'load_avg': os.getloadavg() if hasattr(os, 'getloadavg') else None
            },
            'memory': {
                'total_gb': round(memory.total / (1024**3), 2),
                'used_gb': round(memory.used / (1024**3), 2),
                'available_gb': round(memory.available / (1024**3), 2),
                'percent': round(memory.percent, 1),
                'swap_total_gb': round(swap.total / (1024**3), 2),
                'swap_used_gb': round(swap.used / (1024**3), 2),
                'swap_percent': round(swap.percent, 1)
            },
            'disk': {
                'total_gb': round(disk_usage.total / (1024**3), 2),
                'used_gb': round(disk_usage.used / (1024**3), 2),
                'free_gb': round(disk_usage.free / (1024**3), 2),
                'percent': round((disk_usage.used / disk_usage.total) * 100, 1),
                'read_mb': round(disk_io.read_bytes / (1024**2), 2) if disk_io else 0,
                'write_mb': round(disk_io.write_bytes / (1024**2), 2) if disk_io else 0
            },
            'network': {
                'bytes_sent_mb': round(network_io.bytes_sent / (1024**2), 2),
                'bytes_recv_mb': round(network_io.bytes_recv / (1024**2), 2),
                'packets_sent': network_io.packets_sent,
                'packets_recv': network_io.packets_recv,
                'connections': network_connections,
                'speed_mbps': round((network_io.bytes_sent + network_io.bytes_recv) / (1024**2), 2)
            },
            'system': {
                'platform': platform.system(),
                'platform_version': platform.version(),
                'architecture': platform.architecture()[0],
                'hostname': platform.node(),
                'uptime_hours': round(uptime_seconds / 3600, 1),
                'process_count': process_count,
                'python_version': platform.python_version()
            }
        }), 200

    except ImportError:
        return jsonify({
            'error': 'psutil not available - install with: pip install psutil',
            'timestamp': datetime.now().isoformat()
        }), 500
    except Exception as e:
        app.logger.error(f"Error getting system metrics: {e}")
        return jsonify({
            'error': f'Failed to get system metrics: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

# Analytics API endpoints
@app.route('/api/analytics/track', methods=['POST'])
def track_analytics():
    """Endpoint to receive analytics data from frontend"""
    try:
        data = request.get_json()

        # Add server timestamp
        data['server_timestamp'] = datetime.now().isoformat()
        data['ip_address'] = request.remote_addr
        data['user_agent'] = request.headers.get('User-Agent', '')

        # Here you could save to database, log to file, etc.
        # For now, just return success

        return jsonify({
            'status': 'success',
            'message': 'Analytics data received'
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

