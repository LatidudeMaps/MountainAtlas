// Initialize the map
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

// Function to load the map and GeoJSON simultaneously
async function loadMapAndData() {
    try {
        // Show spinner while loading
        document.getElementById('loading-spinner').style.display = 'block';

        // Load map tiles
        const tileLayerPromise = new Promise((resolve, reject) => {
            CartoDB_DarkMatter.addTo(map);
            map.on('layeradd', () => resolve(true));
            map.on('tileerror', () => reject('Error loading tiles'));
        });

        // Load mountain areas GeoJSON data
        const mountainAreasPromise = fetch(mountainAreasUrl)
            .then(response => response.json())
            .then(data => {
                mountainAreasData = data;

                // Add mountain areas to the map
                mountainAreasLayer.addData(mountainAreasData);

                // Fit the map to the bounds of the data
                map.fitBounds(mountainAreasLayer.getBounds());
            });

        // Wait for both the map tiles and mountain areas data to load
        await Promise.all([tileLayerPromise, mountainAreasPromise]);

        // Hide spinner and show the map
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('map').style.display = 'block';

        // Add layers to map only after both have loaded
        mountainAreasLayer.addTo(map);
        markers.addTo(map);

    } catch (error) {
        console.error('Error loading map or data:', error);
    }
}

// Load the map and data on page load
const mountainAreasLayer = L.geoJSON(null, {
    style: defaultPolygonStyle,
    onEachFeature: (feature, layer) => {
        layer.bindPopup(feature.properties.MapName);
    }
});

// Layer control
const baseMaps = {
    "Dark Positron": CartoDB_DarkMatter,
    "OpenStreetMap": openStreetMap,
    "Esri World Imagery": esriWorldImagery
};

const overlayMaps = {
    "Mountain Areas": mountainAreasLayer,
    "OSM Peaks": markers
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// Fetch and display peaks (same as before)
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

// Load map and data
loadMapAndData();
loadOsmPeaks();