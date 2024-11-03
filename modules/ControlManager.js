/* ---------------------------------------------------
Written by Michele Tricarico (LatidudeMaps) 
latidude.maps@gmail.com | https://latidudemaps.github.io/
Copyright 2024 | All Rights Reserved | CC BY-NC-SA 4.0
---------------------------------------------------- */

export class ControlManager {
    constructor(mapManager, layerManager, uiManager) {
        this.mapManager = mapManager;
        this.layerManager = layerManager;
        this.uiManager = uiManager;
        this.unifiedControl = null;
        this.defaultOpacity = 1;
        this.isMobile = window.innerWidth <= 768;
        this.mobileFilterControl = null;
    }

    initControls() {
        console.log('Initializing controls');
        this.unifiedControl = this.addUnifiedControl();
        
        // Add mobile-specific filter control
        if (this.isMobile) {
            this.addMobileFilterControl();
        }
        
        this.handleResponsiveControls();
        window.uiManager = this.uiManager;
        return this.unifiedControl;
    }

    addMobileFilterControl() {
        const MobileFilterControl = L.Control.extend({
            options: {
                position: 'topright'
            },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'filter-control-mobile');
                container.innerHTML = `
                    <div class="control-group">
                        <label for="mobile-hier-lvl-slider">Mnt Ranges Hierarchy Level: <span id="mobile-hier-lvl-value"></span></label>
                        <input type="range" id="mobile-hier-lvl-slider" class="custom-slider">
                    </div>
                `;

                L.DomEvent.disableScrollPropagation(container);
                L.DomEvent.disableClickPropagation(container);

                // Detect Safari
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                console.log('Browser detection - Safari:', isSafari);

                setTimeout(() => {
                    const slider = container.querySelector('#mobile-hier-lvl-slider');
                    const valueSpan = container.querySelector('#mobile-hier-lvl-value');
                    
                    if (slider && valueSpan) {
                        const hierLevels = this.layerManager.getUniqueHierLevels();
                        const min = Math.min(...hierLevels);
                        const max = Math.max(...hierLevels);
                        const initial = "4";

                        slider.min = min;
                        slider.max = max;
                        slider.value = initial;
                        valueSpan.textContent = initial;

                        // Debounced filter update function
                        const debouncedUpdate = this.debounce((value) => {
                            console.log('Debounced filter update with value:', value);
                            if (this.uiManager && this.uiManager.filterHandler) {
                                this.uiManager.filterHandler(value.toString());
                            }
                        }, 50);

                        // Function to handle all value updates
                        const handleValueUpdate = (value) => {
                            valueSpan.textContent = value;
                            debouncedUpdate(value);
                        };

                        // Safari-specific handling
                        if (isSafari) {
                            // Use input event for immediate visual feedback
                            slider.addEventListener('input', (e) => {
                                valueSpan.textContent = e.target.value;
                            });

                            // Use change event for actual filter update
                            slider.addEventListener('change', (e) => {
                                console.log('Safari change event:', e.target.value);
                                handleValueUpdate(e.target.value);
                            });

                            // Additional touch event handling for Safari
                            let touchInProgress = false;

                            slider.addEventListener('touchstart', () => {
                                touchInProgress = true;
                            }, { passive: true });

                            slider.addEventListener('touchend', () => {
                                if (touchInProgress) {
                                    console.log('Safari touch end:', slider.value);
                                    handleValueUpdate(slider.value);
                                    touchInProgress = false;
                                }
                            }, { passive: true });
                        } else {
                            // Standard handling for other browsers
                            ['input', 'change'].forEach(eventType => {
                                slider.addEventListener(eventType, (e) => {
                                    console.log(`${eventType} event:`, e.target.value);
                                    handleValueUpdate(e.target.value);
                                });
                            });
                        }

                        // Ensure proper initialization
                        handleValueUpdate(initial);
                    }
                }, 0);

                return container;
            }
        });

        this.mobileFilterControl = new MobileFilterControl();
        this.mapManager.map.addControl(this.mobileFilterControl);
    }

    addUnifiedControl() {
        console.log('Adding unified control');
        const unifiedControl = L.control({ position: 'topright' });
        
        unifiedControl.onAdd = () => {
            const container = this.createControlContainer();
            this.addLayerControl(container);
            this.addFilterControl(container);
            return container;
        };
        
        return unifiedControl.addTo(this.mapManager.map);
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

    addFilterControl(container) {
        const filterSection = L.DomUtil.create('div', 'control-section filter-control-section', container);
        filterSection.innerHTML = `
            <div class="control-group">
                <label for="hier-lvl-slider">Mnt Ranges Hierarchy Level: <span id="hier-lvl-value"></span></label>
                <input type="range" id="hier-lvl-slider" class="custom-slider">
            </div>
            <div class="control-group">
                <label for="search-input">Search by Mnt Range name:</label>
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
        this.setupTouchFriendlyControls(filterSection);
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

    updateControlPosition() {
        if (this.unifiedControl) {
            this.unifiedControl.setPosition(this.isMobile ? 'topleft' : 'topright');
        }
    }

    setupTouchFriendlyControls(filterSection) {
        const slider = filterSection.querySelector('#hier-lvl-slider');
        const searchInput = filterSection.querySelector('#search-input');

        if (slider) {
            slider.addEventListener('touchstart', this.handleSliderTouch.bind(this));
            slider.addEventListener('touchmove', this.handleSliderTouch.bind(this));
        }

        if (searchInput) {
            searchInput.addEventListener('focus', () => {
                if (this.isMobile) {
                    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    handleSliderTouch(e, slider, valueSpan) {
        // Prevent default only if needed
        if (!e.defaultPrevented) {
            e.preventDefault();
        }

        try {
            const touch = e.touches[0];
            const rect = slider.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
            const range = slider.max - slider.min;
            const newValue = Math.round(pos * range + parseInt(slider.min));
            
            console.log('Touch processing:', {
                value: newValue,
                touch: true,
                browser: 'Safari'
            });
            
            slider.value = newValue;
            valueSpan.textContent = newValue;
        } catch (error) {
            console.error('Touch handling error:', error);
        }
    }

    handleResponsiveControls() {
        const isMobile = window.innerWidth <= 768;
        
        // Handle unified control position
        if (this.unifiedControl) {
            this.unifiedControl.setPosition(isMobile ? 'topleft' : 'topright');
        }

        // Handle mobile filter control
        if (isMobile && !this.mobileFilterControl) {
            this.addMobileFilterControl();
        } else if (!isMobile && this.mobileFilterControl) {
            this.mapManager.map.removeControl(this.mobileFilterControl);
            this.mobileFilterControl = null;
        }
    }
}