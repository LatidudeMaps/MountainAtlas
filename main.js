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
        this.loadingIndicator = document.getElementById('loading-indicator');
    }

    async init() {
        try {
            console.log('App initialization started');
            this.showLoading();
            await this.loadData();
            this.initializeUI();
            this.applyInitialFilter();
            this.mapManager.fitMapToBounds(this.layerManager.mountainAreasLayer, this.layerManager.markers);
            console.log('App initialization complete');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.handleInitializationError(error);
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'block';
        } else {
            console.warn('Loading indicator element not found');
        }
    }

    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
    }

    async loadData() {
        console.log('Loading data...');
        try {
            const [mountainAreasData, osmPeaksData] = await Promise.all([
                this.dataLoader.loadMountainAreas(),
                this.dataLoader.loadOsmPeaks()
            ]);
            
            this.layerManager.setMountainAreasData(mountainAreasData);
            this.layerManager.setOsmPeaksData(osmPeaksData);
            
            console.log('Data loaded and set in LayerManager');
        } catch (error) {
            console.error('Error loading data:', error);
            throw new Error('Failed to load necessary data');
        }
    }

    initializeUI() {
        console.log('Initializing UI...');
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
        
        if (uniqueHierLevels.length > 0) {
            this.uiManager.updateHierLevelSlider(
                Math.min(...uniqueHierLevels),
                Math.max(...uniqueHierLevels),
                4  // Default value
            );
        } else {
            console.warn('No hierarchy levels found');
        }
    }

    applyInitialFilter() {
        console.log('Applying initial filter');
        const initialHierLevel = "4";
        this.handleFilterChange(initialHierLevel);
    }

    handleSearch(searchValue) {
        console.log('Search initiated with value:', searchValue);
        
        if (searchValue === null) {
            this.resetSearch();
            return;
        }

        this.layerManager.highlightSearchedAreas(searchValue);
        const matchingLayers = this.layerManager.getMatchingLayers(searchValue);

        if (matchingLayers.length > 0) {
            this.handleMatchingLayers(matchingLayers, searchValue);
        } else {
            this.handleNoMatchingLayers(searchValue);
        }
    }

    resetSearch() {
        this.layerManager.resetHighlight();
        this.uiManager.updateWikipediaPanel(null);
    }

    handleMatchingLayers(matchingLayers, searchValue) {
        const bounds = matchingLayers[0].layer.getBounds();
        const center = bounds.getCenter();
        const zoom = this.mapManager.map.getBoundsZoom(bounds);
        this.mapManager.flyTo(center, zoom);

        const matchingMapName = matchingLayers[0].properties.MapName;
        this.layerManager.filterAndDisplayPeaks(null, matchingMapName);
        this.uiManager.updateWikipediaPanel(searchValue);
    }

    handleNoMatchingLayers(searchValue) {
        console.log('No matching polygons found for:', searchValue);
        alert('No matching polygons found.');
        this.uiManager.updateWikipediaPanel(null);
    }

    handleFilterChange(selectedValue) {
        console.log('Filter change initiated with value:', selectedValue);
        if (!this.dataLoader.isDataLoaded()) {
            console.log('Data not fully loaded, skipping filter change');
            return;
        }

        this.layerManager.filterMountainAreas(selectedValue);
        this.layerManager.filterAndDisplayPeaks(selectedValue);
        this.uiManager.updateSearchSuggestions();
    }

    handleInitializationError(error) {
        console.error('Failed to initialize the application:', error);
        alert('An error occurred while initializing the application. Please try refreshing the page.');
        // Here you could also add code to display a user-friendly error message on the page
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded');
    const app = new App();
    app.init().catch(error => {
        console.error('Unhandled error during app initialization:', error);
        alert('An unexpected error occurred. Please try refreshing the page.');
    });
});