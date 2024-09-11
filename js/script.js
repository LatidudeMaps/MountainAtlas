// Your existing security measures here

// Add Leaflet.markercluster plugin
var markerClusterScript = document.createElement('script');
markerClusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js';
document.head.appendChild(markerClusterScript);

var markerClusterCSS = document.createElement('link');
markerClusterCSS.rel = 'stylesheet';
markerClusterCSS.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css';
document.head.appendChild(markerClusterCSS);

var markerClusterDefaultCSS = document.createElement('link');
markerClusterDefaultCSS.rel = 'stylesheet';
markerClusterDefaultCSS.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css';
document.head.appendChild(markerClusterDefaultCSS);

// Function to add clustered markers
function addClusteredMarkers(map, geojsonData) {
    var markers = L.markerClusterGroup();

    L.geoJSON(geojsonData, {
        pointToLayer: function(feature, latlng) {
            var marker = L.circleMarker(latlng, {
                radius: 8,
                fillColor: "#ff7800",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
            marker.bindPopup("Name: " + feature.properties.name + "<br>Elevation: " + feature.properties.elevation + " m");
            marker.bindTooltip(feature.properties.name);
            return marker;
        }
    }).addTo(markers);

    map.addLayer(markers);
    
    // Add markers to the layer control
    var layerControl = document.querySelector('.leaflet-control-layers');
    if (layerControl) {
        var overlaysContainer = layerControl.querySelector('.leaflet-control-layers-overlays');
        var label = document.createElement('label');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = true;
        label.appendChild(input);
        label.appendChild(document.createTextNode(' OSM Peaks'));
        overlaysContainer.appendChild(label);

        input.addEventListener('change', function() {
            if (this.checked) {
                map.addLayer(markers);
            } else {
                map.removeLayer(markers);
            }
        });
    }
}

// Function to load GeoJSON data and initialize clustering
function loadDataAndInitialize() {
    fetch('peaks_data.json')
        .then(response => response.json())
        .then(data => {
            var map = Object.values(window).find(item => item instanceof L.Map);
            if (map) {
                addClusteredMarkers(map, data);
            } else {
                console.error('Map not found');
            }
        })
        .catch(error => console.error('Error loading GeoJSON data:', error));
}

// Ensure the script runs after the map is fully loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(loadDataAndInitialize, 1000);
} else {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(loadDataAndInitialize, 1000);
    });
}