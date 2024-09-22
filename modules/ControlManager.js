export class ControlManager {
    constructor(mapManager, layerManager) {
        this.mapManager = mapManager;
        this.layerManager = layerManager;
        this.unifiedControl = null;
    }

    initControls() {
        console.log('Initializing controls');
        this.unifiedControl = this.addUnifiedControl();
        this.handleResponsiveControls();
        return this.unifiedControl;
    }

    addUnifiedControl() {
        console.log('Adding unified control');
        const unifiedControl = L.control({ position: 'topright' });
        
        unifiedControl.onAdd = () => {
            const container = L.DomUtil.create('div', 'unified-control');
            
            // Prevent propagation for the entire container
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            
            // Layer Control Section
            const layerSection = L.DomUtil.create('div', 'control-section layer-control-section', container);
            
            const layerList = L.DomUtil.create('ul', 'layer-list', layerSection);
            
            // Base Layers
            Object.entries(this.mapManager.baseMaps).forEach(([name, layer]) => {
                const li = L.DomUtil.create('li', '', layerList);
                const input = L.DomUtil.create('input', '', li);
                input.type = 'radio';
                input.name = 'base-layer';
                input.id = `base-${name}`;
                if (name === this.mapManager.activeBaseMap) {
                    input.checked = true;
                }
                const label = L.DomUtil.create('label', '', li);
                label.htmlFor = `base-${name}`;
                label.textContent = name;
                
                L.DomEvent.on(input, 'change', (e) => {
                    L.DomEvent.stop(e);
                    this.mapManager.map.removeLayer(this.mapManager.baseMaps[this.mapManager.activeBaseMap]);
                    this.mapManager.map.addLayer(layer);
                    this.mapManager.activeBaseMap = name;
                });
            });
            
            // Overlay Layers
            const overlayMaps = {
                "Mountain Areas": this.layerManager.mountainAreasLayer,
                "OSM Peaks": this.layerManager.markers
            };
            
            Object.entries(overlayMaps).forEach(([name, layer]) => {
                const li = L.DomUtil.create('li', '', layerList);
                const input = L.DomUtil.create('input', '', li);
                input.type = 'checkbox';
                input.id = `overlay-${name}`;
                input.checked = true;
                const label = L.DomUtil.create('label', '', li);
                label.htmlFor = `overlay-${name}`;
                label.textContent = name;
                
                L.DomEvent.on(input, 'change', (e) => {
                    L.DomEvent.stop(e);
                    if (input.checked) {
                        this.mapManager.map.addLayer(layer);
                    } else {
                        this.mapManager.map.removeLayer(layer);
                    }
                });

                // Add opacity slider for Mountain Areas
                if (name === "Mountain Areas") {
                    const opacityContainer = L.DomUtil.create('div', 'opacity-slider-container', li);
                    opacityContainer.innerHTML = `
                        <input type="range" class="opacity-slider" min="0" max="1" step="0.1" value="0.65">
                        <span class="opacity-value">65%</span>
                    `;
                    
                    const slider = opacityContainer.getElementsByClassName('opacity-slider')[0];
                    const opacityValue = opacityContainer.getElementsByClassName('opacity-value')[0];
                    
                    L.DomEvent.on(slider, 'input', (e) => {
                        L.DomEvent.stop(e);
                        const opacity = parseFloat(e.target.value);
                        this.layerManager.setMountainAreasOpacity(opacity);
                        opacityValue.textContent = Math.round(opacity * 100) + '%';
                    });
                }
            });
            
            // Filter Section
            const filterSection = L.DomUtil.create('div', 'control-section filter-control-section', container);
            filterSection.innerHTML = `
                <div class="control-group">
                    <label for="hier-lvl-slider">GMBA Hierarchy Level: <span id="hier-lvl-value"></span></label>
                    <input type="range" id="hier-lvl-slider" class="custom-slider">
                </div>
                <div class="control-group">
                    <label for="search-input">Search by GMBA MapName:</label>
                    <div class="input-button-group">
                        <div class="custom-search">
                            <input type="text" id="search-input" class="custom-select" placeholder="Search...">
                            <button id="clear-search" class="clear-search-button" aria-label="Clear search">×</button>
                            <div class="select-arrow-container">
                                <div class="select-arrow"></div>
                            </div>
                            <div id="search-suggestions" class="search-suggestions"></div>
                        </div>
                    </div>
                </div>
            `;
            
            // Prevent propagation for hierarchy level slider
            const hierLvlSlider = filterSection.querySelector('#hier-lvl-slider');
            L.DomEvent.on(hierLvlSlider, 'input', L.DomEvent.stop);
            L.DomEvent.on(hierLvlSlider, 'change', L.DomEvent.stop);
            
            // Prevent propagation for search input
            const searchInput = filterSection.querySelector('#search-input');
            L.DomEvent.on(searchInput, 'focus', L.DomEvent.stop);
            L.DomEvent.on(searchInput, 'blur', L.DomEvent.stop);
            L.DomEvent.on(searchInput, 'input', L.DomEvent.stop);
            
            // Prevent propagation for clear search button
            const clearSearchButton = filterSection.querySelector('#clear-search');
            L.DomEvent.on(clearSearchButton, 'click', L.DomEvent.stop);
            
            // Add event listener for the new select-arrow-container
            const selectArrowContainer = filterSection.querySelector('.select-arrow-container');
            L.DomEvent.on(selectArrowContainer, 'click', (e) => {
                L.DomEvent.stop(e);
                const searchInput = filterSection.querySelector('#search-input');
                searchInput.focus();
                // Trigger the display of all suggestions
                this.uiManager.updateSearchSuggestions(true);
            });
            
            return container;
        };
        
        return unifiedControl.addTo(this.mapManager.map);
    }

    handleResponsiveControls() {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                this.unifiedControl.setPosition('topleft');
            } else {
                this.unifiedControl.setPosition('topright');
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Call once to set initial state
    }
}