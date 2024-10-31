export class LayerManager {
    constructor(map) {
        this.map = map;
        this.mountainAreasLayer = this.initMountainAreasLayer();
        this.markers = this.initMarkers();
        this.allMountainAreas = null;
        this.allOsmPeaks = null;
        this.filteredMountainAreas = [];
        this.currentHierLevel = null;
        this.visiblePeaksCache = new Map();
        this.currentOpacity = 1;
        this.uiManager = null;
        this.searchHandler = null; // Add this to store the search handler
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

    setSearchHandler(handler) {
        this.searchHandler = handler;
    }

    onEachMountainArea(feature, layer) {
        const mapName = feature.properties.MapName_it || feature.properties.MapName;
        const popupContent = `
            <b>${mapName || 'Unnamed Area'}</b><br>
            <a href="${feature.properties.wiki_url_it}" target="_blank">Wikipedia (IT)</a><br>
            <a href="${feature.properties.wiki_url_en}" target="_blank">Wikipedia (EN)</a>
        `;
        
        layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            
            // Close any open popups
            this.map.closePopup();
            
            // Get bounds of the clicked polygon
            const bounds = layer.getBounds();
            const currentZoom = this.map.getZoom();
            const boundsZoom = this.map.getBoundsZoom(bounds);
            const targetZoom = Math.max(boundsZoom, currentZoom);
            
            // Fly to the bounds
            this.map.flyToBounds(bounds, {
                padding: [50, 50],
                maxZoom: targetZoom,
                animate: true,
                duration: 0.5
            });
            
            // Trigger the same actions as search
            if (this.searchHandler) {
                this.searchHandler(mapName);
                
                // Also update the search input value
                if (this.uiManager) {
                    const searchInput = document.querySelector('#search-input');
                    if (searchInput) {
                        searchInput.value = mapName;
                    }
                }
            }
            
            // Show popup after flying
            setTimeout(() => {
                layer.openPopup();
            }, 500);
        });
        
        layer.bindPopup(popupContent);
    }

    setMountainAreasData(data) {
        console.log('Setting mountain areas data');
        this.allMountainAreas = data;
        this.mountainAreasLayer.clearLayers();
        this.mountainAreasLayer.addData(data);
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
            fillOpacity: 1
        };
    }

    highlightStyle() {
        return {
            color: 'yellow',
            weight: 4,
            opacity: 1,
            fillOpacity: 0.65
        };
    }

    filterMountainAreas(selectedValue) {
        console.log('Filtering mountain areas with value:', selectedValue);
        this.currentHierLevel = selectedValue;
        this.mountainAreasLayer.clearLayers();
        this.filteredMountainAreas = this.allMountainAreas.features.filter(feature => 
            String(feature.properties.Hier_lvl).trim() === selectedValue
        );
        
        this.mountainAreasLayer.addData({
            type: "FeatureCollection",
            features: this.filteredMountainAreas
        });
        console.log('Filtered mountain areas:', this.filteredMountainAreas.length);
    }

    getMatchingLayers(searchValue) {
        if (!searchValue) return [];

        console.log('Getting matching layers for:', searchValue, 'Current Hier Level:', this.currentHierLevel);
        const matchingLayers = [];

        this.mountainAreasLayer.eachLayer(layer => {
            const mapName = layer.feature?.properties?.MapName_it || layer.feature?.properties?.MapName;
            const layerHierLevel = String(layer.feature?.properties?.Hier_lvl).trim();
            
            if (mapName && layerHierLevel === this.currentHierLevel) {
                if (mapName.trim().toLowerCase() === searchValue.toLowerCase()) {
                    matchingLayers.push({ layer, properties: layer.feature.properties });
                }
            }
        });

        console.log('Matching layers found:', matchingLayers.length);
        return matchingLayers;
    }

    highlightSearchedAreas(searchValue) {
        console.log('Highlighting searched areas:', searchValue);
        this.mountainAreasLayer.eachLayer(layer => {
            const mapName = layer.feature?.properties?.MapName_it || layer.feature?.properties?.MapName;
            const layerHierLevel = String(layer.feature?.properties?.Hier_lvl).trim();
            const isExactMatch = mapName && 
                                 layerHierLevel === this.currentHierLevel &&
                                 mapName.trim().toLowerCase() === searchValue.toLowerCase();
            layer.setStyle(isExactMatch ? this.highlightStyle() : this.defaultPolygonStyle());
        });
    }

    getCurrentHierLevelMountainAreaNames() {
        return this.filteredMountainAreas
            .map(feature => feature.properties.MapName_it || feature.properties.MapName)
            .filter(name => name); // Remove any undefined names
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    filterAndDisplayPeaks(hierLvl, mapName = null) {
        console.log('Filtering and displaying peaks:', hierLvl, mapName);
        this.markers.clearLayers();
        let filteredPeaks = this.filterPeaks(hierLvl, mapName);
        this.addPeaksToMarkers(filteredPeaks);
        this.visiblePeaksCache.clear(); // Clear the cache when filtering
        if (this.uiManager) {
            this.uiManager.updateHighestPeaksPanel();
        }
    }

    addPeaksToMarkers(filteredPeaks) {
        this.markers.clearLayers();
        L.geoJSON(filteredPeaks, {
            pointToLayer: this.createMarker.bind(this)
        }).addTo(this.markers);
        console.log('Filtered peaks added to markers');
    }

    filterPeaks(hierLvl, mapName) {
        if (mapName) {
            return this.allOsmPeaks.filter(feature => {
                const featureMapName = feature.properties.MapName_it || feature.properties.MapName;
                return featureMapName && (
                    featureMapName.trim().toLowerCase() === mapName.toLowerCase() ||
                    (feature.properties.MapName && feature.properties.MapName.trim().toLowerCase() === mapName.toLowerCase())
                );
            });
        } else {
            return hierLvl === "all" 
                ? this.allOsmPeaks.filter(feature => feature.properties.Hier_lvl === "4")
                : this.allOsmPeaks.filter(feature => String(feature.properties.Hier_lvl).trim() === hierLvl);
        }
    }

    addPeaksToMarkers(filteredPeaks) {
        L.geoJSON(filteredPeaks, {
            pointToLayer: this.createMarker.bind(this)
        }).addTo(this.markers);
        console.log('Filtered peaks added to markers');
    }

    createMarker(feature, latlng) {
        const marker = L.marker(latlng);
        const name = feature.properties.name || "Unnamed Peak";
        const elevation = feature.properties.elevation || "Unknown";
        const mapName = feature.properties.MapName_it || feature.properties.MapName || "Unknown Area";
        const popupContent = `<b>Name:</b> ${name}<br><b>Elevation:</b> ${elevation} m<br><b>Belongs to:</b> ${mapName}`;

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
        this.currentOpacity = opacity; // Update the stored opacity value
    }

    getMountainAreasOpacity() {
        return this.currentOpacity;
    }

    resetHighlight() {
        this.mountainAreasLayer.eachLayer(layer => {
            layer.setStyle(this.defaultPolygonStyle());
        });
        this.filterAndDisplayPeaks(this.currentHierLevel);
    }

    getVisiblePeaks() {
        const mapBounds = this.map.getBounds();
        if (!mapBounds.isValid()) {
            return [];
        }
    
        const now = Date.now();
        const cacheKey = mapBounds.toBBoxString() + '-' + this.map.getZoom();
        
        // Use cached result if available and recent
        if (this.visiblePeaksCache.has(cacheKey) && 
            (now - this.lastMapUpdate) < 2000) { // 2 second cache validity
            return this.visiblePeaksCache.get(cacheKey);
        }
    
        // Performance optimization: Use getBounds() from marker cluster if available
        let visiblePeaks = [];
        if (this.markers.getLayers().length > 0) {
            const clusters = this.markers.getClusters(mapBounds);
            visiblePeaks = clusters
                .filter(cluster => mapBounds.contains(cluster.getLatLng()))
                .flatMap(cluster => {
                    // If it's a cluster, get all child markers
                    if (cluster.__parent) {
                        return cluster.getAllChildMarkers().map(marker => marker.feature);
                    }
                    // If it's a single marker
                    return [cluster.feature];
                });
        }
    
        const uniqueVisiblePeaks = this.removeDuplicatePeaks(visiblePeaks);
        
        // Update cache
        this.visiblePeaksCache.set(cacheKey, uniqueVisiblePeaks);
        this.lastMapUpdate = now;
        
        return uniqueVisiblePeaks;
    }

    getHighestPeaks(n = 5) {
        const visiblePeaks = this.getVisiblePeaks();
        if (visiblePeaks.length === 0) {
            console.log('No visible peaks, returning null');
            return null;
        }
        return visiblePeaks
            .sort((a, b) => b.properties.elevation - a.properties.elevation)
            .slice(0, n);
    }

    removeDuplicatePeaks(peaks) {
        const uniquePeaks = new Map();
        peaks.forEach(peak => {
            const key = `${peak.geometry.coordinates[0]},${peak.geometry.coordinates[1]}`;
            if (!uniquePeaks.has(key) || peak.properties.elevation > uniquePeaks.get(key).properties.elevation) {
                uniquePeaks.set(key, peak);
            }
        });
        return Array.from(uniquePeaks.values());
    }

    getUniqueHierLevels() {
        if (!this.allMountainAreas || !this.allMountainAreas.features) return [];
        const hierLevels = this.allMountainAreas.features
            .map(feature => feature.properties.Hier_lvl)
            .filter(level => level !== undefined && level !== null);
        return [...new Set(hierLevels)].sort((a, b) => a - b);
    }
}