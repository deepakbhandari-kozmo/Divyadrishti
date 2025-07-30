"""
Database Schema for Live Dashboard with Real-Time Analytics
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import uuid
from dataclasses import dataclass, asdict
from firebase_config import get_firestore_db, Collections

@dataclass
class UserSession:
    """User session tracking"""
    session_id: str
    user_id: str
    username: str
    ip_address: str
    user_agent: str
    login_time: datetime
    last_activity: datetime
    is_active: bool = True
    
    def to_dict(self):
        return {
            'session_id': self.session_id,
            'user_id': self.user_id,
            'username': self.username,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'login_time': self.login_time,
            'last_activity': self.last_activity,
            'is_active': self.is_active
        }

@dataclass
class UserActivity:
    """User activity tracking"""
    activity_id: str
    session_id: str
    user_id: str
    action: str  # 'page_view', 'click', 'form_submit', etc.
    page_url: str
    element: Optional[str]
    timestamp: datetime
    metadata: Dict[str, Any]
    
    def to_dict(self):
        return {
            'activity_id': self.activity_id,
            'session_id': self.session_id,
            'user_id': self.user_id,
            'action': self.action,
            'page_url': self.page_url,
            'element': self.element,
            'timestamp': self.timestamp,
            'metadata': self.metadata
        }

@dataclass
class PageView:
    """Page view tracking with performance metrics"""
    view_id: str
    session_id: str
    user_id: str
    page_url: str
    referrer: Optional[str]
    timestamp: datetime
    load_time: int  # milliseconds
    time_on_page: Optional[int]  # seconds
    device_type: str
    browser: str
    
    def to_dict(self):
        return {
            'view_id': self.view_id,
            'session_id': self.session_id,
            'user_id': self.user_id,
            'page_url': self.page_url,
            'referrer': self.referrer,
            'timestamp': self.timestamp,
            'load_time': self.load_time,
            'time_on_page': self.time_on_page,
            'device_type': self.device_type,
            'browser': self.browser
        }

@dataclass
class PerformanceMetric:
    """System performance metrics"""
    metric_id: str
    timestamp: datetime
    avg_load_time: float
    avg_response_time: float
    active_users: int
    page_views: int
    error_count: int
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    
    def to_dict(self):
        return {
            'metric_id': self.metric_id,
            'timestamp': self.timestamp,
            'avg_load_time': self.avg_load_time,
            'avg_response_time': self.avg_response_time,
            'active_users': self.active_users,
            'page_views': self.page_views,
            'error_count': self.error_count,
            'cpu_usage': self.cpu_usage,
            'memory_usage': self.memory_usage,
            'disk_usage': self.disk_usage
        }

class DatabaseManager:
    """Manages all database operations for analytics"""
    
    def __init__(self):
        self.db = get_firestore_db()
        self.collections = {
            'user_sessions': 'user_sessions',
            'user_activities': 'user_activities', 
            'page_views': 'page_views',
            'performance_metrics': 'performance_metrics',
            'system_alerts': 'system_alerts'
        }
    
    # Session Management
    def create_session(self, user_id: str, username: str, ip_address: str, user_agent: str) -> UserSession:
        """Create a new user session"""
        session = UserSession(
            session_id=str(uuid.uuid4()),
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            user_agent=user_agent,
            login_time=datetime.now(),
            last_activity=datetime.now()
        )
        
        self.db.collection(self.collections['user_sessions']).document(session.session_id).set(session.to_dict())
        return session
    
    def update_session_activity(self, session_id: str):
        """Update last activity time for a session"""
        self.db.collection(self.collections['user_sessions']).document(session_id).update({
            'last_activity': datetime.now()
        })
    
    def end_session(self, session_id: str):
        """Mark session as inactive"""
        self.db.collection(self.collections['user_sessions']).document(session_id).update({
            'is_active': False,
            'last_activity': datetime.now()
        })
    
    def get_active_sessions(self) -> List[UserSession]:
        """Get all active sessions"""
        sessions = []
        docs = self.db.collection(self.collections['user_sessions']).where('is_active', '==', True).stream()
        
        for doc in docs:
            data = doc.to_dict()
            sessions.append(UserSession(**data))
        
        return sessions
    
    # Activity Tracking
    def log_activity(self, session_id: str, user_id: str, action: str, page_url: str, 
                    element: str = None, metadata: Dict = None) -> UserActivity:
        """Log user activity"""
        activity = UserActivity(
            activity_id=str(uuid.uuid4()),
            session_id=session_id,
            user_id=user_id,
            action=action,
            page_url=page_url,
            element=element,
            timestamp=datetime.now(),
            metadata=metadata or {}
        )
        
        self.db.collection(self.collections['user_activities']).document(activity.activity_id).set(activity.to_dict())
        return activity
    
    def log_page_view(self, session_id: str, user_id: str, page_url: str, 
                     load_time: int, device_type: str, browser: str, referrer: str = None) -> PageView:
        """Log page view with performance data"""
        page_view = PageView(
            view_id=str(uuid.uuid4()),
            session_id=session_id,
            user_id=user_id,
            page_url=page_url,
            referrer=referrer,
            timestamp=datetime.now(),
            load_time=load_time,
            time_on_page=None,
            device_type=device_type,
            browser=browser
        )
        
        self.db.collection(self.collections['page_views']).document(page_view.view_id).set(page_view.to_dict())
        return page_view
    
    # Analytics Queries
    def get_user_activity_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get user activity statistics for the last N hours"""
        start_time = datetime.now() - timedelta(hours=hours)
        
        # Get page views
        page_views = self.db.collection(self.collections['page_views']).where(
            'timestamp', '>=', start_time
        ).stream()
        
        # Get active sessions
        active_sessions = self.get_active_sessions()
        
        # Process data
        hourly_data = {}
        total_views = 0
        
        for view in page_views:
            data = view.to_dict()
            # Handle both datetime objects and timestamp strings
            timestamp = data.get('timestamp')
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))

            hour = timestamp.replace(minute=0, second=0, microsecond=0)
            hour_key = hour.isoformat()

            if hour_key not in hourly_data:
                hourly_data[hour_key] = {'page_views': 0, 'unique_users': set()}

            hourly_data[hour_key]['page_views'] += 1
            user_id = data.get('user_id', 'unknown')
            hourly_data[hour_key]['unique_users'].add(user_id)
            total_views += 1
        
        # Convert to list format
        result = []
        for hour_key, data in sorted(hourly_data.items()):
            result.append({
                'time': hour_key,
                'activeUsers': len(data['unique_users']),
                'pageViews': data['page_views']
            })
        
        return {
            'hourly_data': result,
            'total_views': total_views,
            'active_users': len(active_sessions)
        }
    
    def get_performance_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance statistics"""
        start_time = datetime.now() - timedelta(hours=hours)
        
        # Get page views for performance data
        page_views = self.db.collection(self.collections['page_views']).where(
            'timestamp', '>=', start_time
        ).stream()
        
        hourly_performance = {}
        
        for view in page_views:
            data = view.to_dict()
            # Handle both datetime objects and timestamp strings
            timestamp = data.get('timestamp')
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))

            hour = timestamp.replace(minute=0, second=0, microsecond=0)
            hour_key = hour.isoformat()

            if hour_key not in hourly_performance:
                hourly_performance[hour_key] = {'load_times': [], 'response_times': []}

            load_time = data.get('load_time', 1000)
            hourly_performance[hour_key]['load_times'].append(load_time)
            # Simulate response time based on load time
            response_time = max(20, load_time // 10 + (load_time % 100))
            hourly_performance[hour_key]['response_times'].append(response_time)
        
        # Calculate averages
        result = []
        for hour_key, data in sorted(hourly_performance.items()):
            avg_load = sum(data['load_times']) / len(data['load_times']) if data['load_times'] else 1000
            avg_response = sum(data['response_times']) / len(data['response_times']) if data['response_times'] else 100
            
            result.append({
                'time': hour_key,
                'loadTime': int(avg_load),
                'responseTime': int(avg_response)
            })
        
        return result

# Global database manager instance
db_manager = DatabaseManager()
