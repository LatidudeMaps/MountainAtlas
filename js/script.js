// Global variables
let map, mountainAreasLayer, markers, mountainAreasData, filteredMountainAreas = [];
let baseMaps = {};
let initialBounds;
let allOsmPeaks, filteredOsmPeaks;
let mountainAreasLoaded = false;
let osmPeaksLoaded = false;

// Map initialization
const initMap = () => {
    console.log('Initializing map...');
    const map = L.map('map', {
        zoomAnimation: true,
        preferCanvas: true,
    });

    baseMaps = {
        "Dark Positron": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            detectRetina: true,
            tileSize: 256,
            updateWhenZooming: false,
            keepBuffer: 4,
        }),
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }),
        "Esri World Imagery": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        })
    };

    baseMaps["Dark Positron"].addTo(map);

    // Add custom reset view button
    const resetViewControl = L.Control.extend({
        options: {
            position: 'topleft'
        },
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const button = L.DomUtil.create('a', '', container);
            button.innerHTML = '&#8634;';  // Reset icon (circular arrow)
            button.href = '#';
            button.title = 'Reset View';
            button.style.fontSize = '22px';  // Increase icon size
            button.style.lineHeight = '30px';  // Center the icon vertically
            
            L.DomEvent.on(button, 'click', function (e) {
                L.DomEvent.preventDefault(e);
                if (initialBounds) {
                    map.fitBounds(initialBounds);
                }
            });

            return container;
        }
    });

    map.addControl(new resetViewControl());

    console.log('Map initialized');
    return map;
};

// Layer initialization
const initLayers = (map) => {
    console.log('Initializing layers...');
    const markers = L.markerClusterGroup({
        spiderfyOnMaxZoom: false,
        disableClusteringAtZoom: 18,
        zoomToBoundsOnClick: true,
        showCoverageOnHover: false,
        chunkedLoading: true,
        chunkInterval: 200,
        chunkDelay: 50
    }).addTo(map);

    const mountainAreasLayer = L.geoJSON(null, {
        style: defaultPolygonStyle,
        onEachFeature: (feature, layer) => {
            layer.bindPopup(feature.properties.MapName);
        }
    }).addTo(map);

    console.log('Layers initialized');
    return { markers, mountainAreasLayer };
};

// UI Controls
const addControls = (map, baseMaps, overlayMaps) => {
    console.log('Adding controls...');
    
    const layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false });
    layerControl.addTo(map);
    
    const filterControl = L.control({ position: 'topright' });
    filterControl.onAdd = () => {
        const div = L.DomUtil.create('div', 'filter-control');
        div.innerHTML = `
            <div class="control-group">
                <label for="hier-lvl-slider">GMBA Hierarchy Level: <span id="hier-lvl-value"></span></label>
                <input type="range" id="hier-lvl-slider" class="custom-slider">
            </div>
            <div class="control-group">
                <label for="search-input">Search by GMBA MapName:</label>
                <div class="input-button-group">
                    <div class="custom-search">
                        <input type="text" id="search-input" class="custom-select" placeholder="Search...">
                        <div class="select-arrow"></div>
                        <div id="search-suggestions" class="search-suggestions"></div>
                    </div>
                    <button id="clear-search" class="custom-button">Clear</button>
                </div>
            </div>
        `;
        return div;
    };
    filterControl.addTo(map);

    console.log('Controls added');
    return { layerControl, filterControl };
};

