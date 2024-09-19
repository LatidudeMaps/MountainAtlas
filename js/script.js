// Map initialization
const initMap = () => {
    const map = L.map('map', {
        zoomAnimation: false,
        preferCanvas: true
    });

    const baseMaps = {
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

    return map;
};

// Layer initialization
const initLayers = (map) => {
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

    return { markers, mountainAreasLayer };
};

// UI Controls
const addControls = (map, baseMaps, overlayMaps) => {
    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
    
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
};

// Event Handlers
const addEventListeners = (map, mountainAreasLayer) => {
    map.on('load', () => {
        setTimeout(() => {
            map.invalidateSize();
            map.setZoomAnimation(true);
        }, 100);
    });

    map.on('load', () => {
        const initialBounds = map.getBounds();
        map.setMaxBounds(initialBounds);
        map.setMinZoom(map.getZoom() - 0);
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
};

// Utility Functions
const fitMapToBounds = (map, mountainAreasLayer, markers) => {
    const bounds = L.latLngBounds([]);
    if (mountainAreasLayer.getLayers().length > 0) bounds.extend(mountainAreasLayer.getBounds());
    if (markers.getLayers().length > 0) bounds.extend(markers.getBounds());
    if (bounds.isValid()) map.fitBounds(bounds);
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
};

const clearSearch = () => {
    document.getElementById('search-input').value = '';
    mountainAreasLayer.eachLayer(layer => mountainAreasLayer.resetStyle(layer));
};

const handleFilterChange = (selectedValue) => {
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
};

const defaultPolygonStyle = () => ({
    color: "#ff7800",
    weight: 2,
    opacity: 1,
    fillColor: "#ffcc66",
    fillOpacity: 0.65
});

// Data Loading
const loadMountainAreas = async () => {
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
    } catch (error) {
        console.error('Error loading Mountain Areas:', error);
    }
};

const loadOsmPeaks = async () => {
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
    } catch (error) {
        console.error('Error loading OSM Peaks:', error);
    }
};

// Main execution
let map, mountainAreasLayer, markers, mountainAreasData, filteredMountainAreas = [];

const initializeMap = async () => {
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
};

initializeMap();