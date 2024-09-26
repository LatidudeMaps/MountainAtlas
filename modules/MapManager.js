export class MapManager {
    constructor(mapId) {
        console.log('MapManager constructor called');
        this.map = null;
        this.baseMaps = null;
        this.initialBounds = null;
        this.activeBaseMap = "Dark Positron";
        this.isInitialized = false;
        this.initMap(mapId);
    }

    initMap(mapId) {
        console.log('Initializing map...');
        this.map = L.map(mapId, {
            zoomAnimation: true,
            preferCanvas: true,
            zoomControl: true
        });

        this.addResetViewControl(this.map);
        this.initBaseMaps();

        // Wait for the map to be loaded
        this.map.whenReady(() => {
            console.log('Map is ready');
            this.isInitialized = true;
            // Set an initial view to ensure the map is properly loaded
            this.map.setView([0, 0], 2);
        });

        console.log('Map initialization started');
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

    isMapReady() {
        return this.isInitialized;
    }

    waitForMap() {
        return new Promise((resolve) => {
            if (this.isInitialized) {
                resolve();
            } else {
                this.map.whenReady(() => {
                    this.isInitialized = true;
                    resolve();
                });
            }
        });
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
                    this.resetView();
                });

                return container;
            }
        });

        map.addControl(new ResetViewControl());
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

    addResponsiveZoomControl() {
        const zoomControl = L.control.zoom({ position: 'topright' });
        zoomControl.addTo(this.map);

        const handleResize = () => {
            const isMobile = window.innerWidth <= 768;
            zoomControl.setPosition(isMobile ? 'bottomright' : 'topright');
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Call once to set initial state
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