# Divyadrishti Codebase Index

## 📁 Project Structure Overview

```
Divyadrishti-main/
├── 📄 Core Application Files
│   ├── app.py                          # Main Flask application (1855 lines)
│   ├── firebase_config.py              # Firebase integration & mock services (298 lines)
│   └── requirements.txt                # Python dependencies (18 lines)
│
├── 🌐 Frontend Templates
│   ├── templates/
│   │   ├── index.html                  # Main map interface (95 lines)
│   │   ├── login.html                  # User authentication page
│   │   ├── register.html               # User registration page
│   │   ├── dashboard.html              # Admin dashboard
│   │   ├── profile.html                # User profile management
│   │   ├── privacy.html                # Privacy policy page
│   │   └── terms.html                  # Terms of service page
│
├── 🎨 Static Assets
│   ├── static/css/
│   │   ├── style.css                   # Main application styles
│   │   ├── theme.css                   # Theme system styles
│   │   ├── dashboard.css               # Admin dashboard styles
│   │   ├── login.css                   # Login page styles
│   │   ├── register.css                # Registration page styles
│   │   ├── profile.css                 # Profile page styles
│   │   └── legal.css                   # Legal pages styles
│   │
│   ├── static/js/
│   │   ├── map.js                      # Core mapping functionality (1472 lines)
│   │   ├── dashboard.js                # Admin dashboard logic
│   │   ├── login.js                    # Authentication handling
│   │   ├── register.js                 # Registration form logic
│   │   ├── profile.js                  # Profile management
│   │   ├── firebase-config.js          # Firebase client configuration
│   │   ├── theme-loader.js             # Theme management
│   │   ├── notifications.js            # Notification system
│   │   ├── auto-notifications.js       # Automated alerts
│   │   ├── system-health.js            # System monitoring
│   │   ├── analytics.js                # User analytics
│   │   └── [15+ other specialized JS files]
│   │
│   └── static/images/
│       ├── logo.png                    # Application logo
│       └── background.png              # Background image
│
├── 📚 Documentation
│   ├── README.md                       # Current project documentation (336 lines)
│   ├── FIREBASE_SETUP.md               # Firebase integration guide (242 lines)
│   ├── AUTO_NOTIFICATION_PARAMETERS.md # Notification system config (275 lines)
│   └── CODEBASE_INDEX.md               # This file
│
├── 🔧 Configuration Files
│   ├── firebase-service-account.json   # Firebase service account credentials
│   ├── firestore-rules.txt            # Firestore security rules
│   ├── google_maps_proper.js           # Google Maps integration
│   └── test_fixes.html                 # Testing utilities
│
└── 🗂️ Runtime Files
    └── __pycache__/                    # Python bytecode cache
        ├── app.cpython-311.pyc
        └── firebase_config.cpython-311.pyc
```

## 🏗️ Architecture Overview

### Backend Architecture (Flask)
- **Framework**: Flask with Python 3.11+
- **Database**: Firebase Firestore (with mock fallback)
- **Authentication**: Firebase Auth + session-based
- **GIS Integration**: GeoServer REST API
- **PDF Generation**: ReportLab + Pillow
- **Monitoring**: psutil for system metrics

### Frontend Architecture
- **Mapping**: Leaflet.js with multiple base layers
- **UI Framework**: Vanilla JavaScript + CSS Grid/Flexbox
- **Real-time Updates**: Firebase SDK + WebSocket-like updates
- **Theme System**: CSS custom properties with dark/light modes
- **Notifications**: Custom toast system with Firestore persistence

### Data Flow
1. **Authentication**: Firebase Auth → Flask sessions → Firestore user management
2. **Map Data**: GeoServer WMS/WFS → Leaflet layers → PDF export
3. **User Management**: Admin dashboard → Firestore → Real-time updates
4. **Monitoring**: System metrics → Auto-notifications → Dashboard alerts

## 🔑 Key Components

### Core Application (app.py)
- **Lines 1-100**: Configuration & Firebase initialization
- **Lines 101-400**: Authentication routes (login, register, logout)
- **Lines 401-500**: Protected routes & decorators
- **Lines 501-900**: Admin dashboard API endpoints
- **Lines 901-1200**: User management & profile APIs
- **Lines 1201-1500**: GeoServer integration APIs
- **Lines 1501-1855**: PDF export & utility functions

### Map Interface (map.js)
- **Lines 1-100**: Configuration & global variables
- **Lines 101-300**: Base layer definitions & initialization
- **Lines 301-600**: GeoServer workspace & layer management
- **Lines 601-900**: Layer rendering & opacity controls
- **Lines 901-1200**: Feature interaction & popups
- **Lines 1201-1472**: PDF export & utility functions

### Firebase Integration (firebase_config.py)
- **Lines 1-100**: Configuration & initialization
- **Lines 101-200**: Mock Firestore for development
- **Lines 201-298**: Helper functions & user management

## 📊 Feature Matrix

