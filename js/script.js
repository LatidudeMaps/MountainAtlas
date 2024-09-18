// Initialize the map with zoom settings
const map = L.map('map', {
    zoomAnimation: true,
    zoomSnap: 1,
    zoomDelta: 1,
    preferCanvas: true
}).setView([0, 0], 2);

// Add tile layers
const CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
    tileSize: 256,
    detectRetina: true,
    opacity: 0.99
}).addTo(map);

const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    detectRetina: true,
    opacity: 0.99
});

const esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    detectRetina: true,
    opacity: 0.99
});

const baseMaps = {
    "Dark Positron": CartoDB_DarkMatter,
    "OpenStreetMap": openStreetMap,
    "Esri World Imagery": esriWorldImagery
};

const markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 18,
    zoomToBoundsOnClick: true,
    showCoverageOnHover: false,
    chunkedLoading: true
}).addTo(map);

const mountainAreasLayer = L.geoJSON(null, {
    style: { color: "#ff7800", weight: 2, fillColor: "#ffcc66", fillOpacity: 0.65 },
    onEachFeature: (feature, layer) => layer.bindPopup(feature.properties.MapName)
}).addTo(map);

const overlayMaps = { "Mountain Areas": mountainAreasLayer, "OSM Peaks": markers };

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

L.control({ position: 'topright', onAdd: () => {
    const div = L.DomUtil.create('div', 'filter-control');
    div.innerHTML = `
        <label>Choose hierarchy level:</label><br>
        <select id="hier-lvl-select"><option value="all">Show All</option></select><br><br>
        <label>Search by MapName:</label><br>
        <input id="search-input" placeholder="Search..." list="search-suggestions">
        <datalist id="search-suggestions"></datalist><button id="clear-search">Clear</button>`;
    return div;
}}).addTo(map);

L.DomEvent.disableClickPropagation(document.querySelector('.filter-control'));

let mountainAreasData, filteredMountainAreas = [];

// Fit map to bounds of mountain areas and peaks
function fitMapToBounds() {
    const bounds = L.latLngBounds([]);
    if (mountainAreasLayer.getLayers().length) bounds.extend(mountainAreasLayer.getBounds());
    if (markers.getLayers().length) bounds.extend(markers.getBounds());
    if (bounds.isValid()) map.fitBounds(bounds);
}

// Update search suggestions from visible polygons
function updateSearchSuggestions() {
    const searchSuggestions = document.getElementById('search-suggestions');
    searchSuggestions.innerHTML = ''; 
    filteredMountainAreas.forEach(({ properties: { MapName } }) => {
        const option = document.createElement('option');
        option.value = MapName;
        searchSuggestions.appendChild(option);
    });
}

// Handle search by MapName
function handleSearch() {
    const searchValue = document.getElementById('search-input').value.trim().toLowerCase();
    if (!searchValue) return;
    let matchingLayers = [];
    mountainAreasLayer.eachLayer(layer => {
        if (layer.feature?.properties?.MapName?.toLowerCase().includes(searchValue)) matchingLayers.push(layer);
    });
    if (matchingLayers.length) {
        const bounds = L.latLngBounds();
        matchingLayers.forEach(layer => {
            layer.setStyle({ color: 'yellow', weight: 4 });
            bounds.extend(layer.getBounds());
        });
        map.fitBounds(bounds);
    } else alert('No matching polygons found.');
}

// Reset styles and search field
document.getElementById('clear-search').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    mountainAreasLayer.eachLayer(layer => mountainAreasLayer.resetStyle(layer));
});

// Apply the selected hierarchy filter
function handleFilterChange() {
    const selectedValue = document.getElementById('hier-lvl-select').value.trim();
    mountainAreasLayer.clearLayers();
    filteredMountainAreas = selectedValue === "all" ? mountainAreasData.features : mountainAreasData.features.filter(f => f.properties.Hier_lvl.trim() === selectedValue);
    mountainAreasLayer.addData({ type: "FeatureCollection", features: filteredMountainAreas });
    updateSearchSuggestions();
}

// Load mountain areas data
async function loadMountainAreas() {
    try {
        const response = await fetch(mountainAreasUrl);
        mountainAreasData = await response.json();
        const uniqueHierLvls = [...new Set(mountainAreasData.features.map(f => f.properties?.Hier_lvl))].sort();
        uniqueHierLvls.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.text = `Hier_lvl: ${value}`;
            document.getElementById('hier-lvl-select').appendChild(option);
        });
        mountainAreasLayer.addData(mountainAreasData);
        filteredMountainAreas = mountainAreasData.features;
        updateSearchSuggestions();
        document.getElementById('hier-lvl-select').addEventListener('change', handleFilterChange);
    } catch (error) { console.error('Error loading Mountain Areas:', error); }
}

// Load OSM Peaks data
async function loadOsmPeaks() {
    try {
        const response = await fetch(osmPeaksUrl);
        const osmPeaksData = await response.json();
        L.geoJSON(osmPeaksData, {
            pointToLayer: (feature, latlng) => L.marker(latlng).bindPopup(`<b>Name:</b> ${feature.properties.name || "Unnamed Peak"}<br><b>Elevation:</b> ${feature.properties.elevation || "Unknown"} m`)
        }).addTo(markers);
        fitMapToBounds();
    } catch (error) { console.error('Error loading OSM Peaks:', error); }
}

document.getElementById('search-input').addEventListener('change', handleSearch);

const mountainAreasUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/MountainAreas.geojson";
const osmPeaksUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/OSM_peaks.geojson";

loadMountainAreas();
loadOsmPeaks();