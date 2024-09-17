// Initialize the map
var map = L.map('map', {
    zoomAnimation: true,   // Enable zoom animation
    zoomSnap: 1,        // Allows for more granular zoom steps
    zoomDelta: 1        // Makes the zoom transition smoother with mouse scroll
});

// Add tile layers
var CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

var openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
});

var esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
});

// Add marker cluster group with smoother zoom handling
var markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: false,     // Avoid immediate zoom to individual markers on max zoom
    disableClusteringAtZoom: 18,  // Stop clustering at this zoom level
    zoomToBoundsOnClick: true,     // Enable zoom to bounds when clicking a cluster
    showCoverageOnHover: false
}).addTo(map);

// URLs of the GeoJSON files
var mountainAreasUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/MountainAreas.geojson";
var osmPeaksUrl = "https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/OSM_peaks.geojson";

// Layer control for base maps and overlays
var mountainAreasLayer = L.geoJSON(null, {  // Mountain areas layer added to control
    style: defaultPolygonStyle,
    onEachFeature: function (feature, layer) {
        layer.bindPopup(feature.properties.MapName);
    }
});

var baseMaps = {
    "Dark Positron": CartoDB_DarkMatter,
    "OpenStreetMap": openStreetMap,
    "Esri World Imagery": esriWorldImagery
};

var overlayMaps = {
    "Mountain Areas": mountainAreasLayer,   // Add Mountain Areas to control panel
    "OSM Peaks": markers
};

var layerControl = L.control.layers(baseMaps, overlayMaps, {collapsed: false}).addTo(map);

// Add custom filter dropdown
var filterControl = L.control({position: 'topright'});
filterControl.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'filter-control');
    div.innerHTML = '<label for="hier-lvl-select">Filter by Hier_lvl:</label><br>' +
                    '<select id="hier-lvl-select">' +
                    '<option value="all">Show All</option>' +
                    '</select>';
    return div;
};
filterControl.addTo(map);

L.DomEvent.disableClickPropagation(document.querySelector('.filter-control'));

var mountainAreasData;  // Define mountain areas data variable
var osmPeaksData;  // Define OSM peaks data variable

