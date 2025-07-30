# Divyadrishti API Documentation

## Overview

The Divyadrishti API provides RESTful endpoints for managing geospatial data, user authentication, and system administration. All endpoints return JSON responses unless otherwise specified.

## Base URL
```
http://localhost:5000/api
```

## Authentication

Most API endpoints require authentication. The application uses session-based authentication with Flask sessions.

### Login Required Endpoints
Endpoints marked with 🔒 require user authentication.

## API Endpoints

### 🔐 Authentication Endpoints

#### POST /login
User authentication with CAPTCHA verification.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123",
  "captcha": "ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "username": "admin",
    "user_type": "admin"
  }
}
```

#### GET /logout
Logout current user and clear session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 🗺️ GeoServer Integration Endpoints

#### GET /api/geoserver/workspaces 🔒
Fetch all available workspaces from GeoServer.

**Response:**
```json
{
  "workspaces": [
    "Administrative_Boundries",
    "Badrinath_2022",
    "Chakrata",
    "ITDA_Dehradun"
  ]
}
```

#### GET /api/geoserver/workspaces/{workspace}/layers 🔒
Fetch raster and vector layers for a specific workspace.

**Parameters:**
- `workspace` (string): Workspace name

**Response:**
```json
{
  "raster_layers": [
    "satellite_imagery",
    "elevation_model"
  ],
  "vector_layers": [
    "buildings",
    "roads",
    "boundaries"
  ]
}
```

#### GET /api/geoserver/layer_bounds/{workspace}:{layer} 🔒
Get bounding box coordinates for a specific layer.

**Parameters:**
- `workspace` (string): Workspace name
- `layer` (string): Layer name

**Response:**
```json
{
  "bounds": [
    [28.0, 77.0],
    [32.0, 81.0]
  ]
}
```

#### GET /api/geoserver/feature_info/{workspace}/{layer} 🔒
Get feature information for vector layers using GetFeatureInfo.

**Parameters:**
- `workspace` (string): Workspace name
- `layer` (string): Layer name

**Query Parameters:**
- `bbox` (string): Bounding box coordinates
- `width` (integer): Map width in pixels
- `height` (integer): Map height in pixels
- `x` (integer): Click X coordinate
- `y` (integer): Click Y coordinate

**Response:**
```json
{
  "features": [
    {
      "properties": {
        "name": "Building A",
        "type": "Residential",
        "area": "1200 sq ft"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

### 🔍 Location Services

#### GET /api/search_location 🔒
Search for locations using OpenStreetMap Nominatim API.

**Query Parameters:**
- `query` (string): Location search query

**Response:**
```json
{
  "results": [
    {
      "display_name": "Dehradun, Uttarakhand, India",
      "lat": "30.3164945",
      "lon": "78.0321918",
      "boundingbox": ["30.2", "30.4", "77.9", "78.1"]
    }
  ]
}
```

### 📄 Export Services

#### POST /api/export_pdf 🔒
Export current map view to PDF with layers and metadata.

**Request Body:**
```json
{
  "map_bounds": {
    "north": 30.5,
    "south": 30.0,
    "east": 78.5,
    "west": 78.0
  },
  "zoom_level": 12,
  "base_layer": "osm",
  "active_layers": [
    {
      "id": "workspace:layer1",
      "name": "Buildings",
      "type": "vector",
      "opacity": 0.8,
      "workspace": "workspace"
    }
  ],
  "center": {
    "lat": 30.25,
    "lng": 78.25
  }
}
```

**Response:**
```json
{
  "success": true,
  "download_url": "/download/map_export_20231201_143022.pdf",
  "filename": "map_export_20231201_143022.pdf"
}
```

### 👥 User Management (Admin Only)

#### GET /api/users 🔒
Get list of all users (Admin only).

**Response:**
```json
{
  "users": [
    {
      "id": "user123",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "analyst",
      "status": "approved",
      "created_at": "2023-12-01T10:30:00Z"
    }
  ]
}
```

#### POST /api/users 🔒
Create new user (Admin only).

**Request Body:**
```json
{
  "username": "new_user",
  "email": "user@example.com",
  "password": "secure_password",
  "role": "user",
  "full_name": "New User"
}
```

#### PUT /api/users/{user_id} 🔒
Update user information (Admin only).

**Request Body:**
```json
{
  "role": "analyst",
  "status": "approved"
}
```

#### DELETE /api/users/{user_id} 🔒
Delete user (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### 📊 Analytics & Monitoring

#### GET /api/analytics/dashboard 🔒
Get dashboard analytics data (Admin only).

**Response:**
```json
{
  "total_users": 150,
  "active_sessions": 12,
  "total_projects": 25,
  "system_health": {
    "cpu_usage": 45.2,
    "memory_usage": 67.8,
    "disk_usage": 23.1
  },
  "recent_activity": [
    {
      "user": "john_doe",
      "action": "viewed_layer",
      "layer": "buildings",
      "timestamp": "2023-12-01T14:30:00Z"
    }
  ]
}
```

#### GET /api/analytics/usage 🔒
Get usage statistics (Admin only).

**Query Parameters:**
- `period` (string): Time period (day, week, month)
- `start_date` (string): Start date (YYYY-MM-DD)
- `end_date` (string): End date (YYYY-MM-DD)

**Response:**
```json
{
  "period": "week",
  "data": [
    {
      "date": "2023-12-01",
      "page_views": 245,
      "unique_users": 18,
      "layer_loads": 156
    }
  ]
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: User not authenticated
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `INVALID_REQUEST`: Request validation failed
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `GEOSERVER_ERROR`: GeoServer connection or data error
- `INTERNAL_ERROR`: Server internal error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **General endpoints**: 100 requests per minute per user
- **Export endpoints**: 10 requests per minute per user
- **Analytics endpoints**: 50 requests per minute per user

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

## SDK and Libraries

### JavaScript SDK
```javascript
// Initialize Divyadrishti API client
const api = new DivyadrishtiAPI({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000
});

// Example usage
const workspaces = await api.getWorkspaces();
const layers = await api.getLayers('workspace_name');
```

### Python SDK
```python
from divyadrishti_sdk import DivyadrishtiClient

# Initialize client
client = DivyadrishtiClient(
    base_url='http://localhost:5000/api',
    username='your_username',
    password='your_password'
)

# Example usage
workspaces = client.get_workspaces()
layers = client.get_layers('workspace_name')
```

## Testing

### API Testing with curl

```bash
# Login
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin","captcha":"ABC123"}'

# Get workspaces
curl -X GET http://localhost:5000/api/geoserver/workspaces \
  -H "Cookie: session=your_session_cookie"

# Export PDF
curl -X POST http://localhost:5000/api/export_pdf \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_cookie" \
  -d '{"map_bounds":{"north":30.5,"south":30.0,"east":78.5,"west":78.0}}'
```

### Postman Collection

A Postman collection is available at `docs/postman/Divyadrishti_API.postman_collection.json` with pre-configured requests for all endpoints.

## Changelog

### v2.0.0 (Latest)
- Added user management endpoints
- Enhanced analytics and monitoring APIs
- Improved error handling and response formats
- Added rate limiting and security improvements

### v1.5.0
- Added PDF export functionality
- Enhanced GeoServer integration
- Added feature information endpoints

### v1.0.0
- Initial API release
- Basic authentication and workspace management
- Location search integration
