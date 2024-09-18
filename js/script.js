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

let mountainAreasData, osmPeaksData;  // Declare variables
let allMountainPolygons = [];  // Store all polygon geometries

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

        // Add all Mountain Areas data to the map initially
        mountainAreasLayer.addData(mountainAreasData).addTo(map);
        allMountainPolygons = mountainAreasLayer.getLayers().map(layer => layer.getLatLngs());

        hierLvlSelect.addEventListener('change', handleFilterChange);
    } catch (error) {
        console.error('Error loading Mountain Areas:', error);
    }
}

// Load OSM Peaks data
async function loadOsmPeaks() {
    try {
        const response = await fetch(osmPeaksUrl);
        const data = await response.json();
        osmPeaksData = data;

        // Initially load all peaks
        addOsmPeaksToMap(osmPeaksData);  
    } catch (error) {
        console.error('Error loading OSM Peaks:', error);
    }
}

// Function to handle filter changes
function handleFilterChange() {
    const selectedValue = document.getElementById('hier-lvl-select').value.trim();
    mountainAreasLayer.clearLayers();
    markers.clearLayers();  // Clear the current marker cluster

    if (selectedValue === "all") {
        // Show all mountain areas and peaks
        mountainAreasLayer.addData(mountainAreasData);  // Show all mountain areas
        allMountainPolygons = mountainAreasLayer.getLayers().map(layer => layer.getLatLngs());  // Reset polygons
        addOsmPeaksToMap(osmPeaksData);  // Show all OSM Peaks
    } else {
        // Filter mountain areas based on selected Hier_lvl
        const filteredMountainAreas = L.geoJSON(mountainAreasData, {
            filter: feature => String(feature.properties.Hier_lvl).trim() === selectedValue,
            style: defaultPolygonStyle,
            onEachFeature: (feature, layer) => {
                layer.bindPopup(feature.properties.MapName);
            }
        });
        mountainAreasLayer.addLayer(filteredMountainAreas);
        allMountainPolygons = filteredMountainAreas.getLayers().map(layer => layer.getLatLngs());  // Update visible polygon geometries

        // Filter OSM Peaks based on whether they fall inside visible polygons
        addOsmPeaksToMap(osmPeaksData);  // Re-add peaks, hiding those outside polygons
    }
}

// Function to add OSM Peaks to the map based on visibility within polygons
function addOsmPeaksToMap(peaksData) {
    L.geoJSON(peaksData, {
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
        },
        filter: function(feature, latlng) {
            // If "Show All" is selected, return all peaks
            if (document.getElementById('hier-lvl-select').value.trim() === "all") return true;
            
            // Otherwise, only show peaks inside the visible polygons
            return allMountainPolygons.some(polygon => L.polygon(polygon).contains(latlng));
        }
    }).addTo(markers);
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