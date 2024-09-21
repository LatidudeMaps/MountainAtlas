export class LayerManager {
    constructor(map) {
        this.map = map;
        this.mountainAreasLayer = this.initMountainAreasLayer();
        this.markers = this.initMarkers();
        this.allOsmPeaks = [];
        this.filteredMountainAreas = [];
    }

    initMountainAreasLayer() {
        return L.geoJSON(null, {
            style: this.defaultPolygonStyle,
            onEachFeature: (feature, layer) => {
                layer.bindPopup(feature.properties.MapName);
            }
        }).addTo(this.map);
    }

    initMarkers() {
        return L.markerClusterGroup({
            spiderfyOnMaxZoom: false,
            disableClusteringAtZoom: 18,
            zoomToBoundsOnClick: true,
            showCoverageOnHover: false,
            chunkedLoading: true,
            chunkInterval: 200,
            chunkDelay: 50
        }).addTo(this.map);
    }

    defaultPolygonStyle() {
        return {
            color: "#ff7800",
            weight: 2,
            opacity: 1,
            fillColor: "#ffcc66",
            fillOpacity: 0.65
        };
    }

    highlightSearchedAreas(searchValue) {
        this.mountainAreasLayer.eachLayer(layer => {
            if (layer.feature?.properties?.MapName.trim().toLowerCase().includes(searchValue.toLowerCase())) {
                layer.setStyle({
                    color: 'yellow',
                    weight: 4,
                    opacity: 1,
                    fillOpacity: 0.65
                });
            } else {
                layer.setStyle(this.defaultPolygonStyle());
            }
        });
    }

    getMatchingLayers(searchValue) {
        const matchingLayers = [];
        this.mountainAreasLayer.eachLayer(layer => {
            if (layer.feature?.properties?.MapName.trim().toLowerCase().includes(searchValue.toLowerCase())) {
                matchingLayers.push(layer);
            }
        });
        return matchingLayers;
    }

    filterMountainAreas(selectedValue) {
        this.mountainAreasLayer.clearLayers();
        this.filteredMountainAreas = this.allMountainAreas.features.filter(feature => 
            String(feature.properties.Hier_lvl).trim() === selectedValue
        );
        
        this.mountainAreasLayer.addData({
            type: "FeatureCollection",
            features: this.filteredMountainAreas
        });
    }

    filterAndDisplayPeaks(hierLvl, mapName = null) {
        this.markers.clearLayers();
        let filteredPeaks;

        if (mapName) {
            filteredPeaks = this.allOsmPeaks.filter(feature => 
                feature.properties.MapName.trim().toLowerCase() === mapName.toLowerCase()
            );
        } else {
            filteredPeaks = hierLvl === "all" 
                ? this.allOsmPeaks.filter(feature => feature.properties.Hier_lvl === "4")
                : this.allOsmPeaks.filter(feature => String(feature.properties.Hier_lvl).trim() === hierLvl);
        }

        L.geoJSON(filteredPeaks, {
            pointToLayer: this.createMarker.bind(this)
        }).addTo(this.markers);
    }

    createMarker(feature, latlng) {
        const marker = L.marker(latlng);
        const name = feature.properties.name || "Unnamed Peak";
        const elevation = feature.properties.elevation || "Unknown";
        const popupContent = `<b>Name:</b> ${name}<br><b>Elevation:</b> ${elevation} m<br><b>MapName:</b> ${feature.properties.MapName}`;

        marker.bindPopup(popupContent)
            .bindTooltip(name, {
                permanent: true,
                direction: 'top',
                offset: [-15, -3],
                className: 'dark-tooltip'
            })
            .on('click', () => marker.openPopup())
            .on('popupopen', () => marker.closeTooltip())
            .on('popupclose', () => marker.openTooltip());

        return marker;
    }

    setMountainAreasOpacity(opacity) {
        console.log(`Setting mountain areas opacity to ${opacity}`);
        this.mountainAreasLayer.setStyle({ fillOpacity: opacity });
    }
}