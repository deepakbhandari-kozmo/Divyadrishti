// static/js/map.js

// --- Configuration ---
const GEOSERVER_WMS_BASE_URL = "http://172.16.0.145:8080/geoserver/";
const GEOSERVER_WFS_BASE_URL = "http://172.16.0.145:8080/geoserver/";
const GEOSERVER_LEGEND_GRAPHIC_BASE_URL = "http://172.16.0.145:8080/geoserver/";

const API_WORKSPACES_URL = "/api/geoserver/workspaces";
const API_LAYERS_URL_PREFIX = "/api/geoserver/workspaces/";
const API_LAYER_BOUNDS_URL_PREFIX = "/api/geoserver/layer_bounds/";

// Change this to a workspace that actually exists in your GeoServer
const PRIMARY_DEFAULT_WORKSPACE = "topp"; // Common default workspace, change to your actual workspace

const FALLBACK_BOUNDS = [[-90, -180], [90, 180]]; // World view

// --- Global Map Variables ---
let map;
let osmBaseLayer = null; // OpenStreetMap base layer
let currentBaseLayer = null; // To keep track of the currently loaded WMS base layer
let currentOverlayLayers = L.layerGroup(); // To manage dynamic overlay layers (vector, etc.)
let cachedWorkspaceLayers = {}; // Cache to store fetched layers for each workspace

// Add a global object to track layer states
let layerStates = {};

// --- Helper function to fetch layer bounds ---
async function fetchLayerBounds(fullLayerId) {
    try {
        console.log(`Making API call to fetch bounds for: ${fullLayerId}`);
        const response = await fetch(`${API_LAYER_BOUNDS_URL_PREFIX}${encodeURIComponent(fullLayerId)}`);
        
        if (!response.ok) {
            console.error(`Failed to fetch bounds for ${fullLayerId}: HTTP status ${response.status}`);
            const errorText = await response.text();
            console.error("Backend error response:", errorText);
            return FALLBACK_BOUNDS;
        }
        
        const data = await response.json();
        console.log(`API response for ${fullLayerId}:`, data);
        
        if (data.bounds && Array.isArray(data.bounds) && data.bounds.length === 2) {
            console.log(`Valid bounds found for ${fullLayerId}:`, data.bounds);
            return data.bounds;
        } else {
            console.warn(`Invalid bounds format in response for ${fullLayerId}:`, data);
            return FALLBACK_BOUNDS;
        }
    } catch (error) {
        console.error(`Error fetching bounds for ${fullLayerId}:`, error);
        return FALLBACK_BOUNDS;
    }
}


// --- Main Map Initialization Function (now async and more dynamic) ---
async function initializeMap() {
    // 1. Initialize the Map instance
    map = L.map('map', {
        zoomControl: false,
        maxZoom: 20,
        minZoom: 2,
    });
    
    // 2. Add OpenStreetMap as default base layer
    osmBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Set initial view to Uttarakhand state (broader view than Dehradun)
    map.setView([30.0668, 79.0193], 8); // Uttarakhand center coordinates with zoom level 8
    
    // Add the currentOverlayLayers group to the map from the start
    currentOverlayLayers.addTo(map);
    
    // 3. Add Scale Control
    L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false,
        maxWidth: 200
    }).addTo(map);

    // 4. Add Compass Control
    addCompassControl();

    // 5. Setup Sidebar
    setupSidebar();

    // 6. Setup UI Event Listeners
    setupUIEventListeners();

    // 7. Attempt to load a default base layer from the PRIMARY_DEFAULT_WORKSPACE
    await loadInitialBaseLayer();
}

async function loadInitialBaseLayer() {
    try {
        // Check if the primary workspace exists first
        const workspacesResponse = await fetch(API_WORKSPACES_URL);
        if (!workspacesResponse.ok) {
            console.error('Failed to fetch workspaces list');
            return;
        }
        
        const workspacesData = await workspacesResponse.json();
        const availableWorkspaces = workspacesData.workspaces || [];
        
        // Check if PRIMARY_DEFAULT_WORKSPACE exists
        if (!availableWorkspaces.includes(PRIMARY_DEFAULT_WORKSPACE)) {
            console.log(`Default workspace '${PRIMARY_DEFAULT_WORKSPACE}' not found. Available workspaces:`, availableWorkspaces);
            return;
        }

        // Fetch layers for the default workspace
        const response = await fetch(`${API_LAYERS_URL_PREFIX}${encodeURIComponent(PRIMARY_DEFAULT_WORKSPACE)}/layers`);
        if (!response.ok) {
            console.error(`Failed to fetch layers for initial workspace ${PRIMARY_DEFAULT_WORKSPACE}: HTTP status ${response.status}`);
            return;
        }
        const data = await response.json();
        cachedWorkspaceLayers[PRIMARY_DEFAULT_WORKSPACE] = data;

        const vectorLayers = data.vector_layers;

        // Load any vector layers from the default workspace immediately
        if (vectorLayers && vectorLayers.length > 0) {
            loadOverlayLayers(PRIMARY_DEFAULT_WORKSPACE, vectorLayers);
        }

    } catch (error) {
        console.error(`Error during initial layer load for ${PRIMARY_DEFAULT_WORKSPACE}:`, error);
    }
}


