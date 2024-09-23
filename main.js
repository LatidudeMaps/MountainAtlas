import { MapManager } from './modules/MapManager.js';
import { LayerManager } from './modules/LayerManager.js';
import { ControlManager } from './modules/ControlManager.js';
import { DataLoader } from './modules/DataLoader.js';
import { UIManager } from './modules/UIManager.js';

class App {
    constructor() {
        console.log('App constructor called');
        this.mapManager = new MapManager('map');
        this.layerManager = new LayerManager(this.mapManager.map);
        this.dataLoader = new DataLoader();
        this.uiManager = null;
        this.controlManager = null;
    }

    async init() {
        console.log('App init started');
        try {
            await this.loadData();
            this.initializeUI();
            this.applyInitialFilter();
            this.mapManager.fitMapToBounds(this.layerManager.mountainAreasLayer, this.layerManager.markers);
            console.log('App initialization complete');
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    async loadData() {
        const [mountainAreasData, osmPeaksData] = await Promise.all([
            this.dataLoader.loadMountainAreas(),
            this.dataLoader.loadOsmPeaks()
        ]);
        
        this.layerManager.setMountainAreasData(mountainAreasData);
        this.layerManager.setOsmPeaksData(osmPeaksData);
        
        console.log('Data loaded and set in LayerManager');
    }

    initializeUI() {
        this.uiManager = new UIManager(
            this.handleSearch.bind(this),
            this.handleFilterChange.bind(this),
            this.layerManager,
            this.mapManager
        );

        this.controlManager = new ControlManager(this.mapManager, this.layerManager, this.uiManager);
        const unifiedControl = this.controlManager.initControls();
        
        this.uiManager.initializeElements(unifiedControl);
        this.setupUI();
        console.log('UI setup complete');
    }

    setupUI() {
        const uniqueHierLevels = this.dataLoader.getUniqueHierLevels();
        console.log('Unique hierarchy levels:', uniqueHierLevels);
        this.uiManager.updateHierLevelSlider(
            Math.min(...uniqueHierLevels),
            Math.max(...uniqueHierLevels),
            4  // Default value
        );
        this.uiManager.setupSearchListeners();
        // Remove the call to setupFilterListeners as it no longer exists
    }

    applyInitialFilter() {
        console.log('Applying initial filter');
        const initialHierLevel = "4";
        this.handleFilterChange(initialHierLevel);
    }

    handleSearch(searchValue) {
        console.log('Search initiated with value:', searchValue);
        
        // If searchValue is null, it means the clear button was pressed
        if (searchValue === null) {
            // Reset the search without changing the map view
            this.layerManager.resetHighlight();
            this.uiManager.updateWikipediaPanel(null);
            return;
        }

        this.layerManager.highlightSearchedAreas(searchValue);
        const matchingLayers = this.layerManager.getMatchingLayers(searchValue);

        if (matchingLayers.length > 0) {
            const bounds = matchingLayers[0].layer.getBounds();
            const center = bounds.getCenter();
            const zoom = this.mapManager.map.getBoundsZoom(bounds);
            this.mapManager.flyTo(center, zoom);

            const matchingMapName = matchingLayers[0].properties.MapName;
            this.layerManager.filterAndDisplayPeaks(null, matchingMapName);
            this.uiManager.updateWikipediaPanel(searchValue);
        } else {
            console.log('No matching polygons found');
            alert('No matching polygons found.');
            this.uiManager.updateWikipediaPanel(null);
        }
    }

    handleFilterChange(selectedValue) {
        console.log('Filter change initiated with value:', selectedValue);
        if (!this.dataLoader.mountainAreasLoaded || !this.dataLoader.osmPeaksLoaded) {
            console.log('Data not fully loaded, skipping filter change');
            return;
        }

        this.layerManager.filterMountainAreas(selectedValue);
        this.layerManager.filterAndDisplayPeaks(selectedValue);
        // Update search suggestions after filter change
        this.uiManager.updateSearchSuggestions();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded');
    const app = new App();
    app.init();
});