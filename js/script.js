// Create map
const map = L.map('map', {
    zoomAnimation: true,  // Disable zoom animation initially
    preferCanvas: true
});

// Add optimized settings for Dark Positron basemap to avoid tile borders
const CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    detectRetina: true,         // Enable Retina support for higher resolution displays
    tileSize: 256,              // Keep the tile size to 256px for better performance
    updateWhenZooming: false,   // Don't update tiles during zoom animations
    keepBuffer: 4,              // Keep a buffer of tiles around the map to preload surrounding areas
}).addTo(map);

// Add optimized settings for Esri World Imagery basemap
const esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
});

// OpenStreetMap layer with regular settings (already working fine)
const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
});

// Re-enable zoom animation and recalculate the map size after load
map.on('load', function() {
    setTimeout(() => {
        map.invalidateSize();  // Fix size issues
        map.zoomAnimation = true;  // Re-enable zoom animation
    }, 100);  // Slight delay to ensure the map is fully rendered
});

// Capture the initial bounds of the map after the first layer is loaded
map.on('load', function() {
    const initialBounds = map.getBounds(); // Get the map's initial bounds

    // Set max bounds to limit panning outside the initial bounds
    map.setMaxBounds(initialBounds);

    // Optionally, set minimum and maximum zoom levels to prevent excessive zooming
    map.setMinZoom(map.getZoom() - 0);  // Prevent zooming out too much
});

// Add marker cluster group
const markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 18,
    zoomToBoundsOnClick: true,
    showCoverageOnHover: false,
    chunkedLoading: true,
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
}).addTo(map);

const overlayMaps = {
    "Mountain Areas": mountainAreasLayer,
    "OSM Peaks": markers
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);


// Custom filter dropdown and autocomplete search box
const filterControl = L.control({ position: 'topright' });
filterControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'filter-control');
    div.innerHTML = `
        <label for="hier-lvl-select">Choose hierarchy level:</label><br>
        <select id="hier-lvl-select"></select>
        <button id="show-all-btn" style="margin-left:5px;">Show All</button>
        <br><br>
        <label for="search-input">Search by MapName:</label><br>
        <input type="text" id="search-input" placeholder="Search..." style="width: 150px;">
        <div id="autocomplete-list" class="autocomplete-items"></div> <!-- Custom autocomplete container -->
        <button id="clear-search" style="margin-left:5px;">Clear</button>
    `;
    return div;
};
filterControl.addTo(map);

// Add "Show All" button functionality
document.getElementById('show-all-btn').addEventListener('click', function () {
    handleFilterChange("all");  // Show all polygons
});

// Autocomplete logic (unchanged)
document.getElementById('search-input').addEventListener('input', function () {
    const searchValue = this.value.trim().toLowerCase();
    const suggestionsContainer = document.getElementById('autocomplete-list');
    suggestionsContainer.innerHTML = ''; // Clear previous suggestions

    if (searchValue) {
        const filteredSuggestions = filteredMountainAreas
            .map(feature => feature.properties.MapName)
            .filter(name => name.toLowerCase().includes(searchValue));

        // Populate suggestions
        filteredSuggestions.forEach(name => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('autocomplete-item');
            suggestionItem.textContent = name;
            suggestionItem.addEventListener('click', function () {
                document.getElementById('search-input').value = name;
                suggestionsContainer.innerHTML = ''; // Clear suggestions after selecting
                handleSearch(); // Trigger search based on selection
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
    }
});

// Function to handle search (unchanged)
function handleSearch() {
    const searchValue = document.getElementById('search-input').value.trim().toLowerCase();
    mountainAreasLayer.eachLayer(layer => {
        mountainAreasLayer.resetStyle(layer); // Reset styles
    });

    if (searchValue) {
        let matchingLayers = [];
        mountainAreasLayer.eachLayer(layer => {
            if (layer.feature && layer.feature.properties) {
                const mapName = layer.feature.properties.MapName.trim().toLowerCase();
                if (mapName.includes(searchValue)) {
                    matchingLayers.push(layer);
                }
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
}

// Clear button functionality (unchanged)
document.getElementById('clear-search').addEventListener('click', function () {
    document.getElementById('search-input').value = '';
    document.getElementById('autocomplete-list').innerHTML = ''; // Clear autocomplete
    mountainAreasLayer.eachLayer(layer => {
        mountainAreasLayer.resetStyle(layer);
    });
});

// Load Mountain Areas (unchanged, except for preselection)
async function loadMountainAreas() {
    try {
        const response = await fetch(mountainAreasUrl);
        const data = await response.json();
        mountainAreasData = data;

        const uniqueHierLvls = [...new Set(data.features.map(feature => feature.properties?.Hier_lvl))].sort((a, b) => a - b);
        const hierLvlSelect = document.getElementById('hier-lvl-select');
        uniqueHierLvls.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.text = `Hier_lvl: ${value}`;
            hierLvlSelect.appendChild(option);
        });

        hierLvlSelect.value = "4"; // Preselect hier_lvl 4
        handleFilterChange("4");

        hierLvlSelect.addEventListener('change', function () {
            handleFilterChange(this.value);
        });
    } catch (error) {
        console.error('Error loading Mountain Areas:', error);
    }
}

// Fetch the OSM Peaks data and add it to the map (unchanged)
async function loadOsmPeaks() {
    try {
        const response = await fetch(osmPeaksUrl);
        const data = await response.json();
        const osmPeaksLayer = L.geoJSON(osmPeaksData, {
            pointToLayer: (feature, latlng) => {
                const marker = L.marker(latlng);
                const name = feature.properties.name || "Unnamed Peak";
                const popupContent = `<b>Name:</b> ${name}<br><b>Elevation:</b> ${elevation} m`;
                marker.bindPopup(popupContent).bindTooltip(name, { permanent: true, direction: 'top' });
                return marker;
            }
        }).addTo(markers);
        fitMapToBounds();
    } catch (error) {
        console.error('Error loading OSM Peaks:', error);
    }
}

// Default styles (unchanged)
function defaultPolygonStyle() {
    return { color: "#ff7800", weight: 2, fillColor: "#ffcc66", fillOpacity: 0.65 };
}

// Load initial data
const mountainAreasUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/MountainAreas.geojson";
const osmPeaksUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/OSM_peaks.geojson";
loadMountainAreas();
loadOsmPeaks();