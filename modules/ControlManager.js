export class ControlManager {
    constructor(mapManager, layerManager) {
        this.mapManager = mapManager;
        this.layerManager = layerManager;
        this.layerControl = this.addLayerControl();
        this.filterControl = this.addFilterControl();
    }

    addLayerControl() {
        const overlayMaps = {
            "Mountain Areas": this.layerManager.mountainAreasLayer,
            "OSM Peaks": this.layerManager.markers
        };

        return L.control.layers(this.mapManager.baseMaps, overlayMaps, { collapsed: false }).addTo(this.mapManager.map);
    }

    addFilterControl() {
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
        filterControl.addTo(this.map);
        return filterControl;
    }

    addOpacitySlider() {
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