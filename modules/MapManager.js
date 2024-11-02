export class MapManager {
    constructor(mapId) {
        console.log('MapManager constructor called');
        this.map = this.initMap(mapId);
        this.baseMaps = this.initBaseMaps();
        this.initialBounds = null;
        this.activeBaseMap = "Dark Positron";
        this.uiManager = null;
        this.setupMapEventListeners();
        this.setupResponsiveControls();
    }

    initMap(mapId) {
        console.log('Initializing map...');
        const map = L.map(mapId, {
            zoomAnimation: true,
            preferCanvas: true,
            zoomControl: true,
            maxBoundsViscosity: 1.0,
            minZoom: 6,
        });
    
        this.addResetViewControl(map);
        this.addLogoControl(map);  // Add this line
        console.log('Map initialized');
        return map;
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

    setupMapEventListeners() {
        this.map.on('moveend', () => {
            if (this.uiManager) {
                this.uiManager.updateHighestPeaksPanel();
            }
        });
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager;
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
        
        this.map.setView(center, 6, { animate: false });
        this.initialBounds = this.map.getBounds();
        
        // Set max bounds with some padding
        this.maxBounds = this.initialBounds.pad(0.1);
        this.map.setMaxBounds(this.maxBounds);
        
        console.log('Initial extent and max bounds set');

        // Update the highest peaks panel after a short delay to ensure the map is fully initialized
        setTimeout(() => {
            if (this.uiManager) {
                this.uiManager.updateHighestPeaksPanel();
            }
        }, 100);

        // Also update on subsequent moveend events
        this.map.on('moveend', () => {
            if (this.uiManager) {
                this.uiManager.updateHighestPeaksPanel();
            }
        });
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

    getCenter() {
        return this.map.getCenter();
    }

    getZoom() {
        return this.map.getZoom();
    }

    getBounds() {
        return this.map.getBounds();
    }

    setupResponsiveControls() {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 768;
            if (this.map) {
                if (isMobile) {
                    this.map.removeControl(this.map.zoomControl);
                } else {
                    this.map.addControl(this.map.zoomControl);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Call once to set initial state
    }

    invalidateMapSize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }

    addLogoControl(map) {
        const LogoControl = L.Control.extend({
            options: {
                position: 'bottomleft'
            },
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'leaflet-control logo-clean');
                container.innerHTML = `
                    <a href="https://latitudemaps.github.io" target="_blank">
                        <img src="https://latidudemaps.github.io/MountainAtlas/images/logo_light_512px.png" 
                             alt="Latidude Maps Logo">
                    </a>`;
                return container;
            }
        });
    
        map.addControl(new LogoControl());
    }
}