// Event Handlers
const addEventListeners = (map, mountainAreasLayer) => {
    console.log('Adding event listeners...');
    map.on('load', () => {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    });

    map.on('load', () => {
        const initialBounds = map.getBounds();
        map.setMaxBounds(initialBounds);
        map.setMinZoom(map.getZoom());
    });

    const hierLvlSlider = document.getElementById('hier-lvl-slider');
    const hierLvlValue = document.getElementById('hier-lvl-value');
    
    hierLvlSlider.addEventListener('input', function() {
        hierLvlValue.textContent = this.value;
    });

    hierLvlSlider.addEventListener('change', function() {
        handleFilterChange(this.value);
    });

    // Prevent map dragging when interacting with the slider
    hierLvlSlider.addEventListener('mousedown', function(e) {
        map.dragging.disable();
        document.addEventListener('mouseup', enableMapDragging);
        document.addEventListener('mouseleave', enableMapDragging);
    });

    function enableMapDragging() {
        map.dragging.enable();
        document.removeEventListener('mouseup', enableMapDragging);
        document.removeEventListener('mouseleave', enableMapDragging);
    }

    const searchInput = document.getElementById('search-input');
    const searchSuggestions = document.getElementById('search-suggestions');
    const selectArrow = document.querySelector('.select-arrow');

    const toggleSuggestions = (show) => {
        if (show) {
            updateSearchSuggestions(true);
            searchSuggestions.style.display = 'block';
        } else {
            searchSuggestions.style.display = 'none';
        }
    };

    searchInput.addEventListener('focus', () => toggleSuggestions(true));

    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSuggestions(true);
    });

    selectArrow.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleSuggestions(searchSuggestions.style.display === 'none');
        if (searchSuggestions.style.display === 'none') {
            searchInput.focus();
        }
    });

    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim() !== '') {
            updateSearchSuggestions(false);
            searchSuggestions.style.display = 'block';
        } else {
            searchSuggestions.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target) && !selectArrow.contains(e.target)) {
            toggleSuggestions(false);
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' && searchSuggestions.style.display !== 'none') {
            e.preventDefault();
            const firstItem = searchSuggestions.querySelector('li');
            if (firstItem) firstItem.focus();
        }
    });

    document.getElementById('search-input').addEventListener('change', handleSearch);
    document.getElementById('clear-search').addEventListener('click', clearSearch);
    
    // Prevent map zoom when scrolling the suggestions
    document.getElementById('search-suggestions').addEventListener('wheel', (e) => e.stopPropagation());

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-search')) {
            searchSuggestions.style.display = 'none';
        }
    });
};

// Utility Functions
const addOpacitySlider = (layerControl) => {
    console.log('Attempting to add opacity slider...');
    console.log('Layer control:', layerControl);

    if (!layerControl) {
        console.error('Layer control is not available');
        return;
    }

    if (!layerControl._overlaysList) {
        console.error('Overlay list is not available in the layer control');
        return;
    }

    const layerInputs = layerControl._overlaysList.querySelectorAll('input[type="checkbox"]');
    console.log(`Found ${layerInputs.length} layer inputs`);

    let mountainAreasItem;

    for (let input of layerInputs) {
        console.log(`Checking input:`, input);
        console.log(`Next sibling:`, input.nextElementSibling);
        if (input.nextElementSibling) {
            console.log(`Input text content: "${input.nextElementSibling.textContent}"`);
        }
        if (input.nextElementSibling && input.nextElementSibling.textContent.trim() === "Mountain Areas") {
            mountainAreasItem = input.parentNode;
            console.log('Mountain Areas layer found:', mountainAreasItem);
            break;
        }
    }

    if (mountainAreasItem) {
        console.log('Adding slider to Mountain Areas item');
        const sliderContainer = L.DomUtil.create('div', 'opacity-slider-container', mountainAreasItem);
        console.log('Slider container created:', sliderContainer);
        sliderContainer.innerHTML = `
            <input type="range" class="opacity-slider" min="0" max="1" step="0.1" value="0.65">
            <span class="opacity-value">65%</span>
        `;
        
        const slider = sliderContainer.getElementsByClassName('opacity-slider')[0];
        const opacityValue = sliderContainer.getElementsByClassName('opacity-value')[0];
        
        L.DomEvent.on(slider, 'input', function(e) {
            const opacity = parseFloat(e.target.value);
            setMountainAreasOpacity(opacity);
            opacityValue.textContent = Math.round(opacity * 100) + '%';
        });
        
        L.DomEvent.on(slider, 'click', L.DomEvent.stopPropagation);
        console.log('Opacity slider added successfully');
    } else {
        console.error("Mountain Areas layer not found in the layer control");
    }
};