// --- Dynamic Layer and Legend Generation (Updated) ---
function clearMapOverlaysAndLegends() {
    currentOverlayLayers.clearLayers(); // Remove all existing overlay layers
    const dynamicLegendContainer = document.getElementById('dynamic-legend-items');
    if (dynamicLegendContainer) {
        dynamicLegendContainer.innerHTML = ''; // Clear existing legends only if element exists
    }
}

function loadOverlayLayers(workspaceName, vectorLayers) {
    clearMapOverlaysAndLegends(); // Clear previous layers and legends first

    const dynamicLegendContainer = document.getElementById('dynamic-legend-items');
    
    if (!vectorLayers || vectorLayers.length === 0) {
        if (dynamicLegendContainer) {
            dynamicLegendContainer.innerHTML = '<p>No vector layers to display.</p>';
        }
        return;
    }

    vectorLayers.forEach(layerName => {
        const fullLayerName = `${workspaceName}:${layerName}`;
        const defaultStyleName = `${workspaceName}:${layerName}`;

        const wmsLayer = L.tileLayer.wms(`${GEOSERVER_WMS_BASE_URL}${workspaceName}/wms?`, {
            layers: fullLayerName,
            styles: defaultStyleName,
            format: 'image/png',
            transparent: true,
            version: '1.1.1',
            attribution: `Vector Data &copy; ${workspaceName}`,
            maxZoom: 20,
            minZoom: 1
        });

        wmsLayer._layerId = fullLayerName;
        wmsLayer._layerName = layerName;
        wmsLayer._workspaceName = workspaceName;

        currentOverlayLayers.addLayer(wmsLayer);
        addLegendCard(workspaceName, layerName, fullLayerName);
    });
}


// --- Sidebar Functionality (Updated) ---
const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const workspaceListContainer = document.getElementById('workspace-list');

function setupSidebar() {
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    
    sidebarToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed');
        
        if (sidebar.classList.contains('collapsed')) {
            sidebarToggleBtn.textContent = '☰';
            menuToggleBtn.style.display = 'flex'; // Show menu button when sidebar is collapsed
        } else {
            sidebarToggleBtn.textContent = '✖';
            menuToggleBtn.style.display = 'none'; // Hide menu button when sidebar is open
        }
        
        // Force map to resize after sidebar toggle
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
            }
        }, 300); // Wait for CSS transition to complete
    });
    
    // Menu button click handler to reopen sidebar
    menuToggleBtn.addEventListener('click', () => {
        sidebar.classList.remove('collapsed');
        document.body.classList.remove('sidebar-collapsed');
        sidebarToggleBtn.textContent = '✖';
        menuToggleBtn.style.display = 'none';
        
        // Force map to resize after sidebar reopen
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
            }
        }, 300); // Wait for CSS transition to complete
    });
    
    fetchAndRenderWorkspaces();
}

