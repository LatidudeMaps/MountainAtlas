export class MapManager {
    constructor(mapId) {
        console.log('MapManager constructor called');
        this.map = null;
        this.mapId = mapId;
        this.baseMaps = null;
        this.initialBounds = null;
        this.activeBaseMap = "Dark Positron";
    }

    initMap() {
        console.log('Initializing map...');
        this.map = L.map(this.mapId, {
            zoomAnimation: true,
            preferCanvas: true,
            zoomControl: false  // We'll add zoom control manually
        });

        // Set an initial view to avoid the "Set map center and zoom first" error
        this.map.setView([0, 0], 2);

        // Add zoom control
        L.control.zoom({ position: 'topright' }).addTo(this.map);

        // Add reset view control
        this.addResetViewControl();

        this.baseMaps = this.initBaseMaps();
        console.log('Map initialized');
    }

    addResetViewControl() {
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
                    this.resetView();
                });

                return container;
            }
        });

        new ResetViewControl().addTo(this.map);
    }

    isMapReady() {
        return this.map !== null && typeof this.map.getCenter === 'function';
    }

    initBaseMaps() {
        console.log('Initializing base maps');
        const baseMaps = {
            "Dark Positron": this.createTileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
            }),
            "OpenStreetMap": this.createTileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }),
            "Esri World Imagery": this.createTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            })
        };

        baseMaps["Dark Positron"].addTo(this.map);
        console.log('Base maps initialized');
        return baseMaps;
    }

    createTileLayer(url, options) {
        return L.tileLayer(url, {
            detectRetina: true,
            tileSize: 512,
            zoomOffset: -1,
            updateWhenZooming: false,
            keepBuffer: 4,
            ...options
        });
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
        
        this.map.setView(center, 6);
        this.initialBounds = this.map.getBounds();
        
        const maxBounds = this.initialBounds.pad(0.1);
        this.map.setMaxBounds(maxBounds);
        
        console.log('Initial extent set');
    }

    resetView() {
        if (this.initialBounds) {
            this.map.fitBounds(this.initialBounds);
        } else {
            console.warn('Unable to reset view: initialBounds is not set');
        }
    }

    fitMapToBounds(mountainAreasLayer, markers) {
        console.log('Fitting map to bounds...');
        if (!this.initialBounds) {
            this.setInitialExtent(mountainAreasLayer);
        }
        this.resetView();
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

    changeBaseMap(newBaseMapName) {
        if (this.baseMaps[newBaseMapName]) {
            this.map.removeLayer(this.baseMaps[this.activeBaseMap]);
            this.map.addLayer(this.baseMaps[newBaseMapName]);
            this.activeBaseMap = newBaseMapName;
        } else {
            console.warn(`Base map "${newBaseMapName}" not found`);
        }
    }

    getCenter() {
        return this.map.getCenter();
    }

    getZoom() {
        return this.map.getZoom();
    }

    getBounds() {
        return this.map.getBounds();
    }
}