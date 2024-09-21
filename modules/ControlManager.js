export class ControlManager {
    constructor(mapManager, layerManager) {
        this.mapManager = mapManager;
        this.layerManager = layerManager;
        this.layerControl = null;
        this.filterControl = null;
    }

    initControls() {
        console.log('Initializing controls');
        this.filterControl = this.addFilterControl();
        this.layerControl = this.addLayerControl(); // Add layer control after filter control
        this.handleResponsiveControls();
        return this.filterControl;
    }

    addLayerControl() {
        console.log('Adding layer control');
        const overlayMaps = {
            "Mountain Areas": this.layerManager.mountainAreasLayer,
            "OSM Peaks": this.layerManager.markers
        };

        const control = L.control.layers(this.mapManager.baseMaps, overlayMaps, { 
            collapsed: false,
            position: 'topright'
        }).addTo(this.mapManager.map);

        // Manually check the active base map in the layer control
        setTimeout(() => {
            const inputs = control._baseLayersList.getElementsByTagName('input');
            for (let input of inputs) {
                if (input.nextSibling.textContent.trim() === this.mapManager.activeBaseMap) {
                    input.checked = true;
                    break;
                }
            }
        }, 0);

        return control;
    }

    addFilterControl() {
        console.log('Adding filter control');
        const filterControl = L.control({ position: 'topright' });
        filterControl.onAdd = () => {
            const div = L.DomUtil.create('div', 'filter-control');
            div.innerHTML = `
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
            return div;
        };
        const control = filterControl.addTo(this.mapManager.map);
        return control;
    }

    handleResponsiveControls() {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                this.filterControl.setPosition('topleft');
                this.layerControl.setPosition('topleft');
            } else {
                this.filterControl.setPosition('topright');
                this.layerControl.setPosition('topright');
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