| Feature Category | Implementation Status | Key Files |
|------------------|----------------------|-----------|
| **Authentication** | ✅ Complete | `app.py`, `login.js`, `firebase_config.py` |
| **User Management** | ✅ Complete | `dashboard.js`, `profile.js` |
| **GIS Mapping** | ✅ Complete | `map.js`, GeoServer APIs |
| **PDF Export** | ✅ Complete | `app.py` (lines 1501+) |
| **Admin Dashboard** | ✅ Complete | `dashboard.html`, `dashboard.js` |
| **Real-time Monitoring** | ✅ Complete | `auto-notifications.js`, `system-health.js` |
| **Theme System** | ✅ Complete | `theme.css`, `theme-loader.js` |
| **Mobile Responsive** | ✅ Complete | `style.css` media queries |

## 🔌 API Endpoints

### Authentication APIs
- `POST /login` - User authentication
- `POST /register` - User registration
- `GET /logout` - User logout

### GeoServer Integration APIs
- `GET /api/geoserver/workspaces` - List workspaces
- `GET /api/geoserver/workspaces/<workspace>/layers` - List layers
- `GET /api/geoserver/layer_bounds/<workspace>:<layer>` - Get layer bounds
- `GET /api/geoserver/feature_info/<workspace>/<layer>` - Get feature info

### Admin Dashboard APIs
- `GET /api/dashboard/users` - User management
- `PUT /api/dashboard/users/<id>` - Update user
- `DELETE /api/dashboard/users/<id>` - Delete user
- `GET /api/dashboard/storage` - Storage statistics
- `GET /api/dashboard/user_activity` - Activity analytics
- `GET /api/dashboard/alerts` - System alerts

### Utility APIs
- `GET /api/search_location` - Location geocoding
- `POST /api/export_pdf` - PDF map export

## 🗄️ Database Schema (Firestore)

### Collections
- **users**: User accounts and profiles
- **pending_users**: Registration requests awaiting approval
- **user_activities**: Activity logs and audit trail
- **projects**: Project management data
- **alerts**: System notifications and alerts
- **system_logs**: Application logs

### User Document Structure
```javascript
{
  username: string,
  email: string,
  password: string, // Plain text (should be hashed in production)
  full_name: string,
  role: 'admin' | 'analyst' | 'user',
  status: 'approved' | 'pending' | 'rejected',
  organization: string,
  phone: string,
  created_date: timestamp,
  last_login: timestamp,
  login_count: number,
  settings: {
    theme: 'light' | 'dark',
    language: 'en' | 'hi',
    notifications: boolean
  }
}
```

## 🎯 Technology Stack

### Backend Dependencies
- **Flask 2.3.0+**: Web framework
- **firebase-admin 6.0.0+**: Firebase integration
- **requests 2.28.0+**: HTTP client for GeoServer
- **reportlab 4.0.0+**: PDF generation
- **Pillow 10.0.0+**: Image processing
- **psutil 5.9.0+**: System monitoring

### Frontend Dependencies
- **Leaflet 1.9.4**: Interactive mapping
- **Font Awesome 6.0**: Icon library
- **Firebase SDK**: Client-side Firebase integration

### External Services
- **GeoServer**: Geospatial data server (http://172.16.0.145:8080/geoserver)
- **OpenStreetMap Nominatim**: Geocoding service
- **Google Maps**: Satellite/hybrid base layers

## 🔧 Configuration Points

### Environment Variables
- `SECRET_KEY`: Flask session encryption
- `FIREBASE_PROJECT_ID`: Firebase project identifier
- `FIREBASE_SERVICE_ACCOUNT_JSON`: Service account credentials
- `GEOSERVER_USERNAME/PASSWORD`: GeoServer authentication

### Configurable Constants
- **GeoServer URLs**: `map.js` lines 4-6
- **Default workspace**: `map.js` line 13
- **Notification thresholds**: `AUTO_NOTIFICATION_PARAMETERS.md`
- **Theme colors**: `theme.css` custom properties

## 🚀 Deployment Considerations

### Production Checklist
- [ ] Change default admin credentials
- [ ] Implement password hashing (bcrypt)
- [ ] Configure HTTPS/SSL
- [ ] Set up proper Firestore security rules
- [ ] Configure environment variables
- [ ] Set up monitoring and logging
- [ ] Optimize static asset delivery
- [ ] Configure backup strategies

### Performance Optimizations
- Layer caching in `cachedWorkspaceLayers`
- Efficient PDF generation with image compositing
- Real-time updates with minimal database queries
- Responsive design with mobile optimization

## 📈 Monitoring & Analytics

### Built-in Monitoring
- System resource monitoring (CPU, memory, disk, network)
- API health checks and response time monitoring
- User activity tracking and analytics
- Real-time notification system
- Browser resource monitoring

### Analytics Features
- User login patterns and session tracking
- Map usage analytics and layer popularity
- PDF export statistics
- System performance metrics
- Error tracking and reporting