// Function to set the opacity of the mountain areas layer
const setMountainAreasOpacity = (opacity) => {
    console.log(`Setting mountain areas opacity to ${opacity}`);
    mountainAreasLayer.setStyle({ fillOpacity: opacity });
};

const fitMapToBounds = (map, mountainAreasLayer, markers) => {
    console.log('Fitting map to bounds...');
    const bounds = L.latLngBounds([]);
    if (mountainAreasLayer.getLayers().length > 0) bounds.extend(mountainAreasLayer.getBounds());
    if (markers.getLayers().length > 0) bounds.extend(markers.getBounds());
    if (bounds.isValid()) {
        map.fitBounds(bounds);
        // Store the initial bounds
        initialBounds = bounds;
    }
    console.log('Map fitted to bounds');
};

const updateSearchSuggestions = (showAll = false) => {
    const searchInput = document.getElementById('search-input');
    const searchSuggestions = document.getElementById('search-suggestions');
    const searchValue = searchInput.value.trim().toLowerCase();

    searchSuggestions.innerHTML = '';

    // Add this check to prevent showing suggestions at startup
    if (!showAll && searchValue.length === 0) {
        searchSuggestions.style.display = 'none';
        return;
    }

    let matchingNames;
    if (showAll || searchValue.length > 0) {
        matchingNames = filteredMountainAreas
            .map(feature => feature.properties.MapName)
            .filter(name => showAll || name.toLowerCase().includes(searchValue));

        if (matchingNames.length > 0) {
            matchingNames.sort((a, b) => a.localeCompare(b));

            const ul = document.createElement('ul');
            ul.className = 'suggestions-list';
            
            matchingNames.forEach((name, index) => {
                const li = document.createElement('li');
                li.textContent = name;
                li.setAttribute('tabindex', '0');
                li.addEventListener('click', () => selectSuggestion(name));
                li.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') selectSuggestion(name);
                    if (e.key === 'ArrowDown') moveFocus(1, index, ul);
                    if (e.key === 'ArrowUp') moveFocus(-1, index, ul);
                });
                ul.appendChild(li);
            });

            searchSuggestions.appendChild(ul);
            searchSuggestions.style.display = 'block';
        } else {
            searchSuggestions.style.display = 'none';
        }
    } else {
        searchSuggestions.style.display = 'none';
    }
};

const selectSuggestion = (name) => {
    document.getElementById('search-input').value = name;
    document.getElementById('search-suggestions').style.display = 'none';
    handleSearch();
};

const moveFocus = (direction, currentIndex, ul) => {
    const items = ul.getElementsByTagName('li');
    const nextIndex = (currentIndex + direction + items.length) % items.length;
    items[nextIndex].focus();
};

const handleSearch = () => {
    console.log('Handling search...');
    const searchValue = document.getElementById('search-input').value.trim().toLowerCase();

    // Reset all polygons to default style with increased transparency
    mountainAreasLayer.eachLayer(layer => {
        layer.setStyle({
            color: "#ff7800",
            weight: 2,
            opacity: 0.7,
            fillColor: "#ffcc66",
            fillOpacity: 0.3  // More transparent
        });
    });

    if (searchValue) {
        const matchingLayers = [];
        let matchingMapName = '';
        mountainAreasLayer.eachLayer(layer => {
            if (layer.feature?.properties?.MapName.trim().toLowerCase().includes(searchValue)) {
                matchingLayers.push(layer);
                matchingMapName = layer.feature.properties.MapName;
            }
        });

        if (matchingLayers.length > 0) {
            matchingLayers.forEach(layer => {
                layer.setStyle({
                    color: 'yellow',
                    weight: 4,
                    opacity: 1,
                    fillOpacity: 0.65  // Normal opacity for the matching polygon
                });
            });

            // Get the bounds of the matching layer
            const bounds = matchingLayers[0].getBounds();
            
            // Calculate the center of the bounds
            const center = bounds.getCenter();
            
            // Calculate appropriate zoom level
            const zoom = map.getBoundsZoom(bounds);

            // Use flyTo for smooth animation
            map.flyTo(center, zoom, {
                duration: 1.5,  // Animation duration in seconds
                easeLinearity: 0.25
            });

            // Filter and display matching OSM peaks
            filterAndDisplayPeaks(null, matchingMapName);
        } else {
            alert('No matching polygons found.');
        }
    } else {
        // If search is empty, reset styles without changing the view
        resetLayerStyles();
    }
    console.log('Search handled');
};

