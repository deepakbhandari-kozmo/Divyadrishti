# app.py

from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
import os
import requests
from datetime import datetime

app = Flask(__name__)

# --- Configuration ---
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_secret_key_here_change_in_production')

GEOSERVER_BASE_URL = "http://172.16.0.145:8080/geoserver"
GEOSERVER_USERNAME = os.environ.get('GEOSERVER_USERNAME', 'admin')
GEOSERVER_PASSWORD = os.environ.get('GEOSERVER_PASSWORD', 'geoserver')

# Default login credentials
DEFAULT_CREDENTIALS = {
    'admin': 'admin'
}

# --- Authentication Routes ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    
    # Handle POST request (login form submission)
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user_type = data.get('user_type', 'user')
    captcha = data.get('captcha')
    
    # Note: In a real application, you would validate the captcha server-side
    # For this demo, we're doing client-side validation
    
    # Simple authentication check
    if username in DEFAULT_CREDENTIALS and DEFAULT_CREDENTIALS[username] == password:
        session['logged_in'] = True
        session['username'] = username
        session['user_type'] = user_type
        return jsonify({'success': True, 'message': 'Login successful'})
    else:
        return jsonify({'success': False, 'message': 'Invalid username or password'})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --- Protected Routes ---

def login_required(f):
    """Decorator to require login for routes"""
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@app.route('/')
@login_required
def index():
    return render_template('index.html')

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
