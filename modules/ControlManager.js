export class ControlManager {
    constructor(mapManager, layerManager, uiManager, dataLoader) {
        this.mapManager = mapManager;
        this.layerManager = layerManager;
        this.uiManager = uiManager;
        this.dataLoader = dataLoader;
        this.unifiedControl = null;
        this.defaultOpacity = 1;
        this.hierLvlSlider = null;
        this.hierLvlValue = null;
        this.currentHierLevel = null;
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
        
        unifiedControl.onAdd = (map) => {
            const container = this.createControlContainer();
            this.addLayerControl(container);
            this.addFilterControl(container);
            return container;
        };
        
        return unifiedControl.addTo(this.mapManager.map);
    }

    addFilterControl(container) {
        const filterSection = L.DomUtil.create('div', 'control-section filter-control-section', container);
        filterSection.innerHTML = `
            <div class="control-group">
                <label for="hier-lvl-slider">GMBA Hierarchy Level: <span id="hier-lvl-value"></span></label>
                <input type="range" id="hier-lvl-slider" class="custom-slider" min="1" max="10" step="1">
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
        
        this.preventPropagation(filterSection);

        this.hierLvlSlider = filterSection.querySelector('#hier-lvl-slider');
        this.hierLvlValue = filterSection.querySelector('#hier-lvl-value');
        this.initializeSlider();
    }

    initializeSlider() {
        if (this.hierLvlSlider && this.hierLvlValue) {
            const uniqueHierLevels = this.dataLoader.getUniqueHierLevels();
            if (uniqueHierLevels.length > 0) {
                const min = Math.min(...uniqueHierLevels);
                const max = Math.max(...uniqueHierLevels);
                this.hierLvlSlider.min = min;
                this.hierLvlSlider.max = max;
                
                // Use the current value if it exists, otherwise use min
                this.currentHierLevel = this.currentHierLevel || min;
                this.hierLvlSlider.value = this.currentHierLevel;
                this.hierLvlValue.textContent = this.currentHierLevel;

                this.hierLvlSlider.addEventListener('input', (e) => {
                    const value = e.target.value;
                    this.hierLvlValue.textContent = value;
                    this.currentHierLevel = value;
                    this.uiManager.filterHandler(value);
                });
            }
        }
    }

    createControlContainer() {
        const container = L.DomUtil.create('div', 'unified-control');
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        return container;
    }

    addLayerControl(container) {
        const layerSection = L.DomUtil.create('div', 'control-section layer-control-section', container);
        const layerList = L.DomUtil.create('ul', 'layer-list', layerSection);
        
        this.addBaseLayersToControl(layerList);
        this.addOverlayLayersToControl(layerList);
    }

    addBaseLayersToControl(layerList) {
        Object.entries(this.mapManager.baseMaps).forEach(([name, layer]) => {
            const li = this.createLayerListItem(layerList, 'radio', 'base-layer', `base-${name}`, name);
            const input = li.querySelector('input');
            
            if (name === this.mapManager.activeBaseMap) {
                input.checked = true;
            }
            
            L.DomEvent.on(input, 'change', (e) => {
                L.DomEvent.stop(e);
                this.mapManager.map.removeLayer(this.mapManager.baseMaps[this.mapManager.activeBaseMap]);
                this.mapManager.map.addLayer(layer);
                this.mapManager.activeBaseMap = name;
            });
        });
    }

    addOverlayLayersToControl(layerList) {
        const overlayMaps = {
            "Mountain Areas": this.layerManager.mountainAreasLayer,
            "OSM Peaks": this.layerManager.markers
        };
        
        Object.entries(overlayMaps).forEach(([name, layer]) => {
            const li = this.createLayerListItem(layerList, 'checkbox', null, `overlay-${name}`, name);
            const input = li.querySelector('input');
            input.checked = true;
            
            L.DomEvent.on(input, 'change', (e) => {
                L.DomEvent.stop(e);
                if (input.checked) {
                    this.mapManager.map.addLayer(layer);
                } else {
                    this.mapManager.map.removeLayer(layer);
                }
            });

            if (name === "Mountain Areas") {
                this.addOpacitySlider(li);
            }
        });
    }

    createLayerListItem(parentElement, inputType, inputName, inputId, labelText) {
        const li = L.DomUtil.create('li', '', parentElement);
        const input = L.DomUtil.create('input', '', li);
        input.type = inputType;
        if (inputName) input.name = inputName;
        input.id = inputId;
        const label = L.DomUtil.create('label', '', li);
        label.htmlFor = inputId;
        label.textContent = labelText;
        return li;
    }

    addOpacitySlider(li) {
        const opacityContainer = L.DomUtil.create('div', 'opacity-slider-container', li);
        opacityContainer.innerHTML = `
            <input type="range" class="opacity-slider" min="0" max="1" step="0.1" value="${this.defaultOpacity}">
            <span class="opacity-value">${Math.round(this.defaultOpacity * 100)}%</span>
        `;
        
        const slider = opacityContainer.querySelector('.opacity-slider');
        const opacityValue = opacityContainer.querySelector('.opacity-value');
        
        L.DomEvent.on(slider, 'input', (e) => {
            L.DomEvent.stop(e);
            const opacity = parseFloat(e.target.value);
            this.layerManager.setMountainAreasOpacity(opacity);
            opacityValue.textContent = Math.round(opacity * 100) + '%';
        });

        // Sync the slider with the actual layer opacity
        this.syncOpacitySlider(slider, opacityValue);
    }

    syncOpacitySlider(slider, opacityValue) {
        // Get the current opacity from the layer manager
        const currentOpacity = this.layerManager.getMountainAreasOpacity();
        slider.value = currentOpacity;
        opacityValue.textContent = Math.round(currentOpacity * 100) + '%';
    }

    preventPropagation(element) {
        const stopPropagation = (e) => L.DomEvent.stop(e);
        const elements = {
            '#hier-lvl-slider': ['input', 'change'],
            '#search-input': ['focus', 'blur', 'input'],
            '#clear-search': ['click'],
            '.select-arrow-container': ['click']
        };

        Object.entries(elements).forEach(([selector, events]) => {
            const el = element.querySelector(selector);
            if (el) {
                events.forEach(event => L.DomEvent.on(el, event, stopPropagation));
            }
        });

        const arrowContainer = element.querySelector('.select-arrow-container');
        if (arrowContainer) {
            L.DomEvent.on(arrowContainer, 'click', (e) => {
                L.DomEvent.stop(e);
                const searchInput = element.querySelector('#search-input');
                searchInput.focus();
                searchInput.dispatchEvent(new CustomEvent('showAllSuggestions'));
            });
        }
    }

    handleResponsiveControls() {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 768;
            this.unifiedControl.setPosition(isMobile ? 'topleft' : 'topright');
            
            // Ensure the current hierarchy level is maintained
            if (this.hierLvlSlider && this.hierLvlValue && this.currentHierLevel) {
                this.hierLvlSlider.value = this.currentHierLevel;
                this.hierLvlValue.textContent = this.currentHierLevel;
            }
            
            // Notify UIManager about the resize
            this.uiManager.handleResize();
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call
    }
}