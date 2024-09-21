export class MapManager {
    constructor(mapId) {
        console.log('MapManager constructor called');
        this.map = this.initMap(mapId);
        this.baseMaps = this.initBaseMaps();
        this.initialBounds = null;
        this.activeBaseMap = "Dark Positron";
    }

    initMap(mapId) {
        console.log('Initializing map...');
        const map = L.map(mapId, {
            zoomAnimation: true,
            zoomSnap: 0.25,
            zoomDelta: 0.25,
            wheelDebounceTime: 40,
            wheelPxPerZoomLevel: 80,
            fadeAnimation: true,
        });

        this.addResetViewControl(map);

        console.log('Map initialized');
        return map;
    }

    initBaseMaps() {
        console.log('Initializing base maps');
        const baseMaps = {
            "Dark Positron": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }),
            "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }),
            "Esri World Imagery": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                maxZoom: 18
            })
        };

        // Add the default base map
        baseMaps["Dark Positron"].addTo(this.map);

        console.log('Base maps initialized');
        return baseMaps;
    }

    setInitialExtent(mountainAreasLayer) {
        console.log('Setting initial extent');
        if (!mountainAreasLayer) {
            console.error('Mountain areas layer is undefined');
            return;
        }
        const bounds = mountainAreasLayer.getBounds();
        if (!bounds.isValid()) {
            console.error('Invalid bounds for mountain areas layer');
            return;
        }
        const center = bounds.getCenter();
        
        // Set the initial view based on the mountain areas layer
        this.map.setView(center, 5);
        
        // Set the initial bounds
        this.initialBounds = this.map.getBounds();
        
        // Set max bounds (with some padding)
        const maxBounds = this.initialBounds.pad(0.1);
        this.map.setMaxBounds(maxBounds);
        
        console.log('Initial extent set');
    }

    addResetViewControl(map) {
        const ResetViewControl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                const button = L.DomUtil.create('a', '', container);
                button.innerHTML = '&#8634;';
                button.href = '#';
                button.title = 'Reset View';
                button.style.fontSize = '22px';
                button.style.lineHeight = '30px';
                
                L.DomEvent.on(button, 'click', (e) => {
                    L.DomEvent.preventDefault(e);
                    if (this.initialBounds) {
                        map.fitBounds(this.initialBounds);
                    }
                });

                return container;
            }
        });

        map.addControl(new ResetViewControl());
    }

    fitMapToBounds(mountainAreasLayer, markers) {
        console.log('Fitting map to bounds...');
        if (!this.initialBounds) {
            this.setInitialExtent(mountainAreasLayer);
        }
        if (this.initialBounds) {
            this.map.fitBounds(this.initialBounds);
            console.log('Map fitted to bounds');
        } else {
            console.error('Unable to fit map to bounds: initialBounds is null');
        }
    }

    flyTo(center, zoom) {
        if (this.map.getCenter()) {
            this.map.flyTo(center, zoom, {
                duration: 1.5,
                easeLinearity: 0.25
            });
        } else {
            console.warn('Map not ready, setting view instead of flying');
            this.map.setView(center, zoom);
        }
    }
}