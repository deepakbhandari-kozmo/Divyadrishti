// static/js/map.js

// --- Configuration ---
const GEOSERVER_WMS_BASE_URL = "http://172.16.0.145:9090/geoserver/";
const GEOSERVER_WFS_BASE_URL = "http://172.16.0.145:9090/geoserver/";
const GEOSERVER_LEGEND_GRAPHIC_BASE_URL = "http://172.16.0.145:9090/geoserver/";

const API_WORKSPACES_URL = "/api/geoserver/workspaces";
const API_LAYERS_URL_PREFIX = "/api/geoserver/workspaces/";
const API_LAYER_BOUNDS_URL_PREFIX = "/api/geoserver/layer_bounds/";

// Change this to a workspace that actually exists in your GeoServer
const PRIMARY_DEFAULT_WORKSPACE = "topp"; // Common default workspace, change to your actual workspace

const FALLBACK_BOUNDS = [[-90, -180], [90, 180]]; // World view

// --- Global Map Variables ---
let map;
let osmBaseLayer = null;
let currentBaseLayer = null;
let currentOverlayLayers = L.layerGroup();
let cachedWorkspaceLayers = {};
let layerStates = {};

// Base layer definitions
const baseLayers = {
    osm: {
        name: 'OpenStreetMap',
        layer: () => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 22
        })
    },
    'google-satellite': {
        name: 'Google Satellite',
        layer: () => L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            attribution: '&copy; Google',
            maxZoom: 22
        })
    },
    'google-hybrid': {
        name: 'Google Hybrid',
        layer: () => L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            attribution: '&copy; Google',
            maxZoom: 22
        })
    },
    'google-terrain': {
        name: 'Google Terrain',
        layer: () => L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
            attribution: '&copy; Google',
            maxZoom: 22
        })
    },
    'esri-satellite': {
        name: 'Esri Satellite',
        layer: () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 22
        })
    },
    'cartodb-light': {
        name: 'CartoDB Light',
        layer: () => L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 22
        })
    },
    'cartodb-dark': {
        name: 'CartoDB Dark',
        layer: () => L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 22
        })
    }
};

// Function to change base layer (updated to not affect overlays or location)
function changeBaseLayer(layerKey) {
    // Remove current base layer
    if (currentBaseLayer) {
        map.removeLayer(currentBaseLayer);
    }
    
    // Add new base layer
    const baseLayerConfig = baseLayers[layerKey];
    if (baseLayerConfig) {
        currentBaseLayer = baseLayerConfig.layer();
        currentBaseLayer.addTo(map);
        console.log(`Switched to base layer: ${baseLayerConfig.name}`);
    }
    
    // DO NOT clear overlays or change location
    // Keep current map view and overlay layers intact
}

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
        maxZoom: 22,
        minZoom: 2,
    });
    
    // 2. Add OpenStreetMap as default base layer
    osmBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 22
    }).addTo(map);
    
    // Set current base layer reference
    currentBaseLayer = osmBaseLayer;
    
    // Set initial view to Uttarakhand state (default location)
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

    // 4. Add Zoom Level and Scale Indicator
    const zoomScaleControl = L.control({position: 'bottomright'});
    zoomScaleControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'zoom-scale-info');
        div.style.cssText = `
            background: rgba(255, 255, 255, 0.95);
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #ddd;
            font-size: 11px;
            font-weight: 600;
            color: #333;
            box-shadow: 0 2px 12px rgba(0,0,0,0.15);
            min-width: 110px;
            text-align: center;
            margin-bottom: 10px;
            margin-right: 10px;
            backdrop-filter: blur(5px);
        `;
        div.innerHTML = `
            <div>Zoom: ${map.getZoom()}</div>
            <div>Scale: ${calculateMapScale(map.getZoom())}</div>
            <div id="meters-per-pixel" style="font-size: 9px; color: #666;"></div>
        `;
        return div;
    };
    zoomScaleControl.addTo(map);

    // Update zoom and scale info on zoom change and move events
    function updateZoomScaleInfo() {
        const zoomDiv = document.querySelector('.zoom-scale-info');
        if (zoomDiv) {
            const zoom = map.getZoom();
            const scale = calculateMapScale(zoom);
            const metersPerPixel = calculateMetersPerPixel(zoom);
            zoomDiv.innerHTML = `
                <div style="margin-bottom: 2px;">Zoom: ${zoom}</div>
                <div style="margin-bottom: 2px;">Scale: ${scale}</div>
                <div style="font-size: 9px; color: #666;">${metersPerPixel.toFixed(2)}m/px</div>
            `;
        }
    }

    map.on('zoomend', updateZoomScaleInfo);
    map.on('moveend', updateZoomScaleInfo);

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
            maxZoom: 22,
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

    // Setup search functionality
    setupProjectSearch();

    fetchAndRenderWorkspaces();
}

