let map;
let geojsonLayer;

function initMap() {
    map = L.map('map');  // Remove the setView, we'll set it after loading the data

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    loadMountainAreas();
}

function loadMountainAreas() {
    console.log("Loading MountainAreas.geojson...");
    fetch('MountainAreas.geojson')
        .then(response => response.json())
        .then(data => {
            console.log("GeoJSON data loaded:", data);
            geojsonLayer = L.geoJSON(data, {
                style: {
                    fillColor: 'blue',
                    weight: 1,
                    opacity: 1,
                    color: 'white',
                    fillOpacity: 0.7
                }
            }).addTo(map);

            map.fitBounds(geojsonLayer.getBounds());
            populateFilterOptions(data);
        })
        .catch(error => console.error("Error loading GeoJSON:", error));
}

function populateFilterOptions(data) {
    console.log("Populating filter options...");
    const hierLevels = new Set();
    data.features.forEach(feature => {
        if (feature.properties && feature.properties.Hier_lvl !== undefined) {
            hierLevels.add(feature.properties.Hier_lvl);
        }
    });
    console.log("Unique Hier_lvl values:", Array.from(hierLevels));

    const filterSelect = document.getElementById('hier-level');
    filterSelect.innerHTML = '<option value="all">All Levels</option>';
    Array.from(hierLevels).sort((a, b) => a - b).forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = `Level ${level}`;
        filterSelect.appendChild(option);
    });

    filterSelect.addEventListener('change', (e) => {
        console.log("Filter changed to:", e.target.value);
        filterByHierLevel(e.target.value);
    });
}

function filterByHierLevel(level) {
    console.log("Filtering by level:", level);
    geojsonLayer.eachLayer(layer => {
        const layerHierLevel = layer.feature.properties.Hier_lvl;
        console.log("Layer Hier_lvl:", layerHierLevel);
        if (level === 'all' || layerHierLevel === parseInt(level)) {
            map.addLayer(layer);
            console.log("Showing layer with Hier_lvl:", layerHierLevel);
        } else {
            map.removeLayer(layer);
            console.log("Hiding layer with Hier_lvl:", layerHierLevel);
        }
    });
}

document.addEventListener('DOMContentLoaded', initMap);