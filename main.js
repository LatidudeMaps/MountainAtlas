import { MapManager } from './modules/MapManager.js';
import { LayerManager } from './modules/LayerManager.js';
import { ControlManager } from './modules/ControlManager.js';
import { DataLoader } from './modules/DataLoader.js';
import { UIManager } from './modules/UIManager.js';

class App {
    constructor() {
        this.mapManager = new MapManager('map');
        this.layerManager = new LayerManager(this.mapManager.map);
        this.controlManager = new ControlManager(this.mapManager.map, this.layerManager);
        this.dataLoader = new DataLoader();
        this.uiManager = new UIManager(this.handleSearch.bind(this), this.handleFilterChange.bind(this));
    }

    async init() {
        try {
            const mountainAreasData = await this.dataLoader.loadMountainAreas();
            const osmPeaksData = await this.dataLoader.loadOsmPeaks();
            
            this.layerManager.setMountainAreasData(mountainAreasData);
            this.layerManager.setOsmPeaksData(osmPeaksData);
            
            this.setupUI();
            this.applyInitialFilter();
            this.mapManager.fitMapToBounds(this.layerManager.mountainAreasLayer, this.layerManager.markers);
            
            setTimeout(() => this.controlManager.addOpacitySlider(), 100);
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    setupUI() {
        const uniqueHierLevels = this.dataLoader.getUniqueHierLevels();
        this.uiManager.updateHierLevelSlider(
            Math.min(...uniqueHierLevels),
            Math.max(...uniqueHierLevels),
            4  // Default value
        );
        this.uiManager.setupSearchListeners();
        this.uiManager.setupFilterListeners();
    }

    applyInitialFilter() {
        const initialHierLevel = "4";
        this.handleFilterChange(initialHierLevel);
    }

    handleSearch(searchValue) {
        this.layerManager.highlightSearchedAreas(searchValue);
        const matchingLayers = this.layerManager.getMatchingLayers(searchValue);

        if (matchingLayers.length > 0) {
            const bounds = matchingLayers[0].getBounds();
            const center = bounds.getCenter();
            const zoom = this.mapManager.map.getBoundsZoom(bounds);
            this.mapManager.flyTo(center, zoom);

            const matchingMapName = matchingLayers[0].feature.properties.MapName;
            this.layerManager.filterAndDisplayPeaks(null, matchingMapName);
        } else {
            alert('No matching polygons found.');
        }
    }

    handleFilterChange(selectedValue) {
        if (!this.dataLoader.mountainAreasLoaded || !this.dataLoader.osmPeaksLoaded) return;

        this.layerManager.filterMountainAreas(selectedValue);
        this.layerManager.filterAndDisplayPeaks(selectedValue);
        this.uiManager.clearSearch();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});