import { debounce } from '../utils/helpers.js';

export class UIManager {
    constructor(searchHandler, filterHandler, layerManager) {
        this.searchHandler = searchHandler;
        this.filterHandler = filterHandler;
        this.layerManager = layerManager;
        this.filterControl = null;
        this.searchInput = null;
        this.searchSuggestions = null;
        this.hierLvlSlider = null;
        this.hierLvlValue = null;
    }

    initializeElements(filterControl) {
        console.log('Initializing UI elements');
        this.filterControl = filterControl;
        this.searchInput = this.filterControl.getContainer().querySelector('#search-input');
        this.searchSuggestions = this.filterControl.getContainer().querySelector('#search-suggestions');
        this.hierLvlSlider = this.filterControl.getContainer().querySelector('#hier-lvl-slider');
        this.hierLvlValue = this.filterControl.getContainer().querySelector('#hier-lvl-value');

        console.log('Search input found:', !!this.searchInput);
        console.log('Search suggestions found:', !!this.searchSuggestions);
        console.log('Hierarchy level slider found:', !!this.hierLvlSlider);
        console.log('Hierarchy level value found:', !!this.hierLvlValue);
    }

    setupFilterListeners() {
        console.log('Setting up filter listeners');
        if (!this.hierLvlSlider || !this.hierLvlValue) {
            console.error('Hierarchy level elements not found in the DOM');
            return;
        }

        this.hierLvlSlider.addEventListener('input', () => {
            console.log('Slider value changed:', this.hierLvlSlider.value);
            this.hierLvlValue.textContent = this.hierLvlSlider.value;
        });

        this.hierLvlSlider.addEventListener('change', () => {
            console.log('Slider change event fired');
            this.filterHandler(this.hierLvlSlider.value);
        });

        this.hierLvlSlider.addEventListener('mousedown', (e) => {
            console.log('Slider mousedown event fired');
            e.stopPropagation();
        });
    }

    updateHierLevelSlider(min, max, value) {
        console.log('Updating hierarchy level slider:', { min, max, value });
        if (!this.hierLvlSlider || !this.hierLvlValue) {
            console.error('Hierarchy level elements not found, cannot update slider');
            return;
        }

        this.hierLvlSlider.min = min;
        this.hierLvlSlider.max = max;
        this.hierLvlSlider.value = value;
        this.hierLvlValue.textContent = value;
    }

    enableMapDragging = () => {
        document.removeEventListener('mouseup', this.enableMapDragging);
        document.removeEventListener('mouseleave', this.enableMapDragging);
    }

    toggleSuggestions(show) {
        if (this.searchSuggestions) {
            if (show) {
                this.updateSearchSuggestions(true);
                this.searchSuggestions.style.display = 'block';
            } else {
                this.searchSuggestions.style.display = 'none';
            }
        }
    }

    setupSearchListeners() {
        if (!this.searchInput || !this.searchSuggestions) {
            console.error('Search elements not found in the DOM');
            return;
        }

        this.searchInput.addEventListener('focus', () => this.toggleSuggestions(true));
        this.searchInput.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSuggestions(true);
        });
        this.searchInput.addEventListener('input', debounce(() => this.updateSearchSuggestions(), 300));
        this.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        
        const clearSearchButton = this.filterControl.getContainer().querySelector('#clear-search');
        if (clearSearchButton) {
            clearSearchButton.addEventListener('click', () => this.clearSearch());
        } else {
            console.error('Clear search button not found');
        }

        document.addEventListener('click', (e) => this.handleDocumentClick(e));
    }

    updateSearchSuggestions(showAll = false) {
        if (!this.searchInput || !this.searchSuggestions) return;

        const searchValue = this.searchInput.value.trim().toLowerCase();
        this.searchSuggestions.innerHTML = '';

        if (!showAll && searchValue.length === 0) {
            this.searchSuggestions.style.display = 'none';
            return;
        }

        // Get matching names from LayerManager
        const matchingNames = this.getMatchingNames(searchValue);

        if (matchingNames.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'suggestions-list';
            
            matchingNames.forEach((name, index) => {
                const li = document.createElement('li');
                li.textContent = name;
                li.setAttribute('tabindex', '0');
                li.addEventListener('click', () => this.selectSuggestion(name));
                li.addEventListener('keydown', (e) => this.handleSuggestionKeydown(e, index, ul));
                ul.appendChild(li);
            });

            this.searchSuggestions.appendChild(ul);
            this.searchSuggestions.style.display = 'block';
        } else {
            this.searchSuggestions.style.display = 'none';
        }
    }

    getMatchingNames(searchValue) {
        const allNames = this.layerManager.getAllMountainAreaNames();
        console.log('All mountain area names:', allNames);
        return allNames.filter(name => 
            name.toLowerCase().includes(searchValue.toLowerCase())
        );
    }

    selectSuggestion(name) {
        if (this.searchInput) {
            this.searchInput.value = name;
            this.toggleSuggestions(false);
            this.searchHandler(name);
        }
    }

    handleSearchKeydown(e) {
        if (e.key === 'ArrowDown' && this.searchSuggestions && this.searchSuggestions.style.display !== 'none') {
            e.preventDefault();
            const firstItem = this.searchSuggestions.querySelector('li');
            if (firstItem) firstItem.focus();
        }
    }

    handleSuggestionKeydown(e, index, ul) {
        if (e.key === 'Enter') this.selectSuggestion(e.target.textContent);
        if (e.key === 'ArrowDown') this.moveFocus(1, index, ul);
        if (e.key === 'ArrowUp') this.moveFocus(-1, index, ul);
    }

    moveFocus(direction, currentIndex, ul) {
        const items = ul.getElementsByTagName('li');
        const nextIndex = (currentIndex + direction + items.length) % items.length;
        items[nextIndex].focus();
    }

    handleDocumentClick(e) {
        if (this.searchInput && this.searchSuggestions && 
            !this.searchInput.contains(e.target) && 
            !this.searchSuggestions.contains(e.target)) {
            this.toggleSuggestions(false);
        }
    }

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchHandler('');
        }
    }

    updateHierLevelSlider(min, max, value) {
        if (!this.hierLvlSlider || !this.hierLvlValue) {
            console.error('Hierarchy level elements not found, cannot update slider');
            return;
        }

        this.hierLvlSlider.min = min;
        this.hierLvlSlider.max = max;
        this.hierLvlSlider.value = value;
        this.hierLvlValue.textContent = value;
    }
}