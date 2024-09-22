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
        this.controlManager = new ControlManager(this.mapManager, this.layerManager);
        this.dataLoader = new DataLoader();
        this.uiManager = null;
        this.loaderContainer = document.getElementById('loader-container');
    }

    async init() {
        console.log('App init started');
        try {
            await this.loadData();
            await this.setupMapAndControls();
            this.setupUI();
            this.applyInitialFilter();
            await this.mapManager.fitMapToBounds(this.layerManager.mountainAreasLayer, this.layerManager.markers);
            
            // Ensure map is fully rendered before hiding loader
            this.mapManager.map.whenReady(() => {
                setTimeout(() => {
                    this.hideLoader();
                }, 500); // Additional delay to ensure smooth transition
            });
        } catch (error) {
            console.error('Error initializing app:', error);
            this.hideLoader();
        }
    }

    async loadData() {
        const mountainAreasData = await this.dataLoader.loadMountainAreas();
        console.log('Mountain areas data loaded:', mountainAreasData);
        const osmPeaksData = await this.dataLoader.loadOsmPeaks();
        console.log('OSM peaks data loaded:', osmPeaksData);
        
        this.layerManager.setMountainAreasData(mountainAreasData);
        this.layerManager.setOsmPeaksData(osmPeaksData);
        console.log('Data set in LayerManager');
    }

    async setupMapAndControls() {
        const unifiedControl = this.controlManager.initControls();
        console.log('Controls initialized');

        this.uiManager = new UIManager(
            this.handleSearch.bind(this),
            this.handleFilterChange.bind(this),
            this.layerManager
        );
        this.uiManager.initializeElements(unifiedControl);
        console.log('UI setup complete');
    }

    hideLoader() {
        if (this.loaderContainer) {
            this.loaderContainer.style.opacity = '0';
            setTimeout(() => {
                this.loaderContainer.style.display = 'none';
            }, 500); // Wait for the fade-out transition to complete
        }
    }

    setupUI() {
        const uniqueHierLevels = this.dataLoader.getUniqueHierLevels();
        console.log('Unique hierarchy levels:', uniqueHierLevels);
        this.uiManager.updateHierLevelSlider(
            Math.min(...uniqueHierLevels),
            Math.max(...uniqueHierLevels),
            4  // Default value
        );
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
            return;
        }

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
            console.log('No matching polygons found');
            alert('No matching polygons found.');
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