// Function to fetch and render workspaces (caches data)
async function fetchAndRenderWorkspaces() {
    workspaceListContainer.innerHTML = 'Loading workspaces...';
    try {
        const response = await fetch(API_WORKSPACES_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        renderWorkspaces(data.workspaces);
    } catch (error) {
        console.error("Error fetching workspaces:", error);
        workspaceListContainer.innerHTML = `<p style="color: red;">Failed to load workspaces: ${error.message}</p>`;
    }
}

// Function to render workspaces in the sidebar (Updated to remove "Open" button)
function renderWorkspaces(workspaces) {
    workspaceListContainer.innerHTML = '';
    
    // Add OSM reset button at the top
    const osmResetDiv = document.createElement('div');
    osmResetDiv.className = 'osm-reset-container';
    osmResetDiv.innerHTML = `
        <button class="osm-reset-btn">
            <i class="fas fa-globe"></i> Reset to OpenStreetMap
        </button>
    `;
    workspaceListContainer.appendChild(osmResetDiv);
    
    // Add event listener for OSM reset button
    const osmResetBtn = osmResetDiv.querySelector('.osm-reset-btn');
    osmResetBtn.addEventListener('click', () => {
        // Remove any GeoServer base layers
        if (currentBaseLayer) {
            map.removeLayer(currentBaseLayer);
            currentBaseLayer = null;
        }
        // Clear overlay layers
        currentOverlayLayers.clearLayers();
        // Clear legend container
        const legendContainer = document.getElementById('legend-container');
        if (legendContainer) {
            legendContainer.innerHTML = '';
        }
        // Reset to Uttarakhand state view
        map.setView([30.0668, 79.0193], 8);
        
        // Clear layer states and uncheck all checkboxes
        layerStates = {};
        document.querySelectorAll('.layer-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
    });
    
    if (workspaces.length === 0) {
        const noWorkspacesDiv = document.createElement('div');
        noWorkspacesDiv.innerHTML = '<p>No workspaces found.</p>';
        workspaceListContainer.appendChild(noWorkspacesDiv);
        return;
    }

    workspaces.forEach(workspaceName => {
        const workspaceItem = document.createElement('div');
        workspaceItem.className = 'workspace-item';
        workspaceItem.dataset.workspaceName = workspaceName;

        workspaceItem.innerHTML = `
            <div class="workspace-header">
                <span>${workspaceName}</span>
                <i class="fas fa-chevron-right toggle-icon"></i>
            </div>
        `;

        const workspaceHeader = workspaceItem.querySelector('.workspace-header');

        // Event listener for expanding/collapsing layer list
        workspaceHeader.addEventListener('click', async () => {
            const isExpanded = workspaceItem.classList.contains('expanded');
            
            // Collapse other open workspaces
            document.querySelectorAll('.workspace-item.expanded').forEach(item => {
                if (item !== workspaceItem) {
                    item.classList.remove('expanded');
                    const existingLayerList = item.querySelector('.layer-lists-container');
                    if (existingLayerList) existingLayerList.classList.remove('show');
                    item.querySelector('.toggle-icon').style.transform = 'rotate(0deg)';
                }
            });

            if (isExpanded) {
                workspaceItem.classList.remove('expanded');
                const existingLayerList = workspaceItem.querySelector('.layer-lists-container');
                if (existingLayerList) existingLayerList.classList.remove('show');
                workspaceItem.querySelector('.toggle-icon').style.transform = 'rotate(0deg)';
            } else {
                workspaceItem.classList.add('expanded');
                workspaceItem.querySelector('.toggle-icon').style.transform = 'rotate(90deg)';
                // Fetch and render layers if not already cached
                if (!cachedWorkspaceLayers[workspaceName]) {
                    await fetchAndRenderLayersForWorkspace(workspaceName, workspaceItem);
                } else {
                    renderLayers(workspaceItem.querySelector('.layer-lists-container'), 
                                 cachedWorkspaceLayers[workspaceName].raster_layers, 
                                 cachedWorkspaceLayers[workspaceName].vector_layers);
                    workspaceItem.querySelector('.layer-lists-container').classList.add('show');
                }
            }
        });

        workspaceListContainer.appendChild(workspaceItem);
    });
}

// Function to fetch and render layers for a specific workspace (updated container class)
async function fetchAndRenderLayersForWorkspace(workspaceName, workspaceItemElement) {
    let layerListElement = workspaceItemElement.querySelector('.layer-lists-container');
    if (!layerListElement) {
        layerListElement = document.createElement('div');
        layerListElement.className = 'layer-lists-container';
        workspaceItemElement.appendChild(layerListElement);
    }
    layerListElement.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading layers...</div>';
    layerListElement.classList.add('show');

    try {
        const response = await fetch(`${API_LAYERS_URL_PREFIX}${encodeURIComponent(workspaceName)}/layers`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        cachedWorkspaceLayers[workspaceName] = data; // Cache the fetched data

        renderLayers(layerListElement, data.raster_layers, data.vector_layers);
    } catch (error) {
        console.error(`Error fetching layers for ${workspaceName}:`, error);
        layerListElement.innerHTML = `<div class="error">Failed to load layers: ${error.message}</div>`;
        // Clear cached data if fetch failed
        delete cachedWorkspaceLayers[workspaceName];
    }
}

// Function to render layers with separate raster and vector sections
function renderLayers(layerListElement, rasterLayers, vectorLayers) {
    layerListElement.innerHTML = ''; // Clear previous content

    // Raster Layers Section
    const rasterSection = document.createElement('div');
    rasterSection.className = 'layer-section';
    rasterSection.innerHTML = `
        <div class="layer-section-header">
            <i class="fas fa-image"></i>
            <span>Raster Layers</span>
        </div>
        <ul class="layer-list raster-layers"></ul>
    `;
    
    const rasterList = rasterSection.querySelector('.layer-list');
    
    if (rasterLayers && rasterLayers.length > 0) {
        rasterLayers.forEach(layerName => {
            const workspaceName = layerListElement.closest('.workspace-item').dataset.workspaceName;
            const layerKey = `${workspaceName}:${layerName}`;
            
            const listItem = document.createElement('li');
            listItem.className = 'layer-list-item raster-layer-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `raster-${layerName}-${Date.now()}`;
            checkbox.className = 'layer-checkbox raster-layer-checkbox';
            checkbox.dataset.layerName = layerName;
            checkbox.dataset.layerType = 'raster';
            
            // Restore checkbox state
            checkbox.checked = layerStates[layerKey] || false;
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.innerHTML = `<i class="fas fa-image"></i> ${layerName}`;
            
            listItem.appendChild(checkbox);
            listItem.appendChild(label);
            rasterList.appendChild(listItem);
            
            checkbox.addEventListener('change', function() {
                const workspaceName = this.closest('.workspace-item').dataset.workspaceName;
                const layerKey = `${workspaceName}:${layerName}`;
                
                // Update state
                layerStates[layerKey] = this.checked;
                
                toggleRasterLayerInWorkspace(workspaceName, layerName, this.checked);
            });
            
            label.addEventListener('click', function(e) {
                e.preventDefault();
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            });
        });
    } else {
        rasterList.innerHTML = '<li class="no-layers">No raster layers found.</li>';
    }

    // Vector Layers Section
    const vectorSection = document.createElement('div');
    vectorSection.className = 'layer-section';
    vectorSection.innerHTML = `
        <div class="layer-section-header">
            <i class="fas fa-vector-square"></i>
            <span>Vector Layers</span>
        </div>
        <ul class="layer-list vector-layers"></ul>
    `;
    
    const vectorList = vectorSection.querySelector('.layer-list');
    
    if (vectorLayers && vectorLayers.length > 0) {
        vectorLayers.forEach(layerName => {
            const workspaceName = layerListElement.closest('.workspace-item').dataset.workspaceName;
            const layerKey = `${workspaceName}:${layerName}`;
            
            const listItem = document.createElement('li');
            listItem.className = 'layer-list-item vector-layer-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `vector-${layerName}-${Date.now()}`;
            checkbox.className = 'layer-checkbox vector-layer-checkbox';
            checkbox.dataset.layerName = layerName;
            checkbox.dataset.layerType = 'vector';
            
            // Restore checkbox state
            checkbox.checked = layerStates[layerKey] || false;
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.innerHTML = `<i class="fas fa-vector-square"></i> ${layerName}`;
            
            listItem.appendChild(checkbox);
            listItem.appendChild(label);
            vectorList.appendChild(listItem);
            
            checkbox.addEventListener('change', function() {
                const workspaceName = this.closest('.workspace-item').dataset.workspaceName;
                const layerKey = `${workspaceName}:${layerName}`;
                
                // Update state
                layerStates[layerKey] = this.checked;
                
                toggleVectorLayerInWorkspace(workspaceName, layerName, this.checked);
            });
            
            label.addEventListener('click', function(e) {
                e.preventDefault();
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            });
        });
    } else {
        vectorList.innerHTML = '<li class="no-layers">No vector layers found.</li>';
    }

    layerListElement.appendChild(rasterSection);
    layerListElement.appendChild(vectorSection);
}

// New function to handle raster layer toggling (Updated to keep OSM as base and fit bounds)
function toggleRasterLayerInWorkspace(workspaceName, layerName, isVisible) {
    const fullLayerName = `${workspaceName}:${layerName}`;
    console.log(`Toggling raster layer: ${fullLayerName}, visible: ${isVisible}`);
    
    if (isVisible) {
        // Add the raster layer as overlay (not replacing base layer)
        const wmsLayer = L.tileLayer.wms(`${GEOSERVER_WMS_BASE_URL}${workspaceName}/wms`, {
            layers: fullLayerName,
            format: 'image/png',
            transparent: true, // Changed to true to allow OSM to show through
            version: '1.1.1',
            attribution: `Imagery &copy; ${workspaceName}`,
            opacity: 0.8, // Added opacity for better blending
            maxZoom: 20,
            minZoom: 1,
            tileSize: 256,
            zIndex: 2 // Higher than base layer but lower than vector layers
        });
            
        wmsLayer._layerId = fullLayerName;
        wmsLayer._layerName = layerName;
        wmsLayer._workspaceName = workspaceName;
        wmsLayer._layerType = 'raster';
            
        // Add to overlay group instead of replacing base layer
        currentOverlayLayers.addLayer(wmsLayer);
            
        console.log(`Added raster layer ${fullLayerName} as overlay`);
        
        // Fit map to layer bounds
        fitMapToLayerBounds(fullLayerName);
            
        // Add legend card for raster layer
        addLegendCard(workspaceName, layerName, fullLayerName);
    } else {
        // Remove the raster layer from overlays
        let layerRemoved = false;
        currentOverlayLayers.eachLayer(layer => {
            if (layer._layerId === fullLayerName && layer._layerType === 'raster') {
                currentOverlayLayers.removeLayer(layer);
                layerRemoved = true;
                console.log(`Removed raster layer ${fullLayerName} from map`);
            }
        });
        
        if (!layerRemoved) {
            console.warn(`Raster layer ${fullLayerName} not found for removal`);
        }
        
        // Remove legend card
        removeLegendCard(fullLayerName);
    }
}

// Updated function to handle vector layer toggling with proper z-index
function toggleVectorLayerInWorkspace(workspaceName, layerName, isVisible) {
    const fullLayerName = `${workspaceName}:${layerName}`;
    console.log(`Toggling vector layer: ${fullLayerName}, visible: ${isVisible}`);
    
    if (isVisible) {
        // Add the layer to the map with click interaction
        const wmsLayer = L.tileLayer.wms(`${GEOSERVER_WMS_BASE_URL}${workspaceName}/wms`, {
            layers: fullLayerName,
            format: 'image/png',
            transparent: true,
            version: '1.1.1',
            attribution: `Vector Data &copy; ${workspaceName}`,
            opacity: 0.8,
            maxZoom: 20,
            minZoom: 1,
            tileSize: 256,
            zIndex: 3
        });
        
        wmsLayer._layerId = fullLayerName;
        wmsLayer._layerName = layerName;
        wmsLayer._workspaceName = workspaceName;
        wmsLayer._layerType = 'vector';
        
        // Add to overlay group
        currentOverlayLayers.addLayer(wmsLayer);
        
        console.log(`Added vector layer ${fullLayerName} to map`);
        
        // Add legend card
        addLegendCard(workspaceName, layerName, fullLayerName);
        
        // Add click event listener for GetFeatureInfo
        addVectorLayerClickHandler(workspaceName, layerName, fullLayerName);
        
    } else {
        // Remove the layer from the map
        let layerRemoved = false;
        currentOverlayLayers.eachLayer(layer => {
            if (layer._layerId === fullLayerName && layer._layerType === 'vector') {
                currentOverlayLayers.removeLayer(layer);
                layerRemoved = true;
                console.log(`Removed vector layer ${fullLayerName} from map`);
            }
        });
        
        if (!layerRemoved) {
            console.warn(`Vector layer ${fullLayerName} not found for removal`);
        }
        
        // Remove legend card
        removeLegendCard(fullLayerName);
        
        // Remove click handler
        removeVectorLayerClickHandler(fullLayerName);
    }
}

// Function to add legend card with GeoServer legend graphics
function addLegendCard(workspaceName, layerName, fullLayerName) {
    // Create legend container if it doesn't exist
    let legendContainer = document.getElementById('legend-container');
    if (!legendContainer) {
        legendContainer = document.createElement('div');
        legendContainer.id = 'legend-container';
        legendContainer.className = 'legend-container';
        document.body.appendChild(legendContainer);
    }

    // Create or get legend card
    let legendCard = document.getElementById('legend-card');
    if (!legendCard) {
        legendCard = document.createElement('div');
        legendCard.id = 'legend-card';
        legendCard.className = 'legend-card';
        legendCard.innerHTML = `
            <div class="legend-header">
                <h4>Legends</h4>
            </div>
            <div class="legend-content">
                <div id="legend-items" class="legend-items"></div>
            </div>
        `;
        legendContainer.appendChild(legendCard);
    }

    const legendItems = document.getElementById('legend-items');
    if (!legendItems) {
        console.error('Legend items container not found');
        return;
    }

    // Check if legend item already exists
    const existingItem = document.getElementById(`legend-item-${fullLayerName.replace(':', '-')}`);
    if (existingItem) {
        return; // Already exists
    }

    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.id = `legend-item-${fullLayerName.replace(':', '-')}`;

    // Generate GeoServer GetLegendGraphic URL
    const legendUrl = `${GEOSERVER_LEGEND_GRAPHIC_BASE_URL}${workspaceName}/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=${fullLayerName}&STYLE=`;
    
    legendItem.innerHTML = `
        <div class="legend-item-content">
            <div class="legend-graphic-container">
                <img src="${legendUrl}" 
                     alt="Legend for ${layerName}" 
                     class="legend-image"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="legend-error" style="display: none;">Legend not available</div>
            </div>
            <span class="legend-layer-name">${layerName}</span>
        </div>
    `;
    
    legendItems.appendChild(legendItem);
    
    console.log(`Added GeoServer legend for ${fullLayerName} with URL: ${legendUrl}`);
}

// Function to clear all legends
function clearAllLegends() {
    // Clear all overlay layers
    currentOverlayLayers.clearLayers();
    
    // Remove legend container
    const legendContainer = document.getElementById('legend-container');
    if (legendContainer) {
        legendContainer.remove();
    }
    
    // Uncheck all layer checkboxes
    document.querySelectorAll('.layer-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// Function to remove specific legend card
function removeLegendCard(fullLayerName) {
    const legendItem = document.getElementById(`legend-item-${fullLayerName.replace(':', '-')}`);
    if (legendItem) {
        legendItem.remove();
    }
    
    // If no more legend items, remove the entire legend card
    const legendItems = document.getElementById('legend-items');
    if (legendItems && legendItems.children.length === 0) {
        const legendContainer = document.getElementById('legend-container');
        if (legendContainer) {
            legendContainer.remove();
        }
    }
}


// --- UI Element Event Listeners ---
function setupUIEventListeners() {
    // Zoom Controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        map.zoomIn();
    });
    document.getElementById('zoom-out').addEventListener('click', () => {
        map.zoomOut();
    });

    // Locate Me
    document.getElementById('locate-me').addEventListener('click', () => {
        map.locate({setView: true, maxZoom: 16});
    });
    map.on('locationfound', (e) => {
        L.marker(e.latlng).addTo(map)
            .bindPopup("You are here!").openPopup();
        L.circle(e.latlng, e.accuracy).addTo(map);
    });
    map.on('locationerror', (e) => {
        alert(e.message);
    });

    // Search Functionality
    document.getElementById('search-button').addEventListener('click', performSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Language Switch
    const langEn = document.getElementById('lang-en');
    const langHi = document.getElementById('lang-hi');
    
    langEn.addEventListener('click', () => {
        setLanguage('en');
        langEn.classList.add('active');
        langHi.classList.remove('active');
    });
    
    langHi.addEventListener('click', () => {
        setLanguage('hi');
        langHi.classList.add('active');
        langEn.classList.remove('active');
    });
}

// Language translations
const translations = {
    en: {
        appTitle: "Drone Application & Research Center",
        subTitle: "Uttarakhand Space Application Center",
        geoserverProjects: "Projects",
        searchPlaceholder: "Search for Location",
        resetToOSM: "Reset to OpenStreetMap",
        open: "Open",
        noLayers: "No vector layers found.",
        legends: "Legends",
        legendNotAvailable: "Legend not available"
    },
    hi: {
        appTitle: "ड्रोन अनुप्रयोग और अनुसंधान केंद्र",
        subTitle: "उत्तराखंड अंतरिक्ष अनुप्रयोग केंद्र",
        geoserverProjects: "प्रोजेक्ट्स",
        searchPlaceholder: "स्थान खोजें",
        resetToOSM: "ओपनस्ट्रीटमैप पर वापस जाएं",
        open: "खोलें",
        noLayers: "कोई वेक्टर लेयर नहीं मिली।",
        legends: "प्रतीक चिन्ह",
        legendNotAvailable: "प्रतीक चिन्ह उपलब्ध नहीं है"
    }
};

// Function to set language
function setLanguage(lang) {
    // Update header
    document.querySelector('.title-container h1').textContent = translations[lang].appTitle;
    document.querySelector('.title-container h2').textContent = translations[lang].subTitle;
    
    // Update sidebar header
    document.querySelector('.sidebar-header h2').textContent = translations[lang].geoserverProjects;
    
    // Update search placeholder
    document.getElementById('search-input').placeholder = translations[lang].searchPlaceholder;
    
    // Update OSM reset button
    const osmResetBtn = document.querySelector('.osm-reset-btn');
    if (osmResetBtn) {
        osmResetBtn.innerHTML = `<i class="fas fa-globe"></i> ${translations[lang].resetToOSM}`;
    }
    
    // Update open buttons
    document.querySelectorAll('.open-workspace-btn').forEach(btn => {
        btn.textContent = translations[lang].open;
    });
    
    // Update no layers text
    document.querySelectorAll('.no-layers').forEach(el => {
        el.textContent = translations[lang].noLayers;
    });
    
    // Update legends header
    const legendsHeader = document.querySelector('.legends-card .legend-header h4');
    if (legendsHeader) {
        legendsHeader.textContent = translations[lang].legends;
    }
    
    // Update legend not available text
    document.querySelectorAll('.legend-error').forEach(el => {
        el.textContent = translations[lang].legendNotAvailable;
    });
}

async function performSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        // If no query, go to Uttarakhand state view
        map.setView([30.0668, 79.0193], 8);
        L.marker([30.0668, 79.0193]).addTo(map)
            .bindPopup("Uttarakhand, India").openPopup();
        return;
    }

    try {
        const response = await fetch(`/api/search_location?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (response.ok) {
            map.setView([data.lat, data.lon], 15);
            L.marker([data.lat, data.lon]).addTo(map)
                .bindPopup(data.display_name).openPopup();
        } else {
            alert(`Error searching: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Search API call failed:', error);
        alert('Failed to connect to search service.');
    }
}


// --- Initial calls on page load ---
document.addEventListener('DOMContentLoaded', initializeMap);

// Function to add interactive compass control with working map rotation
function addCompassControl() {
    const CompassControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'compass-control');
            container.innerHTML = `
                <div class="compass-container">
                    <div class="compass-needle" id="compass-needle">
                        <i class="fas fa-location-arrow"></i>
                    </div>
                    <div class="compass-label">N</div>
                    <div class="compass-reset" id="compass-reset" title="Reset North">
                        <i class="fas fa-undo"></i>
                    </div>
                </div>
            `;
            
            // Prevent map events on compass
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            
            // Add compass interaction
            this.setupCompassInteraction(container);
            
            return container;
        },
        
        setupCompassInteraction: function(container) {
            const needle = container.querySelector('#compass-needle');
            const resetBtn = container.querySelector('#compass-reset');
            let isDragging = false;
            let currentRotation = 0;
            
            // Function to rotate the map
            const rotateMap = (angle) => {
                const mapContainer = map.getContainer();
                mapContainer.style.transform = `rotate(${angle}deg)`;
                mapContainer.style.transformOrigin = 'center center';
                
                // Update all map controls to counter-rotate
                const controls = mapContainer.querySelectorAll('.leaflet-control');
                controls.forEach(control => {
                    if (!control.classList.contains('compass-control')) {
                        control.style.transform = `rotate(${-angle}deg)`;
                    }
                });
                
                // Counter-rotate popups
                const popups = mapContainer.querySelectorAll('.leaflet-popup');
                popups.forEach(popup => {
                    popup.style.transform = `rotate(${-angle}deg)`;
                });
            };
            
            // Mouse/touch events for needle rotation
            const startDrag = (e) => {
                e.preventDefault();
                isDragging = true;
                container.style.cursor = 'grabbing';
                document.addEventListener('mousemove', onDrag);
                document.addEventListener('mouseup', stopDrag);
                document.addEventListener('touchmove', onDrag, { passive: false });
                document.addEventListener('touchend', stopDrag);
            };
            
            const onDrag = (e) => {
                if (!isDragging) return;
                
                e.preventDefault();
                const rect = container.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                
                const deltaX = clientX - centerX;
                const deltaY = clientY - centerY;
                
                // Calculate angle in degrees
                let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                angle = (angle + 90) % 360; // Adjust for needle pointing up
                if (angle < 0) angle += 360;
                
                currentRotation = angle;
                
                // Update needle rotation
                needle.style.transform = `rotate(${angle - 45}deg)`; // -45 because default icon is rotated
                
                // Rotate the map
                rotateMap(-angle); // Negative because we want opposite rotation
            };
            
            const stopDrag = () => {
                isDragging = false;
                container.style.cursor = 'grab';
                document.removeEventListener('mousemove', onDrag);
                document.removeEventListener('mouseup', stopDrag);
                document.removeEventListener('touchmove', onDrag);
                document.removeEventListener('touchend', stopDrag);
            };
            
            // Reset compass to North
            const resetCompass = () => {
                currentRotation = 0;
                needle.style.transform = 'rotate(-45deg)';
                rotateMap(0);
            };
            
            // Event listeners
            needle.addEventListener('mousedown', startDrag);
            needle.addEventListener('touchstart', startDrag, { passive: false });
            resetBtn.addEventListener('click', resetCompass);
            
            // Set initial cursor
            container.style.cursor = 'grab';
        },
        
        onRemove: function(map) {
            // Clean up event listeners and reset map rotation
            const mapContainer = map.getContainer();
            mapContainer.style.transform = '';
            const controls = mapContainer.querySelectorAll('.leaflet-control');
            controls.forEach(control => {
                control.style.transform = '';
            });
        }
    });
    
    new CompassControl({ position: 'bottomleft' }).addTo(map);
}

