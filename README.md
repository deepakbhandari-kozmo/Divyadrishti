# Divyadrishti - Drone Map Application

A comprehensive web-based GIS mapping application for the Uttarakhand Space Application Center that integrates with GeoServer to display and manage geospatial data layers with advanced features including PDF export functionality with visual layer color representation.

## Features

- **Interactive Web Mapping**: Leaflet-based map interface with multiple base layer options
- **Multiple Base Maps**: OpenStreetMap, Google Satellite, Google Hybrid, Google Terrain, Esri Satellite, CartoDB variants
- **GeoServer Integration**: Dynamic loading of raster and vector layers from GeoServer workspaces
- **Layer Opacity Control**: Individual opacity sliders for each layer (0-100%)
- **Smart Layer Loading**: Vector layers load without auto-zoom, raster layers auto-fit to bounds
- **Multi-language Support**: English and Hindi language switching
- **User Authentication**: Secure login system with captcha verification
- **Layer Management**: Toggle visibility of different map layers with legends
- **Location Search**: Search and navigate to specific locations using Nominatim API
- **Feature Information**: Click on vector layers to get detailed attribute information
- **Responsive Design**: Mobile-friendly interface with collapsible sidebar
- **Legend Display**: Dynamic legend generation with opacity controls for active layers
- **Enhanced PDF Export**: Export current map view with layers, metadata, and visual color representation
- **Map Image Generation**: Composite map images with base layers and GeoServer overlays
- **Color-Coded Layer Table**: Visual color lines showing actual GeoServer style colors for vector layers

## Technology Stack

- **Backend**: Python Flask
- **Frontend**: HTML5, CSS3, JavaScript
- **Mapping**: Leaflet.js
- **GIS Server**: GeoServer
- **Geocoding**: OpenStreetMap Nominatim API
- **Base Maps**: Multiple providers (Google, Esri, CartoDB)
- **PDF Generation**: ReportLab with custom Flowables
- **Image Processing**: Pillow (PIL)
- **Style Parsing**: Regular expressions for SLD color extraction

## Prerequisites

- Python 3.7+
- GeoServer instance running on `http://172.16.0.145:8080/geoserver`
- Internet connection for base map tiles and Nominatim geocoding

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd divyadrishti
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

3. Login using the default credentials

## Project Structure

```
divyadrishti/
├── app.py                 # Main Flask application with API endpoints and PDF export
├── templates/
│   ├── index.html        # Main map interface with header and controls
│   └── login.html        # Login page with captcha
├── static/
│   ├── css/
│   │   ├── style.css     # Main application styles with legend and opacity controls
│   │   └── login.css     # Login page styles
│   ├── js/
│   │   ├── map.js        # Map functionality, GeoServer integration, and layer management
│   │   └── login.js      # Login form handling with captcha
│   └── images/
│       └── logo.png      # Application logo
├── README.md
└── requirements.txt
```

## API Endpoints

### Authentication
- `GET/POST /login` - User login with captcha verification
- `GET /logout` - User logout

### GeoServer Integration
- `GET /api/geoserver/workspaces` - Fetch available workspaces
- `GET /api/geoserver/workspaces/<workspace>/layers` - Fetch raster and vector layers for workspace
- `GET /api/geoserver/layer_bounds/<workspace>:<layer>` - Get layer bounding box for auto-zoom
- `GET /api/geoserver/feature_info/<workspace>/<layer>` - Get feature information for vector layers

### Location Services
- `GET /api/search_location?query=<location>` - Search for locations using Nominatim

### Export Services
- `POST /api/export_pdf` - Export current map view to PDF with layers and metadata

## Key Features Overview

### Map Interface
- **Base Layers**: Multiple base map options via dropdown selector
- **Overlay Layers**: GeoServer WMS layers (raster and vector) with opacity control
- **Controls**: Zoom in/out, locate user, layer toggle, search, PDF export
- **Default Location**: Centered on Uttarakhand state
- **Legends**: Dynamic legend generation with individual opacity sliders

### Layer Management
- **Workspaces**: Expandable workspace list in sidebar
- **Layer Types**: Separate handling for raster and vector layers
- **Smart Loading**: Vector layers maintain current map view, raster layers auto-zoom to bounds
- **Opacity Control**: 0-100% opacity sliders for each active layer
- **Persistent State**: Layers remain active when changing base maps
- **Color Extraction**: Automatic color detection from GeoServer SLD styles

### Enhanced PDF Export Features
- **Map Image**: Composite image with base layer and GeoServer overlays
- **Metadata**: Location coordinates, address, timestamp, scale information
- **Visual Layer Table**: Enhanced table showing Layer, Type, Opacity, and Color columns
- **Color Representation**: Actual colored lines for vector layers showing GeoServer style colors
- **Style Integration**: Automatic extraction of fill and stroke colors from SLD styles
- **Professional Layout**: A4 format with proper headers and styling
- **Error Handling**: Graceful fallbacks for image generation and color extraction failures

