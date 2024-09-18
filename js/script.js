// Initialize the map with zoom settings
const map = L.map('map', {
    zoomAnimation: true,
    zoomSnap: 1,
    zoomDelta: 1
});

// Add tile layers
const CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
});

const esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
});

// Add marker cluster group
const markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 18,
    zoomToBoundsOnClick: true,
    showCoverageOnHover: false
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
});

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

let globalBounds = null;  // Variable to store the global bounds ONLY based on Mountain Areas

// Function to set the global max bounds based only on Mountain Areas
function setGlobalMaxBounds(bounds) {
    if (!globalBounds) {
        globalBounds = bounds;
        map.setMaxBounds(globalBounds);  // Set global max bounds ONCE for the map
        map.fitBounds(globalBounds);     // Initially fit map to the global extent
        map.setMinZoom(map.getBoundsZoom(globalBounds));  // Restrict zooming out beyond the global max bounds
    }
}

// Fetch GeoJSON data for Mountain Areas
async function loadMountainAreas() {
    try {
        const response = await fetch(mountainAreasUrl);
        const data = await response.json();

        // Add data to the map and set the global bounds based only on Mountain Areas
        mountainAreasLayer.addData(data).addTo(map);
        const mountainBounds = mountainAreasLayer.getBounds();
        setGlobalMaxBounds(mountainBounds);  // Set global bounds based on Mountain Areas ONLY

        // Populate dropdown
        const uniqueHierLvls = [...new Set(data.features.map(feature => feature.properties?.Hier_lvl))].sort((a, b) => a - b);
        const hierLvlSelect = document.getElementById('hier-lvl-select');
        uniqueHierLvls.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.text = `Hier_lvl: ${value}`;
            hierLvlSelect.appendChild(option);
        });

        hierLvlSelect.addEventListener('change', handleFilterChange);
    } catch (error) {
        console.error('Error loading Mountain Areas:', error);
    }
}

// Function to handle filter changes without changing the max bounds
function handleFilterChange() {
    const selectedValue = document.getElementById('hier-lvl-select').value.trim();
    mountainAreasLayer.clearLayers();

    if (selectedValue === "all") {
        // Reset to show all mountain areas
        mountainAreasLayer.addData(mountainAreasData);
        map.fitBounds(globalBounds);  // Fit the view to the global bounds without changing max bounds
    } else {
        const filteredData = L.geoJSON(mountainAreasData, {
            filter: feature => String(feature.properties.Hier_lvl).trim() === selectedValue,
            style: defaultPolygonStyle,
            onEachFeature: (feature, layer) => {
                layer.bindPopup(feature.properties.MapName);
            }
        });
        mountainAreasLayer.addLayer(filteredData);

        // Fit the view to the filtered data, but the global bounds remain unchanged
        const filteredBounds = mountainAreasLayer.getBounds();
        map.fitBounds(filteredBounds);  // Zoom to the filtered features
    }
}

// Load OSM Peaks data but DO NOT affect max bounds
async function loadOsmPeaks() {
    try {
        const response = await fetch(osmPeaksUrl);
        const data = await response.json();

        const osmPeaksLayer = L.geoJSON(data, {
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

        // OSM Peaks are added, but DO NOT modify the max bounds
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