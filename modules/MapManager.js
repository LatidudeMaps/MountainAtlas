export class MapManager {
    constructor(mapId) {
        this.map = this.initMap(mapId);
        this.baseMaps = this.initBaseMaps();
        this.initialBounds = null;
        this.activeBaseMap = "Dark Positron";
    }

    initMap(mapId) {
        console.log('Initializing map...');
        const map = L.map(mapId, {
            zoomAnimation: true,
            preferCanvas: true,
            zoomSnap: 0.1,
            zoomDelta: 0.1,
            fadeAnimation: true,
        });

        this.addResetViewControl(map);

        console.log('Map initialized');
        return map;
    }

    initBaseMaps() {
        const createTileLayer = (url, options) => {
            return L.tileLayer(url, {
                ...options,
                className: 'map-tile',
                updateWhenIdle: false,
                updateWhenZooming: false,
                updateInterval: 200,
                keepBuffer: 2,
                maxZoom: 20,
                maxNativeZoom: 18,
                tileSize: 256,
                zoomOffset: 0,
            });
        };

        const baseMaps = {
            "Dark Positron": createTileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
            }),
            "OpenStreetMap": createTileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }),
            "Esri World Imagery": createTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            })
        };

        // Add the default base map
        baseMaps["Dark Positron"].addTo(this.map);

        return baseMaps;
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
        const bounds = L.latLngBounds([]);
        if (mountainAreasLayer.getLayers().length > 0) bounds.extend(mountainAreasLayer.getBounds());
        if (markers.getLayers().length > 0) bounds.extend(markers.getBounds());
        if (bounds.isValid()) {
            this.map.fitBounds(bounds);
            this.initialBounds = bounds;
        } else {
            console.warn('No valid bounds to fit, keeping initial view');
        }
        console.log('Map fitted to bounds');
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