// Project search functionality
function setupProjectSearch() {
    const searchInput = document.getElementById('project-search');
    const searchClear = document.getElementById('search-clear');

    if (!searchInput || !searchClear) {
        console.warn('Search elements not found');
        return;
    }

    // Search input event listener
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim().toLowerCase();

        if (searchTerm.length > 0) {
            searchClear.style.display = 'block';
            filterProjects(searchTerm);
        } else {
            searchClear.style.display = 'none';
            clearProjectFilter();
        }
    });

    // Clear search button
    searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchClear.style.display = 'none';
        clearProjectFilter();
        searchInput.focus();
    });

    // Enter key to focus first visible project
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const firstVisibleProject = document.querySelector('.workspace-item:not(.hidden)');
            if (firstVisibleProject) {
                firstVisibleProject.querySelector('.workspace-header').click();
            }
        }
    });
}

// Filter projects based on search term
function filterProjects(searchTerm) {
    const workspaceItems = document.querySelectorAll('.workspace-item');
    let visibleCount = 0;

    workspaceItems.forEach(item => {
        const workspaceName = item.querySelector('.workspace-name');
        if (workspaceName) {
            const projectName = workspaceName.textContent.toLowerCase();
            const originalName = workspaceName.getAttribute('data-workspace-original');
            const originalNameLower = originalName ? originalName.toLowerCase() : '';

            // Check if search term matches either translated or original name
            const matches = projectName.includes(searchTerm) || originalNameLower.includes(searchTerm);

            if (matches) {
                item.classList.remove('hidden');
                item.classList.add('search-highlight');
                visibleCount++;
            } else {
                item.classList.add('hidden');
                item.classList.remove('search-highlight');
            }
        }
    });

    // Show/hide no results message
    showNoResultsMessage(visibleCount === 0, searchTerm);
}

// Clear project filter
function clearProjectFilter() {
    const workspaceItems = document.querySelectorAll('.workspace-item');
    workspaceItems.forEach(item => {
        item.classList.remove('hidden', 'search-highlight');
    });

    // Hide no results message
    hideNoResultsMessage();
}

// Show no results message
function showNoResultsMessage(show, searchTerm) {
    let noResultsDiv = document.getElementById('no-results-message');

    if (show) {
        if (!noResultsDiv) {
            noResultsDiv = document.createElement('div');
            noResultsDiv.id = 'no-results-message';
            noResultsDiv.className = 'no-results-message';
            workspaceListContainer.appendChild(noResultsDiv);
        }

        noResultsDiv.innerHTML = `
            <i class="fas fa-search"></i>
            <p>No projects found for "${searchTerm}"</p>
            <small>Try a different search term</small>
        `;
        noResultsDiv.style.display = 'block';
    } else {
        hideNoResultsMessage();
    }
}

// Hide no results message
function hideNoResultsMessage() {
    const noResultsDiv = document.getElementById('no-results-message');
    if (noResultsDiv) {
        noResultsDiv.style.display = 'none';
    }
}

