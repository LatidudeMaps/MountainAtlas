import { MapManager } from './modules/MapManager.js';
import { LayerManager } from './modules/LayerManager.js';
import { ControlManager } from './modules/ControlManager.js';
import { DataLoader } from './modules/DataLoader.js';
import { UIManager } from './modules/UIManager.js';
import { debounce } from './utils/helpers.js';

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
        this.mapInitialized = false;
        this.setupInfoButton();
        
        // Debounce the resize handler
        this.debouncedResize = debounce(this.handleResize.bind(this), 250);
    }

    async init() {
        try {
            console.log('App initialization started');
            this.showLoading();
            await this.loadData();
            this.initializeUI();
            await this.showDisclaimer();
            this.initializeMap();
            this.applyInitialFilter();
            this.setupMapEventListeners();
            
            // Add a short delay before updating the highest peaks panel
            setTimeout(() => {
                this.uiManager.updateHighestPeaksPanel();
                this.hideLoading();
            }, 500); // 500ms delay, adjust if needed

            // Add window resize event listener
            window.addEventListener('resize', this.debouncedResize);

            console.log('App initialization complete');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.handleInitializationError(error);
        }
    }

    handleResize() {
        console.log('Window resized, updating components');
        if (this.mapManager) this.mapManager.handleResize();
        if (this.layerManager) this.layerManager.handleResize();
        if (this.uiManager) this.uiManager.handleResize();
        // Remove the call to controlManager.handleResize()
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
        
        console.log('UI initialization complete');
    }

    showDisclaimer() {
        return new Promise((resolve) => {
            if (this.disclaimerPopup) {
                this.disclaimerPopup.style.display = 'block';
                const acceptButton = document.getElementById('accept-disclaimer');
                if (acceptButton) {
                    acceptButton.addEventListener('click', () => {
                        this.hideDisclaimer();
                        resolve();
                    });
                }
            } else {
                console.warn('Disclaimer popup element not found');
                resolve();
            }
        });
    }

    hideDisclaimer() {
        if (this.disclaimerPopup) {
            this.disclaimerPopup.style.display = 'none';
        }
    }

    initializeMap() {
        console.log('Initializing map');
        this.mapManager.setInitialExtent(this.layerManager.mountainAreasLayer);
        this.mapInitialized = true;
        console.log('Map initialized');
    }

    applyInitialFilter() {
        console.log('Applying initial filter');
        const initialHierLevel = "4";
        this.handleFilterChange(initialHierLevel);
        this.uiManager.updateHierLevelSlider(
            Math.min(...this.dataLoader.getUniqueHierLevels()),
            Math.max(...this.dataLoader.getUniqueHierLevels()),
            parseInt(initialHierLevel)
        );
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

    handleFilterChange(selectedValue) {
        console.log('Filter change initiated with value:', selectedValue);
        if (!this.dataLoader.isDataLoaded()) {
            console.log('Data not fully loaded, skipping filter change');
            return;
        }

        this.layerManager.filterMountainAreas(selectedValue);
        this.layerManager.filterAndDisplayPeaks(selectedValue);
        this.uiManager.updateSearchSuggestions();
        this.uiManager.updateHighestPeaksPanel();
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

        // Ensure the Wikipedia panel is updated
        this.uiManager.updateWikipediaPanel(searchValue);
    }

    handleMatchingLayers(matchingLayers, searchValue) {
        console.log('Handling matching layers:', matchingLayers.map(l => l.properties.MapName));
        const layer = matchingLayers[0].layer;
        const bounds = layer.getBounds();
        const center = bounds.getCenter();
        const zoom = this.mapManager.map.getBoundsZoom(bounds);
        console.log('Flying to:', center, 'with zoom:', zoom);
        this.mapManager.flyTo(center, zoom);

        this.layerManager.filterAndDisplayPeaks(null, matchingLayers[0].properties.MapName);
        this.uiManager.updateHighestPeaksPanel();
        
        // Move this line to handleSearch method
        // this.uiManager.updateWikipediaPanel(searchValue);
    }

    resetSearch() {
        this.layerManager.resetHighlight();
        this.uiManager.updateHighestPeaksPanel();
        this.uiManager.updateWikipediaPanel(null);
    }

    setupMapEventListeners() {
        this.mapManager.map.on('moveend', () => {
            if (this.mapInitialized) {
                this.uiManager.updateHighestPeaksPanel();
            }
        });

        // Add this new event listener
        this.mapManager.map.on('layeradd', () => {
            if (this.mapInitialized) {
                this.uiManager.updateHighestPeaksPanel();
            }
        });
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

    handleInitializationError(error) {
        console.error('Failed to initialize the application:', error);
        alert('An error occurred while initializing the application. Please try refreshing the page.');
        // Here you could also add code to display a user-friendly error message on the page
    }

    setupInfoButton() {
        const infoButton = document.getElementById('info-button');
        const infoPopup = document.getElementById('info-popup');
        const closeInfoPopup = document.getElementById('close-info-popup');

        if (infoButton && infoPopup && closeInfoPopup) {
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
        } else {
            console.error('Info button, popup, or close button not found in the DOM');
        }
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

    handleNoMatchingLayers(searchValue) {
        console.log('No matching polygons found for:', searchValue);
        alert('No matching polygons found.');
        this.uiManager.updateWikipediaPanel(null);
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