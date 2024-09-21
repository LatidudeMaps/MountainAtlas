export class LayerManager {
    constructor(map) {
        this.map = map;
        this.mountainAreasLayer = this.initMountainAreasLayer();
        this.markers = this.initMarkers();
        this.allMountainAreas = null;
        this.allOsmPeaks = null;
        this.filteredMountainAreas = [];
    }

    initMountainAreasLayer() {
        console.log('Initializing mountain areas layer');
        return L.geoJSON(null, {
            style: this.defaultPolygonStyle,
            onEachFeature: (feature, layer) => {
                layer.bindPopup(feature.properties.MapName);
            }
        }).addTo(this.map);
    }

    initMarkers() {
        console.log('Initializing markers');
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

    setMountainAreasData(data) {
        console.log('Setting mountain areas data');
        this.allMountainAreas = data;
        this.mountainAreasLayer.clearLayers();
        this.mountainAreasLayer.addData(data);
        console.log('Mountain areas data added to layer');
    }

    getAllMountainAreaNames() {
        console.log('Getting all mountain area names');
        if (!this.allMountainAreas) {
            console.warn('No mountain areas data available');
            return [];
        }
        const names = this.allMountainAreas.features.map(feature => feature.properties.MapName);
        console.log('Number of mountain area names:', names.length);
        return names;
    }

    setOsmPeaksData(data) {
        console.log('Setting OSM peaks data');
        this.allOsmPeaks = data;
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
        console.log('Highlighting searched areas:', searchValue);
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
        console.log('Getting matching layers for:', searchValue);
        const matchingLayers = [];
        this.mountainAreasLayer.eachLayer(layer => {
            if (layer.feature?.properties?.MapName.trim().toLowerCase().includes(searchValue.toLowerCase())) {
                matchingLayers.push(layer);
            }
        });
        console.log('Matching layers found:', matchingLayers.length);
        return matchingLayers;
    }

    filterMountainAreas(selectedValue) {
        console.log('Filtering mountain areas for level:', selectedValue);
        this.mountainAreasLayer.clearLayers();
        this.filteredMountainAreas = this.allMountainAreas.features.filter(feature => 
            String(feature.properties.Hier_lvl).trim() === selectedValue
        );
        
        this.mountainAreasLayer.addData({
            type: "FeatureCollection",
            features: this.filteredMountainAreas
        });
        console.log('Filtered mountain areas added to layer');
    }

    filterAndDisplayPeaks(hierLvl, mapName = null) {
        console.log('Filtering and displaying peaks:', hierLvl, mapName);
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
        console.log('Filtered peaks added to markers');
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