// Fetch Mountain Areas (add spinner handling)
fetch(mountainAreasUrl)
    .then(response => response.json())
    .then(data => {
        mountainAreasData = data;  // Store the data for later use

        var uniqueHierLvls = new Set();
        data.features.forEach(function (feature) {
            if (feature.properties && feature.properties.Hier_lvl) {
                uniqueHierLvls.add(feature.properties.Hier_lvl);
            }
        });

        // Sort Hier_lvl values in ascending order
        var sortedHierLvls = Array.from(uniqueHierLvls).sort(function(a, b) {
            return a - b;
        });

        // Populate the filter dropdown with unique Hier_lvl values
        var hierLvlSelect = document.getElementById('hier-lvl-select');
        sortedHierLvls.forEach(function (value) {
            var option = document.createElement('option');
            option.value = value;
            option.text = "Hier_lvl: " + value;
            hierLvlSelect.appendChild(option);
        });

        // Add Mountain Areas to the map by default
        mountainAreasLayer.addData(mountainAreasData).addTo(map);  // Add the layer to map initially

        // Fit the map bounds to the Mountain Areas layer (dynamic fitting)
        map.fitBounds(mountainAreasLayer.getBounds());

        // Handle filtering by Hier_lvl
        hierLvlSelect.addEventListener('change', function () {
            var selectedValue = hierLvlSelect.value.trim();
            console.log("Selected Hier_lvl: ", selectedValue);

            // Clear layers
            mountainAreasLayer.clearLayers();
            markers.clearLayers();

            if (selectedValue === "all") {
                console.log("Showing all polygons and points");
                // Show all polygons and points if "Show All" is selected
                mountainAreasLayer.addData(mountainAreasData);  // Show all polygons
                markers.addLayer(L.geoJSON(osmPeaksData));  // Show all OSM peaks points
            } else {
                console.log("Filtering polygons and points for Hier_lvl: " + selectedValue);

                // Filter the polygons by Hier_lvl
                var filteredPolygons = L.geoJSON(mountainAreasData, {
                    filter: function (feature) {
                        return String(feature.properties.Hier_lvl).trim() === selectedValue;
                    },
                    style: defaultPolygonStyle,
                    onEachFeature: function (feature, layer) {
                        layer.bindPopup(feature.properties.MapName);
                    }
                });

                // Check if any polygons are filtered
                if (!filteredPolygons.getLayers().length) {
                    console.log("No polygons found for this Hier_lvl");
                    return;
                }

                mountainAreasLayer.addLayer(filteredPolygons);  // Add the filtered polygons to the map

                // Collect the polygon geometries for Turf.js point-in-polygon check
                var polygonFeatures = [];
                filteredPolygons.eachLayer(function (layer) {
                    var polygon = layer.toGeoJSON();
                    if (polygon.geometry && polygon.geometry.type === "Polygon" || polygon.geometry.type === "MultiPolygon") {
                        polygonFeatures.push(polygon);  // Ensure only valid polygons are pushed
                    }
                });

                if (polygonFeatures.length === 0) {
                    console.error("No valid polygon features available for this Hier_lvl.");
                    return;
                }

                var polygonCollection = turf.featureCollection(polygonFeatures);

                // Now filter the OSM_peaks points based on whether they fall inside the actual polygon shapes
                var filteredPoints = L.geoJSON(osmPeaksData, {
                    filter: function (feature) {
                        var point = turf.point([feature.geometry.coordinates[0], feature.geometry.coordinates[1]]);
                        
                        // Check if the point is inside any of the filtered polygons
                        return turf.booleanPointInPolygon(point, polygonCollection);
                    },
                    pointToLayer: function (feature, latlng) {
                        var marker = L.marker(latlng);
                        var name = feature.properties.name || "Unnamed Peak";
                        var elevation = feature.properties.elevation || "Unknown";
                        var popupContent = "<b>Name:</b> " + name + "<br><b>Elevation:</b> " + elevation + " m";
                        marker.bindPopup(popupContent);

                        // Re-add persistent tooltip
                        marker.bindTooltip(name, { 
                            permanent: true, 
                            direction: 'top', 
                            offset: [-15, -3],
                            className: 'dark-tooltip'
                        });

                        // Handle popup interactions
                        marker.on('popupopen', function () {
                            marker.closeTooltip();  // Close the tooltip when the popup opens
                        });

                        marker.on('popupclose', function () {
                            marker.openTooltip();  // Reopen the tooltip after the popup closes
                        });

                        return marker;
                    }
                });

                markers.addLayer(filteredPoints);  // Add the filtered points to the marker cluster layer
                console.log("Filtered polygons and points added to the map.");
            }
        });
    });

// Load OSM Peaks
fetch(osmPeaksUrl)
    .then(response => response.json())
    .then(data => {
        osmPeaksData = data;  // Store the data for later use

        L.geoJSON(osmPeaksData, {
            pointToLayer: function(feature, latlng) {
                var marker = L.marker(latlng);
                var name = feature.properties.name || "Unnamed Peak";
                var elevation = feature.properties.elevation || "Unknown";
                var popupContent = "<b>Name:</b> " + name + "<br><b>Elevation:</b> " + elevation + " m";
                
                marker.bindPopup(popupContent);

                // Ensure tooltip doesn't block popup
                marker.bindTooltip(name, { 
                    permanent: true, 
                    direction: 'top', 
                    offset: [-15, -3],
                    className: 'dark-tooltip'
                });

                // Handle click events for better Safari support
                marker.on('click', function(e) {
                    marker.openPopup();
                });

                // Close tooltip when popup opens to prevent interference
                marker.on('popupopen', function () {
                    marker.closeTooltip();
                });

                // Reopen tooltip after popup closes
                marker.on('popupclose', function () {
                    marker.openTooltip();
                });

                return marker;
            }
        }).addTo(markers);
    });

// Define default polygon style
function defaultPolygonStyle() {
    return {
        color: "#ff7800",  // Orange border
        weight: 2,         // Border thickness
        opacity: 1,        // Border opacity
        fillColor: "#ffcc66",  // Light orange fill color
        fillOpacity: 0.65   // Fill opacity
    };
}