// Setup base map selector
function setupBaseMapSelector() {
    const baseMapSelect = document.getElementById('base-map-select');
    if (baseMapSelect) {
        // Remove any existing event listeners
        const newBaseMapSelect = baseMapSelect.cloneNode(true);
        baseMapSelect.parentNode.replaceChild(newBaseMapSelect, baseMapSelect);

        // Add event listener for base map selection
        newBaseMapSelect.addEventListener('change', (e) => {
            changeBaseLayer(e.target.value);
        });

        // Apply translations
        if (window.i18n) {
            window.i18n.applyLanguage(window.i18n.currentLanguage);
        }
    }
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

    // Setup base map selector (now in HTML)
    setupBaseMapSelector();

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

        // Get translated workspace name
        const translatedName = getTranslatedLayerName(workspaceName);

        workspaceItem.innerHTML = `
            <div class="workspace-header">
                <span class="workspace-name" data-workspace-original="${workspaceName}">${translatedName}</span>
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

    // Apply translations to all newly created workspace items
    if (window.i18n) {
        setTimeout(() => {
            window.i18n.applyLanguage(window.i18n.currentLanguage);
        }, 100);
    }
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
        // Add the raster layer as overlay
        const wmsLayer = L.tileLayer.wms(`${GEOSERVER_WMS_BASE_URL}${workspaceName}/wms`, {
            layers: fullLayerName,
            format: 'image/png',
            transparent: true,
            version: '1.1.1',
            attribution: `Imagery &copy; ${workspaceName}`,
            opacity: 0.8, // Default opacity
            maxZoom: 22,
            minZoom: 1,
            tileSize: 256,
            zIndex: 2
        });
        
        wmsLayer._layerId = fullLayerName;
        wmsLayer._layerName = layerName;
        wmsLayer._workspaceName = workspaceName;
        wmsLayer._layerType = 'raster';
        
        // Add to overlay group
        currentOverlayLayers.addLayer(wmsLayer);
        
        console.log(`Added raster layer ${fullLayerName} to map`);
        
        // Add legend card with opacity control
        addLegendCard(workspaceName, layerName, fullLayerName);
        
        // Auto-zoom to layer bounds
        fitMapToLayerBounds(fullLayerName);
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
            opacity: 0.8, // Default opacity
            maxZoom: 22,
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
        
        // Add legend card with opacity control
        addLegendCard(workspaceName, layerName, fullLayerName);
        
        // Add click event listener for GetFeatureInfo
        addVectorLayerClickHandler(workspaceName, layerName, fullLayerName);
        
        // DO NOT auto-zoom for vector layers - keep current map view
    } else {
        // Remove the vector layer from overlays
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
    
    // Generate unique slider ID
    const sliderId = `opacity-slider-${fullLayerName.replace(':', '-')}`;
    const valueId = `opacity-value-${fullLayerName.replace(':', '-')}`;
    
    legendItem.innerHTML = `
        <div class="legend-item-content">
            <div class="legend-graphic-container">
                <img src="${legendUrl}"
                     alt="Legend for ${layerName}"
                     class="legend-image"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="legend-error" style="display: none;">Legend not available</div>
            </div>
            <div class="legend-item-header">
                <span class="legend-layer-name">${layerName}</span>
                <button class="legend-close-btn" data-layer-id="${fullLayerName}" title="Remove layer">
                    ×
                </button>
            </div>
        </div>
        <div class="opacity-control">
            <span class="opacity-label">Opacity:</span>
            <input type="range"
                   id="${sliderId}"
                   class="opacity-slider"
                   min="0"
                   max="100"
                   value="80"
                   data-layer-id="${fullLayerName}">
            <span id="${valueId}" class="opacity-value">80%</span>
        </div>
    `;
    
    legendItems.appendChild(legendItem);
    
    // Add event listener for opacity slider
    const opacitySlider = document.getElementById(sliderId);
    const opacityValue = document.getElementById(valueId);
    
    opacitySlider.addEventListener('input', function() {
        const opacity = this.value / 100; // Convert to 0-1 range
        const layerId = this.dataset.layerId;

        // Update display value
        opacityValue.textContent = `${this.value}%`;

        // Update layer opacity
        updateLayerOpacity(layerId, opacity);
    });

    // Add event listener for close button
    const closeBtn = legendItem.querySelector('.legend-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            const layerId = this.getAttribute('data-layer-id');
            removeLegendAndLayer(layerId);
        });
    }

    console.log(`Added GeoServer legend for ${fullLayerName} with opacity control`);
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

// Function to remove legend and disable layer in sidebar
function removeLegendAndLayer(fullLayerName) {
    console.log(`Removing legend and layer: ${fullLayerName}`);

    // Remove from map
    let layerRemoved = false;
    currentOverlayLayers.eachLayer(layer => {
        if (layer._layerId === fullLayerName) {
            currentOverlayLayers.removeLayer(layer);
            layerRemoved = true;
        }
    });

    if (layerRemoved) {
        console.log(`Removed layer ${fullLayerName} from map`);
    }

    // Remove legend
    removeLegendCard(fullLayerName);

    // Uncheck the corresponding checkbox in sidebar
    const layerKey = fullLayerName;
    layerStates[layerKey] = false;

    // Find and uncheck the checkbox
    const checkboxes = document.querySelectorAll('.layer-checkbox');
    checkboxes.forEach(checkbox => {
        const workspaceName = checkbox.closest('.workspace-item').dataset.workspaceName;
        const layerName = checkbox.dataset.layerName;
        const checkboxLayerKey = `${workspaceName}:${layerName}`;

        if (checkboxLayerKey === fullLayerName) {
            checkbox.checked = false;
            console.log(`Unchecked checkbox for ${fullLayerName}`);
        }
    });

    // Remove click handlers for vector layers
    if (window.vectorLayerClickHandlers && window.vectorLayerClickHandlers[fullLayerName]) {
        map.off('click', window.vectorLayerClickHandlers[fullLayerName]);
        delete window.vectorLayerClickHandlers[fullLayerName];
        console.log(`Removed click handler for ${fullLayerName}`);
    }
}

// Function to update layer opacity
function updateLayerOpacity(fullLayerName, opacity) {
    currentOverlayLayers.eachLayer(layer => {
        if (layer._layerId === fullLayerName) {
            layer.setOpacity(opacity);
            console.log(`Updated opacity for ${fullLayerName} to ${opacity}`);
        }
    });
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
        map.locate({setView: true, maxZoom: 18});
    });
    map.on('locationfound', (e) => {
        L.marker(e.latlng).addTo(map)
            .bindPopup("You are here!").openPopup();
        L.circle(e.latlng, e.accuracy).addTo(map);
    });
    map.on('locationerror', (e) => {
        alert(e.message);
    });

    // Export PDF
    document.getElementById('export-pdf').addEventListener('click', exportMapToPDF);

    // Search Functionality
    document.getElementById('search-button').addEventListener('click', performSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Language switching is now handled by i18n.js
}

// Language translations are now handled by i18n.js

// Function to get translated layer name
function getTranslatedLayerName(layerName) {
    if (!window.i18n) {
        return layerName; // Return original if i18n not available
    }

    // Map layer names to translation keys
    const layerKeyMap = {
        'Administrative_Boundries': 'administrativeBoundries',
        'Badrinath_2022': 'badrinath2022',
        'Chakrata': 'chakrata',
        'ITDA_Dehradun': 'itdaDehradun',
        'Joshimath_2023': 'joshimath2023',
        'Kochar_Colony_Dehradun_2023': 'kocharColonyDehradun2023',
        'Maldevta_2021': 'maldevta2021',
        'Malin_Basti_Dehradun_2024': 'malinBastiDehradun2024',
        'Malin_Basti_Rispana_Dehradun_2025': 'malinBastiRispanaDehradun2025',
        'Mining_2022': 'mining2022',
        'SIIDCUL': 'siidcul',
        'Sarkhet_2022_River_Map': 'sarkhet2022RiverMap',
        'Sesambara_Dumpyard': 'sesambaraDumpyard',
        'Stamp_and_Registration': 'stampAndRegistration',
        'Tapovan_Dam_Chamoli_2022': 'tapovanDamChamoli2022',
        'Village_Boundries': 'villageBoundries'
    };

    const translationKey = layerKeyMap[layerName];
    if (translationKey) {
        return window.i18n.t(translationKey);
    }

    return layerName; // Return original if no translation found
}

// Function to update all workspace names when language changes
function updateWorkspaceNames() {
    console.log('🔄 Updating workspace names...');
    const workspaceElements = document.querySelectorAll('.workspace-name');
    console.log('Found', workspaceElements.length, 'workspace elements');

    workspaceElements.forEach(element => {
        const originalName = element.getAttribute('data-workspace-original');
        if (originalName) {
            const translatedName = getTranslatedLayerName(originalName);
            console.log(`Translating: ${originalName} → ${translatedName}`);
            element.textContent = translatedName;
        }
    });
}

async function performSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        // If no query, go to Uttarakhand state view (default location)
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
                maxZoom: 20 // Maximum zoom level for fitting bounds
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

// PDF Export functionality
async function exportMapToPDF() {
    const exportBtn = document.getElementById('export-pdf');
    const originalContent = exportBtn.innerHTML;
    
    try {
        // Show loading state
        exportBtn.disabled = true;
        exportBtn.classList.add('pdf-loading');
        exportBtn.innerHTML = '';
        
        // Get current map data
        const mapData = await captureMapData();
        
        // Send to backend for PDF generation
        const response = await fetch('/api/export_pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mapData)
        });
        
        if (response.ok) {
            // Download the PDF
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `map_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            throw new Error('Failed to generate PDF');
        }
        
    } catch (error) {
        console.error('PDF export failed:', error);
        alert('Failed to export PDF. Please try again.');
    } finally {
        // Restore button state
        exportBtn.disabled = false;
        exportBtn.classList.remove('pdf-loading');
        exportBtn.innerHTML = originalContent;
    }
}