const handleFilterChange = (selectedValue) => {
    console.log('Handling filter change...');
    if (!mountainAreasLoaded || !osmPeaksLoaded) return;

    mountainAreasLayer.clearLayers();
    filteredMountainAreas = mountainAreasData.features.filter(feature => 
        String(feature.properties.Hier_lvl).trim() === selectedValue
    );
    
    mountainAreasLayer.addData({
        type: "FeatureCollection",
        features: filteredMountainAreas
    });

    // Filter OSM peaks
    filterAndDisplayPeaks(selectedValue);

    document.getElementById('search-input').value = '';
    document.getElementById('search-suggestions').style.display = 'none';
    
    console.log('Filter change handled');
};

const applyCurrentFilter = () => {
    const hierLvlSlider = document.getElementById('hier-lvl-slider');
    if (hierLvlSlider) {
        handleFilterChange(hierLvlSlider.value);
    } else {
        console.warn('Hierarchy level slider not found. Unable to apply filter.');
    }
};

const defaultPolygonStyle = () => ({
    color: "#ff7800",
    weight: 2,
    opacity: 1,
    fillColor: "#ffcc66",
    fillOpacity: 0.65
});

const resetLayerStyles = () => {
    // Reset all polygons to default style
    mountainAreasLayer.eachLayer(layer => {
        layer.setStyle(defaultPolygonStyle());
    });

    // Reset OSM peaks to show all for the current hierarchy level
    const hierLvlSlider = document.getElementById('hier-lvl-slider');
    if (hierLvlSlider) {
        const currentHierLevel = hierLvlSlider.value;
        filterAndDisplayPeaks(currentHierLevel);
    } else {
        console.warn('Hierarchy level slider not found. Unable to reset OSM peaks.');
        // Optionally, you could show all peaks or use a default value here
        // For example: filterAndDisplayPeaks("all");
    }
};

const clearSearch = () => {
    console.log('Clearing search...');
    document.getElementById('search-input').value = '';
    resetLayerStyles();
    console.log('Search cleared');
};

const createSidebar = () => {
    const sidebar = L.DomUtil.create('div', 'sidebar');
    sidebar.innerHTML = `
        <div class="sidebar-toggle">&#9776;</div>
        <div class="sidebar-content">
            <div id="layer-control"></div>
            <div id="filter-control"></div>
        </div>
    `;
    document.body.appendChild(sidebar);

    // Move existing controls into the sidebar
    const layerControl = document.querySelector('.leaflet-control-layers');
    const filterControl = document.querySelector('.filter-control');
    
    if (layerControl) document.getElementById('layer-control').appendChild(layerControl);
    if (filterControl) document.getElementById('filter-control').appendChild(filterControl);
};

const initSidebarToggle = () => {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.querySelector('.sidebar-toggle');

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
};

// Data Loading
const loadMountainAreas = async () => {
    console.log('Loading mountain areas...');
    try {
        const response = await fetch("https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/MountainAreas.geojson");
        mountainAreasData = await response.json();

        const uniqueHierLvls = [...new Set(mountainAreasData.features.map(feature => feature.properties?.Hier_lvl))].sort((a, b) => a - b);
        const hierLvlSlider = document.getElementById('hier-lvl-slider');
        const hierLvlValue = document.getElementById('hier-lvl-value');
        
        hierLvlSlider.min = Math.min(...uniqueHierLvls);
        hierLvlSlider.max = Math.max(...uniqueHierLvls);
        hierLvlSlider.step = 1;
        hierLvlSlider.value = 4;  // Set default value
        hierLvlValue.textContent = hierLvlSlider.value;

        mountainAreasLoaded = true;
        
        if (osmPeaksLoaded) {
            handleFilterChange("4");
        }

        console.log('Mountain areas loaded');
    } catch (error) {
        console.error('Error loading Mountain Areas:', error);
    }
};

