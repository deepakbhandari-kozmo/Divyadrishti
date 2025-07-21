// For proper Google Maps integration, add this to your HTML:
// <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY"></script>

// Then use this instead of tile URLs:
'google-satellite': {
    name: 'Google Satellite',
    layer: () => L.gridLayer.googleMutant({
        type: 'satellite',
        apikey: 'YOUR_GOOGLE_MAPS_API_KEY'
    })
}