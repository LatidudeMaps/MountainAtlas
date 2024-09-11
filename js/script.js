document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('keydown', event => {
    if (event.ctrlKey && (event.key === 'u' || event.key === 's')) {
        event.preventDefault();
        alert('Sorry, this action is not allowed.');
    }
});

console.log = function() {};
console.warn = function() {};
console.error = function() {};

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

// Wait for the map and GeoJSON data to be available
function initializeClustering() {
    if (window.peaksData) {
        // Folium creates the map with the variable name "map"
        var map = window.map_e6e51a6fa6b644689f1c4c47e98a0999;
        if (map) {
            addClusteredMarkers(map, window.peaksData);
        } else {
            setTimeout(initializeClustering, 100);
        }
    } else {
        setTimeout(initializeClustering, 100);
    }
}

document.addEventListener('DOMContentLoaded', initializeClustering);