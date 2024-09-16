let map;
let geojsonLayer;

function initMap() {
    map = L.map('map');  // Remove the setView, we'll set it after loading the data

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Move layer control to top right
    map.addControl(L.control.layers({}, {}, { position: 'topright' }));

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
        })
        .catch(error => console.error("Error loading GeoJSON:", error));
}

function getColorByHierLevel(hierLevel) {
    return hierLevel === 1 ? '#ff0000' :
           hierLevel === 2 ? '#00ff00' :
           hierLevel === 3 ? '#0000ff' :
                             '#999999';
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

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    document.getElementById('hier-level').addEventListener('change', (e) => {
        filterByHierLevel(e.target.value);
    });
});