### Advanced Features
- **Feature Information**: Click on vector layers to view attributes in styled popups
- **Multi-language**: English/Hindi interface translation
- **Responsive Design**: Adapts to different screen sizes
- **Layer Legends**: Automatic legend retrieval from GeoServer
- **Search Integration**: Location search with Nominatim geocoding
- **Style Color Detection**: Extracts primary colors from GeoServer SLD styles for visual representation

### User Interface
- **Modern Header**: Logo, title, user info, and language switcher
- **Collapsible Sidebar**: Space-efficient layer management
- **Legend Panel**: Dynamic legend cards with opacity controls
- **Professional Styling**: Clean, modern appearance with consistent theming

## Development

### Adding New Layers
1. Add layers to your GeoServer instance
2. Ensure proper workspace configuration
3. Layers will automatically appear in the application with legends and opacity controls

### Customizing Base Maps
- Modify the `baseLayers` object in `static/js/map.js`
- Add new tile layer configurations
- Update the dropdown options in `renderWorkspaces` function

### Extending Functionality
- Add new API endpoints in `app.py`
- Extend map functionality in `static/js/map.js`
- Add new UI components in templates
- Customize styling in CSS files

## Troubleshooting

### Common Issues

1. **GeoServer Connection Failed**
   - Verify GeoServer is running on configured URL
   - Check network connectivity and firewall settings
   - Verify credentials in environment variables

2. **Layers Not Loading**
   - Check GeoServer workspace and layer names
   - Verify WMS service is enabled in GeoServer
   - Check browser console for error messages
   - Ensure layer bounds are properly configured

3. **PDF Export Issues**
   - Check temporary file permissions
   - Verify ReportLab and Pillow installations
   - Check network connectivity for base map tiles
   - Monitor server logs for detailed error messages

4. **Opacity Controls Not Working**
   - Check that layers are properly added to overlay group
   - Verify layer IDs match between legend and map layers
   - Check browser console for JavaScript errors

5. **Auto-Zoom Not Working**
   - Verify layer bounds API endpoint is accessible
   - Check that layer has valid bounding box in GeoServer
   - Ensure layer bounds are in EPSG:4326 format

6. **Login Issues**
   - Verify default credentials (admin/admin)
   - Check session configuration
   - Ensure SECRET_KEY is set
   - Verify captcha functionality

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
- Implement proper session management
- Validate all user inputs server-side

## Performance Optimization

- **Layer Caching**: Workspace layers are cached to reduce API calls
- **Efficient Rendering**: Layers are rendered on-demand
- **Smart Loading**: Vector layers load without changing map view for better user experience
- **Color Caching**: Layer style colors are extracted once and cached
- **PDF Generation**: Optimized image processing and composite generation

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with different layer types and PDF export
5. Submit a pull request

## License

[Add your license information here]

## Support

For support and questions, contact the Uttarakhand Space Application Center development team.

## Version History

- **v1.0.0**: Initial release with basic mapping functionality
- **v1.1.0**: Added multiple base maps and layer management
- **v1.2.0**: Added opacity controls and auto-zoom features
- **v1.3.0**: Enhanced UI/UX with legends and feature information
- **v1.4.0**: Added PDF export functionality with map images and metadata
- **v1.5.0**: Enhanced PDF export with visual color representation and smart vector layer loading

## Setting Up Layer Colors in GeoServer

To ensure vector layers show colored lines instead of "Default" in PDF exports:

### Method 1: GeoServer Web Interface
1. Access GeoServer Admin at `http://172.16.0.145:8080/geoserver/web`
2. Navigate to "Styles" → "Add a new style"
3. Create SLD with color definitions:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer>
    <Name>your_layer_name</Name>
    <UserStyle>
      <FeatureTypeStyle>
        <Rule>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#FF6B35</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#D2691E</CssParameter>
              <CssParameter name="stroke-width">2</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
```

4. Apply the style to your layer in "Layers" → "Publishing" tab

### Recommended Layer Colors
- **Buildings**: `#FF6B35` (Orange)
- **Roads**: `#8B4513` (Brown)
- **Properties**: `#4169E1` (Royal Blue)
- **Open_Space**: `#32CD32` (Lime Green)
- **Water Bodies**: `#1E90FF` (Dodger Blue)

## Troubleshooting

### PDF Export Issues
- **Color Not Showing**: Ensure vector layers have custom SLD styles with defined fill/stroke colors
- **"Default" in Color Column**: Create custom styles in GeoServer with specific color definitions
- **Color Extraction Failed**: Check that SLD contains `<CssParameter name="fill">` or `<CssParameter name="stroke">` elements

### Layer Loading Issues
- **Vector Layers Auto-Zooming**: Fixed - vector layers now maintain current map view
- **Raster Layers Not Fitting**: Raster layers automatically zoom to layer bounds as intended
