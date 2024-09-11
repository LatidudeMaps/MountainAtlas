// Preserve your existing security measures
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', event => {
    if (event.ctrlKey && (event.key === 'u' || event.key === 's')) {
        event.preventDefault();
        alert('Sorry, this action is not allowed.');
    }
});

// Re-enable console for debugging
// console.log = function() {};
// console.warn = function() {};
// console.error = function() {};

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
    console.log('Adding clustered markers');
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
    console.log('Markers added to map');
    
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
        console.log('Layer control updated');
    } else {
        console.log('Layer control not found');
    }
}

// Wait for the map and GeoJSON data to be available
function initializeClustering() {
    console.log('Initializing clustering');
    if (window.peaksData) {
        console.log('Peaks data found');
        // Find the Leaflet map object
        var map = Object.values(window).find(item => item instanceof L.Map);
        if (map) {
            console.log('Map found');
            addClusteredMarkers(map, window.peaksData);
        } else {
            console.log('Map not found, retrying...');
            setTimeout(initializeClustering, 100);
        }
    } else {
        console.log('Peaks data not found, retrying...');
        setTimeout(initializeClustering, 100);
    }
}

// Ensure the script runs after the map is fully loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeClustering, 1000);
} else {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initializeClustering, 1000);
    });
}