const loadOsmPeaks = async () => {
    console.log('Loading OSM peaks...');
    try {
        const response = await fetch("https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/OSM_peaks_GMBA.geojson");
        const osmPeaksData = await response.json();
        allOsmPeaks = osmPeaksData.features;
        osmPeaksLoaded = true;
        
        if (mountainAreasLoaded) {
            const hierLvlSlider = document.getElementById('hier-lvl-slider');
            if (hierLvlSlider) {
                applyCurrentFilter();
            } else {
                console.warn('Hierarchy level slider not found. Skipping initial filter application.');
            }
        }
        
        console.log('OSM peaks loaded');
    } catch (error) {
        console.error('Error loading OSM Peaks:', error);
    }
};

const filterAndDisplayPeaks = (hierLvl, mapName = null) => {
    if (!osmPeaksLoaded) return;

    markers.clearLayers();
    let filteredPeaks;

    if (mapName) {
        filteredPeaks = allOsmPeaks.filter(feature => 
            feature.properties.MapName.trim().toLowerCase() === mapName.toLowerCase()
        );
    } else {
        filteredPeaks = hierLvl === "all" 
            ? allOsmPeaks.filter(feature => feature.properties.Hier_lvl === "4")
            : allOsmPeaks.filter(feature => String(feature.properties.Hier_lvl).trim() === hierLvl);
    }

    L.geoJSON(filteredPeaks, {
        pointToLayer: (feature, latlng) => {
            const marker = L.marker(latlng);
            const name = feature.properties.name || "Unnamed Peak";
            const elevation = feature.properties.elevation || "Unknown";
            const popupContent = `<b>Name:</b> ${name}<br><b>Elevation:</b> ${elevation} m<br><b>MapName:</b> ${feature.properties.MapName}`;

            marker.bindPopup(popupContent)
                .bindTooltip(name, {
                    permanent: true,
                    direction: 'top',
                    offset: [-15, -3],
                    className: 'dark-tooltip'
                })
                .on('click', () => marker.openPopup())
                .on('popupopen', () => marker.closeTooltip())
                .on('popupclose', () => marker.openTooltip());

            return marker;
        }
    }).addTo(markers);
};

// Map initialization
const initializeMap = async () => {
    console.log('Initializing map...');
    map = initMap();
    console.log('Map initialized:', map);

    const layers = initLayers(map);
    mountainAreasLayer = layers.mountainAreasLayer;
    markers = layers.markers;
    console.log('Layers initialized:', layers);

    const overlayMaps = {
        "Mountain Areas": mountainAreasLayer,
        "OSM Peaks": markers
    };
    console.log('Overlay maps:', overlayMaps);

    const controls = addControls(map, baseMaps, overlayMaps);
    console.log('Controls added:', controls);

    addEventListeners(map, mountainAreasLayer);

    console.log('Loading data...');
    await Promise.all([loadMountainAreas(), loadOsmPeaks()]);
    console.log('Data loaded');
    
    console.log('Applying initial filter...');
    handleFilterChange("4");
    
    // Add createSidebar() call here
    createSidebar();
    
    // Initialize sidebar toggle
    initSidebarToggle();
    
    // Ensure search suggestions are hidden at startup
    document.getElementById('search-suggestions').style.display = 'none';
    
    // Add a small delay before adding the opacity slider
    setTimeout(() => {
        console.log('Adding opacity slider...');
        if (controls && controls.layerControl) {
            addOpacitySlider(controls.layerControl);
        } else {
            console.error('Layer control not available for adding opacity slider');
        }
    }, 100);
    
    fitMapToBounds(map, mountainAreasLayer, markers);
    
    console.log('Map initialization complete');
};

// Call the initialization function when the DOM is ready
document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM fully loaded and parsed');
    initializeMap();
});