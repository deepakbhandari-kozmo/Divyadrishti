"""
Session-based activity tracking for real-time analytics
"""

from flask import request, session, g
from datetime import datetime, timedelta
import uuid
import json
from user_agents import parse
from database_schema import db_manager
from functools import wraps

class SessionTracker:
    """Tracks user sessions and activities for analytics"""
    
    def __init__(self, app=None):
        self.app = app
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize session tracking with Flask app"""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
    
    def before_request(self):
        """Track request start and user activity"""
        g.request_start_time = datetime.now()
        
        # Skip tracking for static files and API calls that don't need tracking
        if self.should_skip_tracking():
            return
        
        # Get or create session tracking
        if session.get('logged_in'):
            self.track_user_activity()
    
    def after_request(self, response):
        """Track request completion and performance"""
        if hasattr(g, 'request_start_time') and not self.should_skip_tracking():
            # Calculate request duration
            duration = (datetime.now() - g.request_start_time).total_seconds() * 1000
            
            # Track page view with performance data
            if session.get('logged_in') and request.method == 'GET':
                self.track_page_view(duration)
        
        return response
    
    def should_skip_tracking(self):
        """Determine if we should skip tracking for this request"""
        skip_paths = [
            '/static/',
            '/favicon.ico',
            '/api/analytics/',  # Don't track analytics API calls
            '/_debug'
        ]
        
        return any(request.path.startswith(path) for path in skip_paths)
    
    def track_user_activity(self):
        """Track user activity and update session"""
        user_id = session.get('user_id')
        username = session.get('username')
        
        if not user_id:
            return
        
        # Get or create session tracking ID
        if 'tracking_session_id' not in session:
            # Create new tracking session
            tracking_session = db_manager.create_session(
                user_id=user_id,
                username=username,
                ip_address=self.get_client_ip(),
                user_agent=request.headers.get('User-Agent', '')
            )
            session['tracking_session_id'] = tracking_session.session_id
        else:
            # Update existing session activity
            db_manager.update_session_activity(session['tracking_session_id'])
        
        # Log the activity
        db_manager.log_activity(
            session_id=session['tracking_session_id'],
            user_id=user_id,
            action='page_request',
            page_url=request.path,
            element=None,
            metadata={
                'method': request.method,
                'query_params': dict(request.args),
                'referrer': request.referrer
            }
        )
    
    def track_page_view(self, load_time):
        """Track page view with performance metrics"""
        if 'tracking_session_id' not in session:
            return
        
        user_agent = request.headers.get('User-Agent', '')
        parsed_ua = parse(user_agent)
        
        # Determine device type
        if parsed_ua.is_mobile:
            device_type = 'mobile'
        elif parsed_ua.is_tablet:
            device_type = 'tablet'
        else:
            device_type = 'desktop'
        
        db_manager.log_page_view(
            session_id=session['tracking_session_id'],
            user_id=session.get('user_id'),
            page_url=request.path,
            load_time=int(load_time),
            device_type=device_type,
            browser=f"{parsed_ua.browser.family} {parsed_ua.browser.version_string}",
            referrer=request.referrer
        )
    
    def get_client_ip(self):
        """Get client IP address"""
        if request.headers.getlist("X-Forwarded-For"):
            return request.headers.getlist("X-Forwarded-For")[0]
        else:
            return request.remote_addr
    
    def track_interaction(self, interaction_type, element, metadata=None):
        """Track user interaction (to be called from frontend)"""
        if 'tracking_session_id' not in session:
            return
        
        db_manager.log_activity(
            session_id=session['tracking_session_id'],
            user_id=session.get('user_id'),
            action=interaction_type,
            page_url=request.referrer or request.path,
            element=element,
            metadata=metadata or {}
        )

def track_interaction(interaction_type, element=None, metadata=None):
    """Decorator to track specific interactions"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Execute the original function
            result = f(*args, **kwargs)
            
            # Track the interaction
            if session.get('logged_in'):
                tracker = SessionTracker()
                tracker.track_interaction(interaction_type, element, metadata)
            
            return result
        return decorated_function
    return decorator

# Global session tracker instance
session_tracker = SessionTracker()

# API endpoint for frontend interaction tracking
def create_interaction_api(app):
    """Create API endpoint for tracking frontend interactions"""
    
    @app.route('/api/track/interaction', methods=['POST'])
    def track_frontend_interaction():
        """Track interaction from frontend JavaScript"""
        if not session.get('logged_in'):
            return {'error': 'Not logged in'}, 401
        
        data = request.get_json()
        interaction_type = data.get('type')
        element = data.get('element')
        metadata = data.get('metadata', {})
        
        session_tracker.track_interaction(interaction_type, element, metadata)
        
        return {'success': True}
    
    @app.route('/api/track/page-time', methods=['POST'])
    def track_page_time():
        """Track time spent on page"""
        if not session.get('logged_in'):
            return {'error': 'Not logged in'}, 401
        
        data = request.get_json()
        page_url = data.get('page_url')
        time_spent = data.get('time_spent')  # in seconds
        
        # Update the page view record with time spent
        # This would require updating the database schema to support this
        
        return {'success': True}

# JavaScript code to include in templates for frontend tracking
FRONTEND_TRACKING_JS = """
<script>
// Frontend interaction tracking
class FrontendTracker {
    constructor() {
        this.pageStartTime = Date.now();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Track clicks
        document.addEventListener('click', (e) => {
            this.trackInteraction('click', this.getElementSelector(e.target));
        });
        
        // Track form submissions
        document.addEventListener('submit', (e) => {
            this.trackInteraction('form_submit', this.getElementSelector(e.target));
        });
        
        // Track page unload (time spent)
        window.addEventListener('beforeunload', () => {
            const timeSpent = Math.round((Date.now() - this.pageStartTime) / 1000);
            this.trackPageTime(timeSpent);
        });
    }
    
    trackInteraction(type, element, metadata = {}) {
        fetch('/api/track/interaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: type,
                element: element,
                metadata: metadata
            })
        }).catch(console.error);
    }
    
    trackPageTime(timeSpent) {
        navigator.sendBeacon('/api/track/page-time', JSON.stringify({
            page_url: window.location.pathname,
            time_spent: timeSpent
        }));
    }
    
    getElementSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName.toLowerCase();
    }
}

// Initialize tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FrontendTracker();
});
</script>
"""
