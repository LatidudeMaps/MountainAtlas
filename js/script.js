// Global variables
let map, mountainAreasLayer, markers, mountainAreasData, filteredMountainAreas = [];
let baseMaps = {};
let initialBounds;
let isMobileView = window.innerWidth <= 768;

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

    // Add persistent toggle button
    const filterToggle = L.control({position: 'topright'});
    filterToggle.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control filter-toggle');
        div.innerHTML = '<a href="#" title="Toggle Filters" role="button" aria-label="Toggle filters">☰</a>';
        div.style.display = isMobileView ? 'block' : 'none';
        div.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const filterControl = document.querySelector('.filter-control');
            filterControl.style.display = filterControl.style.display === 'none' ? 'block' : 'none';
            return false;
        };
        return div;
    };
    filterToggle.addTo(map);

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
    L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);
    
    const filterControl = L.control({ position: 'topright' });
    filterControl.onAdd = () => {
        const div = L.DomUtil.create('div', 'filter-control');
        div.innerHTML = `
            <div class="control-group">
                <label for="hier-lvl-select">Choose GMBA Hierarchy Level:</label>
                <div class="input-button-group">
                    <select id="hier-lvl-select" class="custom-select"></select>
                    <button id="show-all-btn" class="custom-button">Show All</button>
                </div>
            </div>
            <div class="control-group">
                <label for="search-input">Search by GMBA MapName:</label>
                <div class="input-button-group">
                    <div class="custom-search">
                        <input type="text" id="search-input" class="custom-select" placeholder="Search...">
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

    document.getElementById('show-all-btn').addEventListener('click', () => handleFilterChange("all"));
    document.getElementById('search-input').addEventListener('input', updateSearchSuggestions);
    document.getElementById('search-input').addEventListener('focus', () => {
        if (document.getElementById('search-input').value.trim() === '') {
            updateSearchSuggestions(true);
        }
    });
    document.getElementById('search-input').addEventListener('change', handleSearch);
    document.getElementById('clear-search').addEventListener('click', clearSearch);
    
    // Prevent map zoom when scrolling the suggestions
    document.getElementById('search-suggestions').addEventListener('wheel', (e) => e.stopPropagation());

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-search')) {
            document.getElementById('search-suggestions').style.display = 'none';
        }
    });
    console.log('Event listeners added');
};

// Utility Functions
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

    if (searchValue.length === 0 && !showAll) {
        searchSuggestions.style.display = 'none';
        return;
    }

    const matchingNames = filteredMountainAreas
        .map(feature => feature.properties.MapName)
        .filter(name => showAll || name.toLowerCase().includes(searchValue));

    if (matchingNames.length > 0) {
        matchingNames.forEach(name => {
            const suggestion = document.createElement('div');
            suggestion.textContent = name;
            suggestion.classList.add('search-suggestion');
            suggestion.addEventListener('click', () => {
                searchInput.value = name;
                searchSuggestions.style.display = 'none';
                handleSearch();
            });
            searchSuggestions.appendChild(suggestion);
        });
        searchSuggestions.style.display = 'block';
    } else {
        searchSuggestions.style.display = 'none';
    }
};

const handleSearch = () => {
    console.log('Handling search...');
    const searchValue = document.getElementById('search-input').value.trim().toLowerCase();
    mountainAreasLayer.eachLayer(layer => mountainAreasLayer.resetStyle(layer));

    if (searchValue) {
        const matchingLayers = [];
        mountainAreasLayer.eachLayer(layer => {
            if (layer.feature?.properties?.MapName.trim().toLowerCase().includes(searchValue)) {
                matchingLayers.push(layer);
            }
        });

        if (matchingLayers.length > 0) {
            const bounds = L.latLngBounds([]);
            matchingLayers.forEach(layer => {
                layer.setStyle({ color: 'yellow', weight: 4 });
                bounds.extend(layer.getBounds());
            });
            map.fitBounds(bounds);
        } else {
            alert('No matching polygons found.');
        }
    }
    console.log('Search handled');
};

const clearSearch = () => {
    console.log('Clearing search...');
    document.getElementById('search-input').value = '';
    mountainAreasLayer.eachLayer(layer => mountainAreasLayer.resetStyle(layer));
    console.log('Search cleared');
};

const handleFilterChange = (selectedValue) => {
    console.log('Handling filter change...');
    mountainAreasLayer.clearLayers();
    filteredMountainAreas = selectedValue === "all" 
        ? mountainAreasData.features 
        : mountainAreasData.features.filter(feature => String(feature.properties.Hier_lvl).trim() === selectedValue);
    
    mountainAreasLayer.addData({
        type: "FeatureCollection",
        features: filteredMountainAreas
    });

    document.getElementById('search-input').value = '';
    document.getElementById('search-suggestions').style.display = 'none';
    console.log('Filter change handled');
};

const defaultPolygonStyle = () => ({
    color: "#ff7800",
    weight: 2,
    opacity: 1,
    fillColor: "#ffcc66",
    fillOpacity: 0.65
});

function preventZoom() {
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

function optimizeForMobile() {
    const newIsMobileView = window.innerWidth <= 768;
    if (newIsMobileView !== isMobileView) {
        isMobileView = newIsMobileView;
        const filterControl = document.querySelector('.filter-control');
        const filterToggle = document.querySelector('.filter-toggle');
        
        if (isMobileView) {
            // Mobile optimizations
            map.options.zoomAnimation = false;
            map.setMaxZoom(16);

            // Simplify vector layers
            map.eachLayer(function(layer) {
                if (layer instanceof L.Polyline) {
                    layer.setStyle({ weight: 2 });
                }
            });

            // Adjust cluster settings
            if (markers instanceof L.MarkerClusterGroup) {
                markers.options.disableClusteringAtZoom = 15;
                markers.options.maxClusterRadius = 40;
            }

            // Show toggle button, hide filter control
            if (filterToggle) filterToggle.style.display = 'block';
            if (filterControl) filterControl.style.display = 'none';

            // Prevent unwanted zooming
            preventZoom();

            // Handle input field focus
            const inputFields = document.querySelectorAll('input, select');
            inputFields.forEach(input => {
                input.addEventListener('focus', () => {
                    document.body.scrollTop = 0;
                    document.documentElement.scrollTop = 0;
                });
                input.addEventListener('blur', () => {
                    window.scrollTo(0, 0);
                });
            });

            // Show toggle button, hide filter control
            if (filterToggle) filterToggle.style.display = 'block';
            if (filterControl) filterControl.style.display = 'none';

            // Ensure the filter toggle is clickable
            if (filterToggle) {
                filterToggle.style.zIndex = '1002';
                filterToggle.style.position = 'absolute';
                filterToggle.style.top = '10px';
                filterToggle.style.right = '50px';
            }

        } else {
            // Desktop optimizations
            map.options.zoomAnimation = true;
            map.setMaxZoom(18); // Or whatever your default max zoom is

            // Hide toggle button, show filter control
            if (filterToggle) filterToggle.style.display = 'none';
            if (filterControl) filterControl.style.display = 'block';

            // Reset filter control position for desktop view
            if (filterControl) {
                filterControl.style.position = 'static';
                filterControl.style.top = 'auto';
                filterControl.style.left = 'auto';
                filterControl.style.right = 'auto';
            }
        }
    }
}

// Debounce function (keep this as is)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Data Loading
const loadMountainAreas = async () => {
    console.log('Loading mountain areas...');
    try {
        const response = await fetch("https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/MountainAreas.geojson");
        mountainAreasData = await response.json();

        const uniqueHierLvls = [...new Set(mountainAreasData.features.map(feature => feature.properties?.Hier_lvl))].sort((a, b) => a - b);
        const hierLvlSelect = document.getElementById('hier-lvl-select');
        
        uniqueHierLvls.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.text = `Hier_lvl: ${value}`;
            hierLvlSelect.appendChild(option);
        });

        hierLvlSelect.value = "4";
        handleFilterChange("4");

        hierLvlSelect.addEventListener('change', function () {
            handleFilterChange(this.value);
        });
        console.log('Mountain areas loaded');
    } catch (error) {
        console.error('Error loading Mountain Areas:', error);
    }
};

const loadOsmPeaks = async () => {
    console.log('Loading OSM peaks...');
    try {
        const response = await fetch("https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/OSM_peaks.geojson");
        const osmPeaksData = await response.json();

        L.geoJSON(osmPeaksData, {
            pointToLayer: (feature, latlng) => {
                const marker = L.marker(latlng);
                const name = feature.properties.name || "Unnamed Peak";
                const elevation = feature.properties.elevation || "Unknown";
                const popupContent = `<b>Name:</b> ${name}<br><b>Elevation:</b> ${elevation} m`;

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

        fitMapToBounds(map, mountainAreasLayer, markers);
        console.log('OSM peaks loaded');
    } catch (error) {
        console.error('Error loading OSM Peaks:', error);
    }
};

// Map initialization
const initializeMap = async () => {
    console.log('Initializing map...');
    map = initMap();
    const layers = initLayers(map);
    mountainAreasLayer = layers.mountainAreasLayer;
    markers = layers.markers;

    const overlayMaps = {
        "Mountain Areas": mountainAreasLayer,
        "OSM Peaks": markers
    };

    addControls(map, baseMaps, overlayMaps);
    addEventListeners(map, mountainAreasLayer);

    await loadMountainAreas();
    await loadOsmPeaks();
    
    // Call optimizeForMobile after everything is loaded
    optimizeForMobile();
    window.addEventListener('load', function() {
        optimizeForMobile();
        window.addEventListener('resize', debounce(optimizeForMobile, 250));
    });
    
    console.log('Map initialization complete');
};

// Call the initialization function when the DOM is ready
document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM fully loaded and parsed');
    initializeMap();
});

// Add resize listener
window.addEventListener('resize', optimizeForMobile);