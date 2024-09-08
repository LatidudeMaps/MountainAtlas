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

// In script.js
function initializePopups() {
    if (typeof window.markers !== 'undefined' && Array.isArray(window.markers)) {
        window.markers.forEach(function(marker) {
            var lat = marker.getLatLng().lat;
            var lng = marker.getLatLng().lng;
            var matchingData = window.coordinates.find(function(coord) {
                return coord[0] === lat && coord[1] === lng;
            });
            if (matchingData) {
                var popupContent = '<b>Name:</b> ' + matchingData[2] + '<br><b>Elevation:</b> ' + matchingData[3];
                marker.bindPopup(popupContent);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if coordinates are loaded, if not, wait for them
    if (typeof window.coordinates !== 'undefined') {
        initializePopups();
    } else {
        // Wait for coordinates to be loaded
        window.addEventListener('coordinatesLoaded', initializePopups);
    }
});