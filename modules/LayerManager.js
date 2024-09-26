export class LayerManager {
    constructor(map) {
        this.map = map;
        this.mountainAreasLayer = this.initMountainAreasLayer();
        this.markers = this.initMarkers();
        this.allMountainAreas = null;
        this.allOsmPeaks = null;
        this.filteredMountainAreas = [];
        this.currentHierLevel = null;
        this.mountainAreaNameMap = new Map();
        this.visiblePeaks = [];
    }

    initMountainAreasLayer() {
        console.log('Initializing mountain areas layer');
        return L.geoJSON(null, {
            style: this.defaultPolygonStyle,
            onEachFeature: this.onEachMountainArea.bind(this)
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

    onEachMountainArea(feature, layer) {
        const mapName = feature.properties.MapName_it || feature.properties.MapName;
        const popupContent = `
            <b>${mapName || 'Unnamed Area'}</b><br>
            <a href="${feature.properties.wiki_url_it}" target="_blank">Wikipedia (IT)</a><br>
            <a href="${feature.properties.wiki_url_en}" target="_blank">Wikipedia (EN)</a>
        `;
        layer.bindPopup(popupContent);
    }

    setMountainAreasData(data) {
        console.log('Setting mountain areas data');
        this.allMountainAreas = data;
        this.mountainAreasLayer.clearLayers();
        this.mountainAreasLayer.addData(data);
        
        // Create a map of MapName to MapName_it
        this.mountainAreaNameMap.clear();
        data.features.forEach(feature => {
            const mapName = feature.properties?.MapName;
            const mapNameIt = feature.properties?.MapName_it;
            if (mapName && mapNameIt) {
                this.mountainAreaNameMap.set(mapName.toLowerCase(), mapNameIt);
            }
        });
        console.log('Mountain area name map created, size:', this.mountainAreaNameMap.size);
        
        console.log('Mountain areas data added to layer');
    }

    setOsmPeaksData(data) {
        console.log('Setting OSM peaks data');
        this.allOsmPeaks = data;
    }

    getAllMountainAreaNames() {
        if (!this.allMountainAreas) {
            console.warn('No mountain areas data available');
            return [];
        }
        const names = this.allMountainAreas.features.map(feature => 
            feature.properties.MapName_it || feature.properties.MapName
        ).filter(name => name); // Remove any undefined names
        console.log('Number of mountain area names:', names.length);
        return names;
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
            const mapName = layer.feature?.properties?.MapName_it || layer.feature?.properties?.MapName;
            const isMatch = mapName && mapName.trim().toLowerCase().includes(searchValue.toLowerCase());
            layer.setStyle(isMatch ? this.highlightStyle() : this.defaultPolygonStyle());
        });
        
        if (searchValue) {
            this.filterAndDisplayPeaks(null, searchValue);
        }
    }

    highlightStyle() {
        return {
            color: 'yellow',
            weight: 4,
            opacity: 1,
            fillOpacity: 0.65
        };
    }

    getMatchingLayers(searchValue) {
        if (!searchValue) return [];

        console.log('Getting matching layers for:', searchValue);
        const matchingLayers = [];

        this.mountainAreasLayer.eachLayer(layer => {
            const mapName = layer.feature?.properties?.MapName_it || layer.feature?.properties?.MapName;
            if (mapName && mapName.trim().toLowerCase().includes(searchValue.toLowerCase())) {
                matchingLayers.push({
                    layer: layer,
                    properties: layer.feature.properties
                });
            }
        });
        console.log('Matching layers found:', matchingLayers.length);
        return matchingLayers;
    }

    filterMountainAreas(selectedValue) {
        this.currentHierLevel = selectedValue;
        this.mountainAreasLayer.clearLayers();
        this.filteredMountainAreas = this.allMountainAreas.features.filter(feature => 
            String(feature.properties.Hier_lvl).trim() === selectedValue
        );
        
        this.mountainAreasLayer.addData({
            type: "FeatureCollection",
            features: this.filteredMountainAreas
        });
    }

    getCurrentHierLevelMountainAreaNames() {
        return this.filteredMountainAreas
            .map(feature => feature.properties.MapName_it || feature.properties.MapName)
            .filter(name => name); // Remove any undefined names
    }

    filterAndDisplayPeaks(hierLvl, mapName = null) {
        console.log('Filtering and displaying peaks:', hierLvl, mapName);
        this.markers.clearLayers();
        this.visiblePeaks = this.filterPeaks(hierLvl, mapName);
        this.updateVisibleMarkers();
    }

    filterPeaks(hierLvl, mapName) {
        console.log('Filtering peaks with:', { hierLvl, mapName });
        let filteredPeaks;
        if (mapName) {
            const lowercaseMapName = mapName.toLowerCase();
            filteredPeaks = this.allOsmPeaks.filter(feature => {
                const featureMapName = feature.properties?.MapName?.toLowerCase();
                const featureMapNameIt = this.mountainAreaNameMap.get(featureMapName) || featureMapName;
                return featureMapName === lowercaseMapName || featureMapNameIt === lowercaseMapName;
            });
        } else {
            filteredPeaks = hierLvl === "all" 
                ? this.allOsmPeaks.filter(feature => feature.properties?.Hier_lvl === "4")
                : this.allOsmPeaks.filter(feature => String(feature.properties?.Hier_lvl || "").trim() === hierLvl);
        }
        console.log('Filtered peaks:', filteredPeaks.length);
        return filteredPeaks;
    }

    addPeaksToMarkers(filteredPeaks) {
        console.log('Adding filtered peaks to markers:', filteredPeaks.length);
        L.geoJSON(filteredPeaks, {
            pointToLayer: this.createMarker.bind(this)
        }).addTo(this.markers);
    }

    getVisibleMountainAreaNames() {
        const visibleNames = [];
        const mapBounds = this.map.getBounds();
        this.mountainAreasLayer.eachLayer(layer => {
            if (mapBounds.intersects(layer.getBounds())) {
                visibleNames.push(layer.feature.properties.MapName);
            }
        });
        return visibleNames;
    }

    updateVisibleMarkers() {
        const bounds = this.map.getBounds();
        const visiblePeaks = this.visiblePeaks.filter(feature => 
            bounds.contains(L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]))
        );
        
        console.log('Updating visible markers:', visiblePeaks.length);
        
        this.markers.clearLayers();
        L.geoJSON(visiblePeaks, {
            pointToLayer: this.createMarker.bind(this)
        }).addTo(this.markers);
    }

    createMarker(feature, latlng) {
        const marker = L.marker(latlng);
        const name = feature.properties?.name || "Unnamed Peak";
        const elevation = feature.properties?.elevation || "Unknown";
        
        // Try to get MapName_it from the mountainAreaNameMap, fallback to MapName
        const mapName = feature.properties?.MapName || "Unknown Area";
        const mapNameIt = this.mountainAreaNameMap.get(mapName.toLowerCase()) || mapName;
        
        console.log('Creating marker for:', { name, mapName, mapNameIt });

        const popupContent = `
            <b>Name:</b> ${name}<br>
            <b>Elevation:</b> ${elevation} m<br>
            <b>Belongs to:</b> ${mapNameIt}
        `;

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

    resetHighlight() {
        this.mountainAreasLayer.eachLayer(layer => {
            layer.setStyle(this.defaultPolygonStyle());
        });
        this.filterAndDisplayPeaks(this.currentHierLevel);
    }
}