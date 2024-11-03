/* ---------------------------------------------------
Written by Michele Tricarico (LatidudeMaps) 
latidude.maps@gmail.com | https://latidudemaps.github.io/
Copyright 2024 | All Rights Reserved | CC BY-NC-SA 4.0
---------------------------------------------------- */

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
        this.setupResponsiveHandling();
    }

    async init() {
        try {
            console.log('App initialization started');
            this.showLoading();
            
            // First load the data
            await this.loadData();
            
            // Initialize UI and map
            this.initializeUI();
            await this.showDisclaimer();
            this.initializeMap();
            
            // Apply initial filter which sets up layers
            this.applyInitialFilter();
            this.setupMapEventListeners();
            this.setupResponsiveHandling();
            
            // Add a proper initialization sequence for the highest peaks panel
            // Wait for both map and layers to be ready
            this.mapManager.map.whenReady(() => {
                // Ensure we have proper bounds
                if (this.layerManager.mountainAreasLayer) {
                    const bounds = this.layerManager.mountainAreasLayer.getBounds();
                    if (bounds.isValid()) {
                        // Set the view and then update peaks
                        this.mapManager.map.fitBounds(bounds);
                        this.mapManager.map.once('moveend', () => {
                            this.uiManager.updateHighestPeaksPanel();
                            this.hideLoading();
                        });
                    }
                }
            });
    
            console.log('App initialization complete');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.handleInitializationError(error);
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
        
        // Connect the search handler to the LayerManager
        this.layerManager.setSearchHandler(this.handleSearch.bind(this));
        
        this.uiManager.initializeElements(unifiedControl);
        this.mapManager.setUIManager(this.uiManager);
        this.layerManager.setUIManager(this.uiManager);
        
        console.log('UI initialization complete');
    }

    initializeMap() {
        console.log('Initializing map');
        this.mapManager.setInitialExtent(this.layerManager.mountainAreasLayer);
        this.mapInitialized = true;
        console.log('Map initialized');
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

        this.uiManager.updateWikipediaPanel(searchValue); // Use this.uiManager here
        this.uiManager.updateHighestPeaksPanel(); // Update the highest peaks panel after search
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
        // The updateHighestPeaksPanel is now called in filterAndDisplayPeaks
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

    handleNoMatchingLayers(searchValue) {
        console.log('No matching polygons found for:', searchValue);
        alert('No matching polygons found.');
        this.uiManager.updateWikipediaPanel(null);
    }

    setupResponsiveHandling() {
        window.addEventListener('resize', debounce(() => {
            this.handleResize();
        }, 250));
    }

    handleResize() {
        console.log('Handling resize event');
        if (this.mapManager && this.mapManager.map) {
            this.mapManager.map.invalidateSize();
        }
        if (this.uiManager) {
            this.uiManager.updateLayoutForScreenSize();
        }
        if (this.controlManager) {
            this.controlManager.handleResponsiveControls();
        }
        if (this.layerManager) {
            this.layerManager.resetHighlight();
        }
        if (this.uiManager) {
            this.uiManager.updateHighestPeaksPanel();
            this.uiManager.updateSearchSuggestions(true);
        }
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