async function loadMapAndData() {
    try {
        // Show the spinner for 1.5 seconds
        const spinner = document.getElementById('loading-spinner');
        const mapDiv = document.getElementById('map');

        // Start loading tiles and GeoJSON data
        const tileLayerPromise = new Promise((resolve, reject) => {
            CartoDB_DarkMatter.addTo(map);
            map.on('load', () => resolve(true));
            map.on('tileerror', () => reject('Error loading tiles'));
        });

        const mountainAreasPromise = fetch(mountainAreasUrl)
            .then(response => response.json())
            .then(data => {
                mountainAreasData = data;
                mountainAreasLayer.addData(mountainAreasData);
            });

        // Wait for 1.5 seconds, then show the map
        setTimeout(async () => {
            await Promise.all([tileLayerPromise, mountainAreasPromise]);

            // Hide the spinner and show the map
            spinner.style.display = 'none';
            mapDiv.style.display = 'block';

            // Fit map to the bounds of the mountain areas
            map.fitBounds(mountainAreasLayer.getBounds());

            // Add the mountain areas layer and markers
            mountainAreasLayer.addTo(map);
            markers.addTo(map);
        }, 1500);

    } catch (error) {
        console.error('Error loading map or data:', error);
    }
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

// Add the filter dropdown (as before)
const filterControl = L.control({ position: 'topright' });
filterControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'filter-control');
    div.innerHTML = `
        <label for="hier-lvl-select">Choose hierarchy level:</label><br>
        <select id="hier-lvl-select">
            <option value="all">Show All</option>
        </select>`;
    return div;
};
filterControl.addTo(map);

// Handle the dropdown behavior (same as before)
let mountainAreasData;

function populateDropdownAndHandleEvents() {
    const hierLvlSelect = document.getElementById('hier-lvl-select');
    const uniqueHierLvls = [...new Set(mountainAreasData.features.map(feature => feature.properties.Hier_lvl))].sort((a, b) => a - b);

    uniqueHierLvls.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.text = `Hier_lvl: ${value}`;
        hierLvlSelect.appendChild(option);
    });

    hierLvlSelect.addEventListener('change', () => {
        const selectedValue = hierLvlSelect.value.trim();
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
    });
}

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

// URLs
const mountainAreasUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/MountainAreas.geojson";
const osmPeaksUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/OSM_peaks.geojson";

// Start the loading process
showSpinnerAndLoadMap();
loadOsmPeaks();