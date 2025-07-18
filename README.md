<<<<<<< HEAD
# Drone Application & Research Center

A web-based GIS mapping application for the Uttarakhand Space Application Center that integrates with GeoServer to display and manage geospatial data layers.

## Features

- **Interactive Web Mapping**: Leaflet-based map interface with OpenStreetMap base layer
- **GeoServer Integration**: Dynamic loading of raster and vector layers from GeoServer workspaces
- **Multi-language Support**: English and Hindi language switching
- **User Authentication**: Secure login system with captcha verification
- **Layer Management**: Toggle visibility of different map layers with legends
- **Location Search**: Search and navigate to specific locations using Nominatim API
- **Responsive Design**: Mobile-friendly interface with collapsible sidebar

## Technology Stack

- **Backend**: Python Flask
- **Frontend**: HTML5, CSS3, JavaScript
- **Mapping**: Leaflet.js
- **GIS Server**: GeoServer
- **Geocoding**: OpenStreetMap Nominatim API

## Prerequisites

- Python 3.7+
- GeoServer instance running on `http://172.16.0.145:8080/geoserver`
- Internet connection for OpenStreetMap tiles and Nominatim geocoding

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd my_mapping_app
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set environment variables (optional):
```bash
export SECRET_KEY="your_secret_key_here"
export GEOSERVER_USERNAME="admin"
export GEOSERVER_PASSWORD="geoserver"
```

## Configuration

### GeoServer Configuration
Update the GeoServer connection settings in `static/js/map.js`:
```javascript
const GEOSERVER_WMS_BASE_URL = "http://172.16.0.145:8080/geoserver/";
const GEOSERVER_WFS_BASE_URL = "http://172.16.0.145:8080/geoserver/";
```

### Default Credentials
Default login credentials (configured in `app.py`):
- Username: `admin`
- Password: `admin`

## Running the Application

1. Start the Flask development server:
```bash
python app.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

3. Login using the default credentials or configured user accounts

## Project Structure

```
my_mapping_app/
├── app.py                 # Main Flask application
├── templates/
│   ├── index.html        # Main map interface
│   └── login.html        # Login page
├── static/
│   ├── css/
│   │   ├── style.css     # Main application styles
│   │   └── login.css     # Login page styles
│   ├── js/
│   │   ├── map.js        # Map functionality and GeoServer integration
│   │   └── login.js      # Login form handling
│   └── images/
│       └── logo.png      # Application logo
├── README.md
└── requirements.txt
```

## API Endpoints

### Authentication
- `GET/POST /login` - User login
- `GET /logout` - User logout

### GeoServer Integration
- `GET /api/geoserver/workspaces` - Fetch available workspaces
- `GET /api/geoserver/workspaces/<workspace>/layers` - Fetch layers for workspace
- `GET /api/geoserver/layer_bounds/<workspace>:<layer>` - Get layer bounding box

### Location Services
- `GET /api/search_location?query=<location>` - Search for locations using Nominatim

## Features Overview

### Map Interface
- **Base Layer**: OpenStreetMap tiles
- **Overlay Layers**: GeoServer WMS layers (raster and vector)
- **Controls**: Zoom in/out, locate user, layer toggle
- **Search**: Location search with autocomplete
- **Legends**: Dynamic legend generation for active layers

### Layer Management
- **Workspaces**: Expandable workspace list in sidebar
- **Layer Types**: Separate handling for raster and vector layers
- **Toggle Visibility**: Checkbox-based layer visibility control
- **Bounds Fitting**: Automatic map extent adjustment for loaded layers

### User Interface
- **Responsive Design**: Adapts to different screen sizes
- **Collapsible Sidebar**: Space-efficient layer management
- **Language Switch**: English/Hindi interface translation
- **Modern Styling**: Clean, professional appearance

## Development

### Adding New Layers
1. Add layers to your GeoServer instance
2. Ensure proper workspace configuration
3. Layers will automatically appear in the application

### Customizing Styles
- Modify `static/css/style.css` for main interface
- Modify `static/css/login.css` for login page
- Update color schemes, fonts, and layout as needed

### Extending Functionality
- Add new API endpoints in `app.py`
- Extend map functionality in `static/js/map.js`
- Add new UI components in templates

## Troubleshooting

### Common Issues

1. **GeoServer Connection Failed**
   - Verify GeoServer is running on configured URL
   - Check network connectivity
   - Verify credentials in environment variables

2. **Layers Not Loading**
   - Check GeoServer workspace and layer names
   - Verify WMS service is enabled
   - Check browser console for error messages

3. **Login Issues**
   - Verify default credentials
   - Check session configuration
   - Ensure SECRET_KEY is set

### Debug Mode
Enable Flask debug mode for development:
```python
app.run(debug=True, host='0.0.0.0', port=5000)
```

## Security Considerations

- Change default login credentials in production
- Set a strong SECRET_KEY environment variable
- Configure proper CORS settings for production deployment
- Use HTTPS in production environments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]

## Support

For support and questions, contact the Uttarakhand Space Application Center development team.
=======
# Divyadrishti
Drone Map Application
>>>>>>> a61c893ae2058ffcd4ef32ec7182c433991c6653
