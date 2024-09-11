// Preserve your existing security measures
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', event => {
    if (event.ctrlKey && (event.key === 'u' || event.key === 's')) {
        event.preventDefault();
        alert('Sorry, this action is not allowed.');
    }
});

// Function to clusterize OSM peaks layer
function clusterizePeaks() {
    // Check if the map and OSM peaks layer exist
    if (typeof map !== 'undefined' && map.hasLayer(osmPeaks)) {
        // Remove the existing OSM peaks layer
        map.removeLayer(osmPeaks);

        // Create a new MarkerClusterGroup
        var markers = L.markerClusterGroup();

        // Add all markers from the OSM peaks layer to the cluster group
        osmPeaks.eachLayer(function (layer) {
            markers.addLayer(layer);
        });

        // Add the cluster group to the map
        map.addLayer(markers);

        // Update the layer control
        layerControl.addOverlay(markers, 'OSM Peaks (Clustered)');
    } else {
        console.error('Map or OSM peaks layer not found');
    }
}

// Call the clusterizePeaks function when the page is fully loaded
document.addEventListener('DOMContentLoaded', (event) => {
    // Wait a bit to ensure the map and layers are fully initialized
    setTimeout(clusterizePeaks, 1000);
});