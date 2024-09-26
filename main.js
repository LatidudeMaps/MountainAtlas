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
        this.disclaimerPopup = document.getElementById('disclaimer-popup');
    }

    async init() {
        try {
            console.log('App initialization started');
            this.showLoading();
            
            console.log('Loading data...');
            await this.loadData();
            
            console.log('Initializing UI...');
            await this.initializeUI();
            
            console.log('Applying initial filter...');
            this.applyInitialFilter();
            
            console.log('Fitting map to bounds...');
            this.mapManager.fitMapToBounds(this.layerManager.mountainAreasLayer, this.layerManager.markers);
            
            console.log('Setting up map move handler...');
            this.setupMapMoveHandler();
            
            console.log('App initialization complete');
            this.showDisclaimer();
        } catch (error) {
            console.error('Error initializing app:', error);
            this.handleInitializationError(error);
        } finally {
            this.hideLoading();
        }
    }

    setupInfoButton() {
        const infoButton = document.getElementById('info-button');
        const infoPopup = document.getElementById('info-popup');
        const closeInfoPopup = document.getElementById('close-info-popup');

        infoButton.addEventListener('click', () => {
            infoPopup.style.display = 'block';
        });

        closeInfoPopup.addEventListener('click', () => {
            infoPopup.style.display = 'none';
        });

        infoPopup.addEventListener('click', (event) => {
            if (event.target === infoPopup) {
                infoPopup.style.display = 'none';
            }
        });
    }

    showDisclaimer() {
        if (this.disclaimerPopup) {
            this.disclaimerPopup.style.display = 'block';
            const acceptButton = document.getElementById('accept-disclaimer');
            if (acceptButton) {
                acceptButton.addEventListener('click', () => {
                    this.hideDisclaimer();
                });
            }
        } else {
            console.warn('Disclaimer popup element not found');
        }
    }

    hideDisclaimer() {
        if (this.disclaimerPopup) {
            this.disclaimerPopup.style.display = 'none';
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
            throw new Error('Failed to load necessary data: ' + error.message);
        }
    }

    async initializeUI() {
        try {
            console.log('Initializing UI components...');
            this.uiManager = new UIManager(
                this.handleSearch.bind(this),
                this.handleFilterChange.bind(this),
                this.layerManager,
                this.mapManager
            );

            this.controlManager = new ControlManager(this.mapManager, this.layerManager, this.uiManager);
            const unifiedControl = this.controlManager.initControls();
            
            this.uiManager.initializeElements(unifiedControl);
            await this.setupUI();
            console.log('UI setup complete');
        } catch (error) {
            console.error('Error initializing UI:', error);
            throw new Error('Failed to initialize UI: ' + error.message);
        }
    }

    async setupUI() {
        try {
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
        } catch (error) {
            console.error('Error setting up UI:', error);
            throw new Error('Failed to set up UI: ' + error.message);
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

        try {
            this.layerManager.highlightSearchedAreas(searchValue);
            const matchingLayers = this.layerManager.getMatchingLayers(searchValue);

            if (matchingLayers.length > 0) {
                this.handleMatchingLayers(matchingLayers, searchValue);
            } else {
                this.handleNoMatchingLayers(searchValue);
            }
        } catch (error) {
            console.error('Error during search:', error);
            alert('An error occurred while searching. Please try again.');
        }
    }

    resetSearch() {
        this.layerManager.resetHighlight();
        this.layerManager.filterAndDisplayPeaks(this.layerManager.currentHierLevel);
        this.uiManager.updateWikipediaPanel(null);
    }

    setupMapMoveHandler() {
        this.mapManager.map.on('moveend', () => {
            this.layerManager.updateVisibleMarkers();
        });
    }

    handleMatchingLayers(matchingLayers, searchValue) {
        try {
            const bounds = matchingLayers[0].layer.getBounds();
            const center = bounds.getCenter();
            const zoom = this.mapManager.map.getBoundsZoom(bounds);
            this.mapManager.flyTo(center, zoom);

            const matchingMapName = matchingLayers[0].properties.MapName_it || matchingLayers[0].properties.MapName;
            this.layerManager.filterAndDisplayPeaks(null, matchingMapName);
            this.uiManager.updateWikipediaPanel(searchValue);
        } catch (error) {
            console.error('Error handling matching layers:', error);
            alert('An error occurred while processing the search results. Please try again.');
        }
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
        alert(`An error occurred while initializing the application: ${error.message}\nPlease check the console for more details and try refreshing the page.`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded');
    const app = new App();
    app.init().catch(error => {
        console.error('Unhandled error during app initialization:', error);
        alert('An unexpected error occurred. Please check the console for more details and try refreshing the page.');
    });
});