// Capture current map data for PDF export
async function captureMapData() {
    const bounds = map.getBounds();
    const center = map.getCenter();
    const zoom = map.getZoom();
    
    // Get active layers
    const activeLayers = [];
    currentOverlayLayers.eachLayer(layer => {
        if (layer._layerId) {
            activeLayers.push({
                id: layer._layerId,
                name: layer._layerName,
                workspace: layer._workspaceName,
                type: layer._layerType,
                opacity: layer.options.opacity
            });
        }
    });
    
    // Get current address using reverse geocoding
    let address = 'Location information not available';
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}&zoom=10&addressdetails=1`);
        const data = await response.json();
        if (data && data.display_name) {
            address = data.display_name;
        }
    } catch (error) {
        console.error('Failed to get address:', error);
    }
    
    // Calculate scale (approximate)
    const scale = calculateMapScale(zoom);
    
    return {
        bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        },
        center: {
            lat: center.lat,
            lng: center.lng
        },
        zoom: zoom,
        scale: scale,
        address: address,
        activeLayers: activeLayers,
        timestamp: new Date().toISOString()
    };
}

// Calculate approximate map scale
function calculateMapScale(zoom) {
    // Approximate scale calculation for web mercator projection
    const earthCircumference = 40075016.686; // meters
    const mapWidth = map.getSize().x; // pixels
    const metersPerPixel = earthCircumference * Math.cos(map.getCenter().lat * Math.PI / 180) / Math.pow(2, zoom + 8);
    const scale = metersPerPixel * 96 / 0.0254; // Convert to scale (assuming 96 DPI)

    // Round to nice numbers with better precision for high zoom levels
    if (scale > 1000000) {
        return `1:${Math.round(scale / 100000) * 100000}`;
    } else if (scale > 100000) {
        return `1:${Math.round(scale / 10000) * 10000}`;
    } else if (scale > 10000) {
        return `1:${Math.round(scale / 1000) * 1000}`;
    } else if (scale > 1000) {
        return `1:${Math.round(scale / 100) * 100}`;
    } else if (scale > 100) {
        return `1:${Math.round(scale / 10) * 10}`;
    } else {
        return `1:${Math.round(scale)}`;
    }
}

// Calculate meters per pixel for current zoom level
function calculateMetersPerPixel(zoom) {
    const earthCircumference = 40075016.686; // meters
    const lat = map.getCenter().lat;
    return earthCircumference * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom + 8);
}


