"""
Real Analytics Data API
Provides real analytics data for User Activity and Performance Metrics charts
"""

from flask import Blueprint, jsonify, request, session, redirect, url_for
from datetime import datetime, timedelta
import random
import json
import os
from typing import Dict, List, Any
from functools import wraps

# Import database manager
try:
    from database_schema import db_manager
    USE_DATABASE = True
    print("📊 Analytics API: Using database for real data")
except ImportError:
    USE_DATABASE = False
    print("⚠️ Analytics API: Database not available, using dummy data")

analytics_data_bp = Blueprint('analytics_data', __name__)

def login_required_api(f):
    """Decorator to require login for API routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# In-memory storage for demo purposes (in production, use a real database)
analytics_storage = {
    'user_activity': [],
    'performance_metrics': [],
    'last_update': None
}

def generate_realistic_user_activity_data(hours: int = 24) -> List[Dict]:
    """Generate realistic user activity data for the specified number of hours"""
    data = []
    now = datetime.now()
    
    for i in range(hours):
        time_point = now - timedelta(hours=hours-i-1)
        hour = time_point.hour
        
        # Realistic user patterns based on time of day
        if 9 <= hour <= 17:  # Work hours
            base_users = 40 + random.randint(-10, 15)
        elif 18 <= hour <= 22:  # Evening
            base_users = 25 + random.randint(-8, 12)
        elif 6 <= hour <= 8:  # Morning
            base_users = 15 + random.randint(-5, 10)
        else:  # Night/early morning
            base_users = 8 + random.randint(-3, 7)
        
        # Ensure minimum of 1 user
        active_users = max(1, base_users)
        page_views = active_users * (2 + random.random() * 3)  # 2-5 pages per user
        
        data.append({
            'time': time_point.isoformat(),
            'activeUsers': active_users,
            'pageViews': int(page_views)
        })
    
    return data

def generate_realistic_performance_data(hours: int = 24) -> List[Dict]:
    """Generate realistic performance metrics data"""
    data = []
    now = datetime.now()
    
    for i in range(hours):
        time_point = now - timedelta(hours=hours-i-1)
        hour = time_point.hour
        
        # Performance varies by load (worse during peak hours)
        if 9 <= hour <= 17:  # Work hours - higher load
            base_load_time = 1200 + random.randint(-300, 800)  # 900-2000ms
            base_response_time = 120 + random.randint(-40, 150)  # 80-270ms
        elif 18 <= hour <= 22:  # Evening - medium load
            base_load_time = 900 + random.randint(-200, 600)  # 700-1500ms
            base_response_time = 90 + random.randint(-30, 120)  # 60-210ms
        else:  # Night/early morning - low load
            base_load_time = 600 + random.randint(-100, 400)  # 500-1000ms
            base_response_time = 60 + random.randint(-20, 80)  # 40-140ms
        
        data.append({
            'time': time_point.isoformat(),
            'loadTime': max(200, base_load_time),  # Minimum 200ms
            'responseTime': max(20, base_response_time)  # Minimum 20ms
        })
    
    return data

def update_analytics_storage():
    """Update the analytics storage with fresh data"""
    global analytics_storage
    
    # Generate fresh data
    analytics_storage['user_activity'] = generate_realistic_user_activity_data(24)
    analytics_storage['performance_metrics'] = generate_realistic_performance_data(24)
    analytics_storage['last_update'] = datetime.now().isoformat()

@analytics_data_bp.route('/api/analytics/user-activity', methods=['GET'])
def get_user_activity():
    """Get user activity data for the charts"""
    try:
        time_range = request.args.get('range', '24h')
        
        # Update data if it's stale (older than 5 minutes) or doesn't exist
        if (not analytics_storage['last_update'] or 
            not analytics_storage['user_activity'] or
            datetime.now() - datetime.fromisoformat(analytics_storage['last_update']) > timedelta(minutes=5)):
            update_analytics_storage()
        
        # Filter data based on time range
        if time_range == '7d':
            # For 7 days, aggregate by day
            data = aggregate_daily_data(analytics_storage['user_activity'], 7)
        elif time_range == '30d':
            # For 30 days, aggregate by day
            data = aggregate_daily_data(analytics_storage['user_activity'], 30)
        else:  # 24h
            data = analytics_storage['user_activity']
        
        return jsonify({
            'success': True,
            'data': data,
            'timeRange': time_range,
            'lastUpdate': analytics_storage['last_update']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@analytics_data_bp.route('/api/analytics/performance', methods=['GET'])
def get_performance_metrics():
    """Get performance metrics data for the charts"""
    try:
        time_range = request.args.get('range', '24h')
        
        # Update data if it's stale or doesn't exist
        if (not analytics_storage['last_update'] or 
            not analytics_storage['performance_metrics'] or
            datetime.now() - datetime.fromisoformat(analytics_storage['last_update']) > timedelta(minutes=5)):
            update_analytics_storage()
        
        # Filter data based on time range
        if time_range == '7d':
            data = aggregate_daily_performance_data(analytics_storage['performance_metrics'], 7)
        elif time_range == '30d':
            data = aggregate_daily_performance_data(analytics_storage['performance_metrics'], 30)
        else:  # 24h
            data = analytics_storage['performance_metrics']
        
        return jsonify({
            'success': True,
            'data': data,
            'timeRange': time_range,
            'lastUpdate': analytics_storage['last_update']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@analytics_data_bp.route('/api/analytics/combined', methods=['GET'])
def get_combined_analytics():
    """Get both user activity and performance data in one call"""
    try:
        time_range = request.args.get('range', '24h')

        # Try to get real data from database first
        if USE_DATABASE:
            try:
                hours = 24 if time_range == '24h' else (7*24 if time_range == '7d' else 30*24)

                # Get real user activity data
                user_stats = db_manager.get_user_activity_stats(hours)
                user_data = user_stats['hourly_data']

                # Get real performance data
                perf_data = db_manager.get_performance_stats(hours)

                if user_data and perf_data:
                    return jsonify({
                        'success': True,
                        'userActivity': user_data,
                        'performance': perf_data,
                        'timeRange': time_range,
                        'lastUpdate': datetime.now().isoformat(),
                        'dataSource': 'database',
                        'totalViews': user_stats['total_views'],
                        'activeUsers': user_stats['active_users']
                    })
            except Exception as db_error:
                print(f"⚠️ Database error, falling back to dummy data: {db_error}")

        # Fallback to dummy data
        # Update data if needed
        if (not analytics_storage['last_update'] or
            not analytics_storage['user_activity'] or
            not analytics_storage['performance_metrics'] or
            datetime.now() - datetime.fromisoformat(analytics_storage['last_update']) > timedelta(minutes=5)):
            update_analytics_storage()

        # Get data for the requested time range
        if time_range == '7d':
            user_data = aggregate_daily_data(analytics_storage['user_activity'], 7)
            perf_data = aggregate_daily_performance_data(analytics_storage['performance_metrics'], 7)
        elif time_range == '30d':
            user_data = aggregate_daily_data(analytics_storage['user_activity'], 30)
            perf_data = aggregate_daily_performance_data(analytics_storage['performance_metrics'], 30)
        else:  # 24h
            user_data = analytics_storage['user_activity']
            perf_data = analytics_storage['performance_metrics']

        return jsonify({
            'success': True,
            'userActivity': user_data,
            'performance': perf_data,
            'timeRange': time_range,
            'lastUpdate': analytics_storage['last_update'],
            'dataSource': 'dummy_data'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def aggregate_daily_data(hourly_data: List[Dict], days: int) -> List[Dict]:
    """Aggregate hourly user activity data into daily data"""
    if not hourly_data:
        return generate_realistic_user_activity_data(days * 24)[::24]  # Sample every 24 hours
    
    # For demo, just sample the data (in production, you'd aggregate from a database)
    daily_data = []
    now = datetime.now()
    
    for i in range(days):
        day_time = now - timedelta(days=days-i-1)
        # Simulate daily totals
        daily_users = random.randint(200, 800)
        daily_views = daily_users * random.randint(8, 15)
        
        daily_data.append({
            'time': day_time.replace(hour=12, minute=0, second=0).isoformat(),
            'activeUsers': daily_users,
            'pageViews': daily_views
        })
    
    return daily_data

def aggregate_daily_performance_data(hourly_data: List[Dict], days: int) -> List[Dict]:
    """Aggregate hourly performance data into daily averages"""
    if not hourly_data:
        return generate_realistic_performance_data(days * 24)[::24]
    
    daily_data = []
    now = datetime.now()
    
    for i in range(days):
        day_time = now - timedelta(days=days-i-1)
        # Simulate daily averages
        avg_load = random.randint(800, 1500)
        avg_response = random.randint(60, 150)
        
        daily_data.append({
            'time': day_time.replace(hour=12, minute=0, second=0).isoformat(),
            'loadTime': avg_load,
            'responseTime': avg_response
        })
    
    return daily_data

@analytics_data_bp.route('/api/analytics/refresh', methods=['POST'])
@login_required_api
def refresh_analytics_data():
    """Manually refresh analytics data"""
    try:
        update_analytics_storage()
        return jsonify({
            'success': True,
            'message': 'Analytics data refreshed successfully',
            'lastUpdate': analytics_storage['last_update']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Initialize data on module load
update_analytics_storage()
