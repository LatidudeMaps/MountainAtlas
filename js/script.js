// Initialize the map with zoom settings
const map = L.map('map', {
    zoomAnimation: false,
    zoomSnap: 1,
    zoomDelta: 1,
    preferCanvas: true
});

/// Add tile layers with additional settings to avoid tile borders
const CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    detectRetina: true,          // Support high-DPI displays
}).addTo(map);

const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    detectRetina: true,          // Retina support
});

const esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    detectRetina: true,          // Retina support
});


// Add marker cluster group
const markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 18,
    zoomToBoundsOnClick: true,
    showCoverageOnHover: false,
    chunkedLoading: true, // Enable chunked loading for large datasets
    chunkInterval: 200,
    chunkDelay: 50
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
}).addTo(map); // Ensure the mountain areas layer is visible by default

const overlayMaps = {
    "Mountain Areas": mountainAreasLayer,
    "OSM Peaks": markers
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// Custom filter dropdown with search bar and autocomplete suggestions
const filterControl = L.control({ position: 'topright' });
filterControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'filter-control');
    div.innerHTML = `
        <label for="hier-lvl-select">Choose hierarchy level:</label><br>
        <select id="hier-lvl-select">
            <option value="all">Show All</option>
        </select><br><br>
        <label for="search-input">Search by MapName:</label><br>
        <input type="text" id="search-input" placeholder="Search..." style="width: 150px;" list="search-suggestions">
        <datalist id="search-suggestions"></datalist> <!-- This will hold autocomplete suggestions -->
    `;
    return div;
};
filterControl.addTo(map);

L.DomEvent.disableClickPropagation(document.querySelector('.filter-control'));

let mountainAreasData, osmPeaksData; // Declare variables

// Function to fit map to the bounds of both mountain areas and OSM peaks
function fitMapToBounds() {
    const bounds = L.latLngBounds([]); // Initialize empty bounds

    if (mountainAreasLayer.getLayers().length > 0) {
        bounds.extend(mountainAreasLayer.getBounds()); // Extend bounds to include mountain areas
    }

    if (markers.getLayers().length > 0) {
        bounds.extend(markers.getBounds()); // Extend bounds to include OSM peaks
    }

    if (bounds.isValid()) {
        map.fitBounds(bounds); // Fit the map view to the combined bounds
    }
}

// Function to update search suggestions based on the visible polygons
function updateSearchSuggestions() {
    const searchSuggestions = document.getElementById('search-suggestions');
    searchSuggestions.innerHTML = ''; // Clear previous suggestions

    // Collect visible "MapName" values
    const mapNames = [];
    mountainAreasLayer.eachLayer(layer => {
        const mapName = layer.feature.properties.MapName;
        if (!mapNames.includes(mapName)) {
            mapNames.push(mapName);
        }
    });

    // Populate the datalist with unique "MapName" values
    mapNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        searchSuggestions.appendChild(option);
    });
}

// Function to handle search by MapName
function handleSearch() {
    const searchValue = document.getElementById('search-input').value.trim().toLowerCase();

    // Clear any previous style (e.g., highlighted) and remove search result layers
    mountainAreasLayer.eachLayer(layer => {
        mountainAreasLayer.resetStyle(layer);
    });

    if (searchValue) {
        let matchingLayers = [];

        mountainAreasLayer.eachLayer(layer => {
            const mapName = layer.feature.properties.MapName.trim().toLowerCase();

            if (mapName.includes(searchValue)) {
                matchingLayers.push(layer);
            }
        });

        if (matchingLayers.length > 0) {
            const bounds = L.latLngBounds([]);

            matchingLayers.forEach(layer => {
                // Highlight the matching polygons
                layer.setStyle({
                    color: 'yellow', // Highlight with yellow border
                    weight: 4
                });

                bounds.extend(layer.getBounds()); // Add to the bounds to zoom to it
            });

            // Zoom to the matching layers' bounds
            map.fitBounds(bounds);
        } else {
            alert('No matching polygons found.');
        }
    }
}

// Attach the search function to the search input
document.getElementById('search-input').addEventListener('input', handleSearch);

// Modify handleFilterChange to update search suggestions
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

    // Update search suggestions based on the visible features
    updateSearchSuggestions();
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

        // Update search suggestions initially
        updateSearchSuggestions();

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