// New function to fit map to layer bounds
async function fitMapToLayerBounds(fullLayerName) {
    try {
        console.log(`Fetching bounds for layer: ${fullLayerName}`);
        const bounds = await fetchLayerBounds(fullLayerName);
        
        if (bounds && bounds !== FALLBACK_BOUNDS) {
            // bounds format: [[min_lat, min_lon], [max_lat, max_lon]]
            console.log(`Received bounds for ${fullLayerName}:`, bounds);
            
            // Step 1: Extract coordinates from bounds
            const southWest = bounds[0]; // [min_lat, min_lon]
            const northEast = bounds[1]; // [max_lat, max_lon]
            
            // Step 2: Validate coordinates are in lat/lng range
            const minLat = southWest[0], minLon = southWest[1];
            const maxLat = northEast[0], maxLon = northEast[1];
            
            if (minLat < -90 || maxLat > 90 || minLon < -180 || maxLon > 180) {
                console.error(`Invalid lat/lng coordinates for ${fullLayerName}:`, bounds);
                console.error(`Lat range: ${minLat} to ${maxLat}, Lon range: ${minLon} to ${maxLon}`);
                return;
            }
            
            // Step 3: Calculate center point
            const centerLat = (minLat + maxLat) / 2;
            const centerLon = (minLon + maxLon) / 2;
            
            console.log(`Calculated center: [${centerLat}, ${centerLon}]`);
            
            // Step 4: Create Leaflet LatLngBounds object
            const leafletBounds = L.latLngBounds(southWest, northEast);
            
            // Step 5: Fit the map to these bounds with padding
            const paddingOptions = {
                padding: [50, 50], // 50px padding on all sides
                maxZoom: 18 // Maximum zoom level
            };
            
            map.fitBounds(leafletBounds, paddingOptions);
            console.log(`Map fitted to bounds for ${fullLayerName}`);
            
        } else {
            console.warn(`No valid bounds received for ${fullLayerName}, keeping current view`);
        }
    } catch (error) {
        console.error(`Error fitting map to bounds for ${fullLayerName}:`, error);
    }
}

