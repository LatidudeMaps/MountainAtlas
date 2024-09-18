// Initialize the map with zoom settings
const map = L.map('map', {
    zoomAnimation: true,
    zoomSnap: 1,
    zoomDelta: 1,
    preferCanvas: true
});

/// Add tile layers with additional settings to avoid tile borders
const CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
    tileSize: 256,
    zoomOffset: 0,
    edgeBufferTiles: 2,          // Extra tiles to avoid gaps
    detectRetina: true,          // Support high-DPI displays
    opacity: 0.99                // Slight reduction in opacity to help blend tiles
}).addTo(map);

const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    tileSize: 256,
    zoomOffset: 0,
    edgeBufferTiles: 2,
    detectRetina: true,          // Retina support
    opacity: 0.99                // Slight reduction in opacity
});

const esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    tileSize: 256,
    zoomOffset: 0,
    edgeBufferTiles: 2,
    detectRetina: true,          // Retina support
    opacity: 0.99                // Slight reduction in opacity
});


// Add marker cluster group
const markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 18,
    zoomToBoundsOnClick: true,
    showCoverageOnHover: false,
    chunkedLoading: true,           // Enable chunked loading
    chunkInterval: 200,             // Time interval between chunk loads (milliseconds)
    chunkDelay: 50,                 // Delay between chunks
    chunkProgress: (processed, total, elapsed) => {
        console.log(`Processing markers: ${processed} of ${total} (${elapsed}ms elapsed)`);
    }
}).addTo(map);

// Layer control for base maps and overlays
const baseMaps = {
    "Dark Positron": CartoDB_DarkMatter,
    "OpenStreetMap": openStreetMap,
    "Esri World Imagery": esriWorldImagery
};

const mountainAreasLayer = L.geoJSON(null, {
    style: defaultPolygonStyle,
    onEachFeature: (feature, layer) => {
        layer.bindPopup(feature.properties.MapName);
    }
}).addTo(map);  // Ensure the mountain areas layer is visible by default

const overlayMaps = {
    "Mountain Areas": mountainAreasLayer,
    "OSM Peaks": markers
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// Custom filter dropdown
const filterControl = L.control({ position: 'topright' });
filterControl.onAdd = function() {
    const div = L.DomUtil.create('div', 'filter-control');
    div.innerHTML = `
        <label for="hier-lvl-select">Choose hierarchy level:</label><br>
        <select id="hier-lvl-select">
            <option value="all">Show All</option>
        </select>`;
    return div;
};
filterControl.addTo(map);

L.DomEvent.disableClickPropagation(document.querySelector('.filter-control'));

let mountainAreasData, osmPeaksData;  // Declare variables

// Function to fit map to the bounds of both mountain areas and OSM peaks
function fitMapToBounds() {
    const bounds = L.latLngBounds([]);  // Initialize empty bounds
    
    if (mountainAreasLayer.getLayers().length > 0) {
        bounds.extend(mountainAreasLayer.getBounds());  // Extend bounds to include mountain areas
    }

    if (markers.getLayers().length > 0) {
        bounds.extend(markers.getBounds());  // Extend bounds to include OSM peaks
    }

    if (bounds.isValid()) {
        map.fitBounds(bounds);  // Fit the map view to the combined bounds
    }
}

// Fetch GeoJSON data with async/await
async function loadMountainAreas() {
    try {
        const response = await fetch(mountainAreasUrl);
        const data = await response.json();
        mountainAreasData = data;

        // Extract unique hierarchy levels and populate dropdown
        const uniqueHierLvls = [...new Set(data.features.map(feature => feature.properties?.Hier_lvl))].sort((a, b) => a - b);

        const hierLvlSelect = document.getElementById('hier-lvl-select');
        uniqueHierLvls.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.text = `Hier_lvl: ${value}`;
            hierLvlSelect.appendChild(option);
        });

        // Add data to the map
        mountainAreasLayer.addData(mountainAreasData).addTo(map);

        // Fit map to the bounds of the mountain areas and peaks
        fitMapToBounds();

        hierLvlSelect.addEventListener('change', handleFilterChange);
    } catch (error) {
        console.error('Error loading Mountain Areas:', error);
    }
}

// Function to handle filter changes without adjusting the map bounds
function handleFilterChange() {
    const selectedValue = document.getElementById('hier-lvl-select').value.trim();
    mountainAreasLayer.clearLayers();

    if (selectedValue === "all") {
        mountainAreasLayer.addData(mountainAreasData);
    } else {
        const filteredData = L.geoJSON(mountainAreasData, {
            filter: feature => String(feature.properties.Hier_lvl).trim() === selectedValue,
            style: defaultPolygonStyle,
            onEachFeature: (feature, layer) => {
                layer.bindPopup(feature.properties.MapName);
            }
        });
        mountainAreasLayer.addLayer(filteredData);
    }

    // No need to refit the bounds when filtering
}

// Load OSM Peaks data
async function loadOsmPeaks() {
    try {
        const response = await fetch(osmPeaksUrl);
        const data = await response.json();
        osmPeaksData = data;

        const osmPeaksLayer = L.geoJSON(osmPeaksData, {
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

        // Fit map to the bounds of the mountain areas and peaks
        fitMapToBounds();
    } catch (error) {
        console.error('Error loading OSM Peaks:', error);
    }
}

// Default polygon style
function defaultPolygonStyle() {
    return {
        color: "#ff7800",
        weight: 2,
        opacity: 1,
        fillColor: "#ffcc66",
        fillOpacity: 0.65
    };
}

// Load data
const mountainAreasUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/MountainAreas.geojson";
const osmPeaksUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/OSM_peaks.geojson";

loadMountainAreas();
loadOsmPeaks();