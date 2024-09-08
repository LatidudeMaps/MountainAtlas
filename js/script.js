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

// Add this at the end of your existing script.js file

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

// Modify your existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // Your existing code here

    // Add this check for coordinates
    if (typeof window.coordinates !== 'undefined') {
        initializePopups();
    } else {
        window.addEventListener('coordinatesLoaded', initializePopups);
    }
});