// Function to add click handler for vector layers
function addVectorLayerClickHandler(workspaceName, layerName, fullLayerName) {
    // Store the click handler function so we can remove it later
    const clickHandler = async function(e) {
        // Check if this layer is currently visible
        const layerKey = `${workspaceName}:${layerName}`;
        if (!layerStates[layerKey]) {
            return; // Layer is not visible, don't handle clicks
        }
        
        const latlng = e.latlng;
        console.log(`Clicked on map at: ${latlng.lat}, ${latlng.lng} for layer ${fullLayerName}`);
        
        // Show loading popup first
        const loadingPopup = L.popup()
            .setLatLng(latlng)
            .setContent('<div class="popup-loading"><i class="fas fa-spinner fa-spin"></i> Loading feature info...</div>')
            .openOn(map);
        
        try {
            // Get feature info using WMS GetFeatureInfo
            const featureInfo = await getFeatureInfo(workspaceName, layerName, latlng);
            
            if (featureInfo && featureInfo.features && featureInfo.features.length > 0) {
                const feature = featureInfo.features[0];
                const popupContent = createFeaturePopupContent(feature.properties, layerName);
                
                // Update popup with feature info
                loadingPopup.setContent(popupContent);
            } else {
                loadingPopup.setContent('<div class="popup-no-data">No feature found at this location</div>');
            }
        } catch (error) {
            console.error('Error getting feature info:', error);
            loadingPopup.setContent('<div class="popup-error">Error loading feature information</div>');
        }
    };
    
    // Store the handler for later removal
    if (!window.vectorLayerClickHandlers) {
        window.vectorLayerClickHandlers = {};
    }
    window.vectorLayerClickHandlers[fullLayerName] = clickHandler;
    
    // Add click event to map
    map.on('click', clickHandler);
}

