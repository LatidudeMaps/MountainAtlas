// Function to load the map and GeoJSON simultaneously
async function loadMapAndData() {
    try {
        // Load map tiles
        const tileLayerPromise = new Promise((resolve, reject) => {
            CartoDB_DarkMatter.addTo(map);
            map.on('load', () => resolve(true));  // Resolve when the tiles are ready
            map.on('tileerror', () => reject('Error loading tiles'));
        });

        // Load mountain areas GeoJSON data
        const mountainAreasPromise = fetch(mountainAreasUrl)
            .then(response => response.json())
            .then(data => {
                mountainAreasData = data;
                mountainAreasLayer.addData(mountainAreasData);
            });

        // Wait for both the map tiles and mountain areas data to load
        await Promise.all([tileLayerPromise, mountainAreasPromise]);

    } catch (error) {
        console.error('Error loading map or data:', error);
    }
}

// Show spinner for 1.5 seconds, then load the map and data
function showSpinnerAndLoadMap() {
    const spinner = document.getElementById('loading-spinner');
    const mapDiv = document.getElementById('map');

    // Display spinner for 1.5 seconds
    setTimeout(() => {
        // Hide the spinner and show the map
        spinner.style.display = 'none';
        mapDiv.style.display = 'block';

        // After spinner disappears, load the map and data
        loadMapAndData();
        map.fitBounds(mountainAreasLayer.getBounds());  // Ensure bounds are set once everything is loaded
    }, 1500);  // Spinner delay time (1.5 seconds)
}

// Initialize map settings
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
});

// Other tile layers
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
});

// Layer control for base maps and overlays
const mountainAreasLayer = L.geoJSON(null, {
    style: defaultPolygonStyle,
    onEachFeature: (feature, layer) => {
        layer.bindPopup(feature.properties.MapName);
    }
});

const baseMaps = {
    "Dark Positron": CartoDB_DarkMatter,
    "OpenStreetMap": openStreetMap,
    "Esri World Imagery": esriWorldImagery
};

const overlayMaps = {
    "Mountain Areas": mountainAreasLayer,
    "OSM Peaks": markers
};

// Layer control
L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// Load OSM Peaks data
async function loadOsmPeaks() {
    try {
        const response = await fetch(osmPeaksUrl);
        const data = await response.json();

        L.geoJSON(data, {
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
    } catch (error) {
        console.error('Error loading OSM Peaks:', error);
    }
}

// Define default polygon style
function defaultPolygonStyle() {
    return {
        color: "#ff7800",
        weight: 2,
        opacity: 1,
        fillColor: "#ffcc66",
        fillOpacity: 0.65
    };
}

// URLs
const mountainAreasUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/MountainAreas.geojson";
const osmPeaksUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/OSM_peaks.geojson";

// Start the loading process
showSpinnerAndLoadMap();
loadOsmPeaks();