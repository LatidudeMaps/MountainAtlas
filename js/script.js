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
    fetch('MountainAreas.geojson')
        .then(response => response.json())
        .then(data => {
            geojsonLayer = L.geoJSON(data, {
                style: feature => ({
                    fillColor: getColorByHierLevel(feature.properties.Hier_lvl),
                    weight: 1,
                    opacity: 1,
                    color: 'white',
                    fillOpacity: 0.7
                })
            }).addTo(map);

            map.fitBounds(geojsonLayer.getBounds());
            populateFilterOptions(data);
        })
        .catch(error => console.error("Error loading GeoJSON:", error));
}

function populateFilterOptions(data) {
    const hierLevels = new Set();
    data.features.forEach(feature => {
        if (feature.properties && feature.properties.Hier_lvl !== undefined) {
            hierLevels.add(feature.properties.Hier_lvl);
        }
    });

    const filterSelect = document.getElementById('hier-level');
    filterSelect.innerHTML = '<option value="all">All Levels</option>';
    Array.from(hierLevels).sort((a, b) => a - b).forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = `Level ${level}`;
        filterSelect.appendChild(option);
    });

    filterSelect.addEventListener('change', (e) => {
        filterByHierLevel(e.target.value);
    });
}

function filterByHierLevel(level) {
    geojsonLayer.eachLayer(layer => {
        if (level === 'all' || layer.feature.properties.Hier_lvl === parseInt(level)) {
            map.addLayer(layer);
        } else {
            map.removeLayer(layer);
        }
    });
}

document.addEventListener('DOMContentLoaded', initMap);