// Function to remove click handler for vector layers
function removeVectorLayerClickHandler(fullLayerName) {
    if (window.vectorLayerClickHandlers && window.vectorLayerClickHandlers[fullLayerName]) {
        map.off('click', window.vectorLayerClickHandlers[fullLayerName]);
        delete window.vectorLayerClickHandlers[fullLayerName];
        console.log(`Removed click handler for ${fullLayerName}`);
    }
}

// Simplified function to get feature info using only backend proxy
async function getFeatureInfo(workspaceName, layerName, latlng) {
    try {
        const point = map.latLngToContainerPoint(latlng);
        const size = map.getSize();
        const bounds = map.getBounds();
        
        const params = new URLSearchParams({
            bbox: `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
            width: size.x,
            height: size.y,
            x: Math.round(point.x),
            y: Math.round(point.y)
        });
        
        const url = `/api/geoserver/feature_info/${encodeURIComponent(workspaceName)}/${encodeURIComponent(layerName)}?${params}`;
        
        console.log('GetFeatureInfo URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Feature info response:', data);
        
        return data;
        
    } catch (error) {
        console.error('Error in getFeatureInfo:', error);
        throw error;
    }
}

// Updated function to create beautiful popup content
function createFeaturePopupContent(properties, layerName) {
    if (!properties || Object.keys(properties).length === 0) {
        return `
            <div class="feature-popup-card">
                <div class="popup-no-data">
                    <i class="fas fa-info-circle"></i>
                    No attribute data available
                </div>
            </div>
        `;
    }
    
    // Get the main title (Name field or layer name)
    const mainTitle = properties.Name || properties.name || properties.NAME || layerName;
    
    // Create a beautiful popup card
    let popupHTML = `
        <div class="feature-popup-card">
            <div class="popup-header">
                <h4 class="popup-title">
                    <i class="fas fa-map-marker-alt"></i>
                    ${mainTitle}
                </h4>
            </div>
            <div class="popup-content">
                <table class="feature-attributes-table">
    `;
    
    // Add key attributes first (Name, Area, ID)
    const priorityFields = ['Name', 'name', 'NAME', 'Area', 'area', 'AREA', 'ID', 'id', 'Id'];
    const addedFields = new Set();
    
    // Add priority fields first
    priorityFields.forEach(field => {
        if (properties.hasOwnProperty(field) && properties[field] !== null && properties[field] !== undefined && properties[field] !== '') {
            const value = properties[field];
            let displayValue;
            
            if (typeof value === 'number') {
                if (field.toLowerCase().includes('area')) {
                    displayValue = `${value.toLocaleString()} sq units`;
                } else {
                    displayValue = value.toLocaleString();
                }
            } else {
                displayValue = value;
            }
            
            popupHTML += `
                <tr class="priority-field">
                    <td class="field-name">${field}</td>
                    <td class="field-value">${displayValue}</td>
                </tr>
            `;
            addedFields.add(field);
        }
    });
    
    // Add remaining fields
    Object.entries(properties).forEach(([key, value]) => {
        if (!addedFields.has(key) && value !== null && value !== undefined && value !== '') {
            const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
            popupHTML += `
                <tr>
                    <td class="field-name">${key}</td>
                    <td class="field-value">${displayValue}</td>
                </tr>
            `;
        }
    });
    
    popupHTML += `
                </table>
            </div>
            <div class="popup-footer">
                <small class="layer-info">
                    <i class="fas fa-layer-group"></i>
                    ${layerName}
                </small>
            </div>
        </div>
    `;
    
    return popupHTML;
}

// Function to add compass control (simple, non-interactive)
function addCompassControl() {
    const CompassControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'compass-control');
            container.innerHTML = `
                <div class="compass-container">
                    <div class="compass-needle">
                        <i class="fas fa-location-arrow"></i>
                    </div>
                    <div class="compass-label">N</div>
                </div>
            `;
            
            // Prevent map events on compass
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            
            return container;
        }
    });
    
    new CompassControl({ position: 'bottomleft' }).addTo(map);
}

