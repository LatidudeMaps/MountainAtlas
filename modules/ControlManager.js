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
            
            // Layer Control Section
            const layerSection = L.DomUtil.create('div', 'control-section layer-control-section', container);
            layerSection.innerHTML = '<h3>Layers</h3>';
            
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
                
                L.DomEvent.on(input, 'change', () => {
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
                
                L.DomEvent.on(input, 'change', () => {
                    if (input.checked) {
                        this.mapManager.map.addLayer(layer);
                    } else {
                        this.mapManager.map.removeLayer(layer);
                    }
                });
            });
            
            // Filter Section
            const filterSection = L.DomUtil.create('div', 'control-section filter-control-section', container);
            filterSection.innerHTML = `
                <h3>Filters</h3>
                <div class="control-group">
                    <label for="hier-lvl-slider">GMBA Hierarchy Level: <span id="hier-lvl-value"></span></label>
                    <input type="range" id="hier-lvl-slider" class="custom-slider">
                </div>
                <div class="control-group">
                    <label for="search-input">Search by GMBA MapName:</label>
                    <div class="input-button-group">
                        <div class="custom-search">
                            <input type="text" id="search-input" class="custom-select" placeholder="Search...">
                            <div class="select-arrow"></div>
                            <div id="search-suggestions" class="search-suggestions"></div>
                        </div>
                        <button id="clear-search" class="custom-button">Clear</button>
                    </div>
                </div>
            `;
            
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

    addOpacitySlider() {
        console.log('Adding opacity slider');
        if (!this.layerControl || !this.layerControl._overlaysList) {
            console.error('Layer control is not available');
            return;
        }

        const layerInputs = this.layerControl._overlaysList.querySelectorAll('input[type="checkbox"]');
        let mountainAreasItem;

        for (let input of layerInputs) {
            if (input.nextElementSibling && input.nextElementSibling.textContent.trim() === "Mountain Areas") {
                mountainAreasItem = input.parentNode;
                break;
            }
        }

        if (mountainAreasItem) {
            const sliderContainer = L.DomUtil.create('div', 'opacity-slider-container', mountainAreasItem);
            sliderContainer.innerHTML = `
                <input type="range" class="opacity-slider" min="0" max="1" step="0.1" value="0.65">
                <span class="opacity-value">65%</span>
            `;
            
            const slider = sliderContainer.getElementsByClassName('opacity-slider')[0];
            const opacityValue = sliderContainer.getElementsByClassName('opacity-value')[0];
            
            L.DomEvent.on(slider, 'input', (e) => {
                const opacity = parseFloat(e.target.value);
                this.layerManager.setMountainAreasOpacity(opacity);
                opacityValue.textContent = Math.round(opacity * 100) + '%';
            });
            
            L.DomEvent.on(slider, 'click', L.DomEvent.stopPropagation);
        } else {
            console.error("Mountain Areas layer not found in the layer control");
        }
    }
}