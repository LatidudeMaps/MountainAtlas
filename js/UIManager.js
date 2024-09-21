import { debounce } from '../utils/helpers.js';

export class UIManager {
    constructor(searchHandler, filterHandler) {
        this.searchHandler = searchHandler;
        this.filterHandler = filterHandler;
        this.searchInput = document.getElementById('search-input');
        this.searchSuggestions = document.getElementById('search-suggestions');
        this.hierLvlSlider = document.getElementById('hier-lvl-slider');
        this.hierLvlValue = document.getElementById('hier-lvl-value');
    }

    setupSearchListeners() {
        this.searchInput.addEventListener('focus', () => this.toggleSuggestions(true));
        this.searchInput.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSuggestions(true);
        });
        this.searchInput.addEventListener('input', debounce(() => this.updateSearchSuggestions(), 300));
        this.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        document.getElementById('clear-search').addEventListener('click', () => this.clearSearch());
        document.addEventListener('click', (e) => this.handleDocumentClick(e));
    }

    setupFilterListeners() {
        this.hierLvlSlider.addEventListener('input', () => {
            this.hierLvlValue.textContent = this.hierLvlSlider.value;
        });
        this.hierLvlSlider.addEventListener('change', () => {
            this.filterHandler(this.hierLvlSlider.value);
        });
        this.hierLvlSlider.addEventListener('mousedown', (e) => {
            document.addEventListener('mouseup', this.enableMapDragging);
            document.addEventListener('mouseleave', this.enableMapDragging);
        });
    }

    enableMapDragging = () => {
        // Assuming you have a reference to the map object
        // this.map.dragging.enable();
        document.removeEventListener('mouseup', this.enableMapDragging);
        document.removeEventListener('mouseleave', this.enableMapDragging);
    }

    toggleSuggestions(show) {
        if (show) {
            this.updateSearchSuggestions(true);
            this.searchSuggestions.style.display = 'block';
        } else {
            this.searchSuggestions.style.display = 'none';
        }
    }

    updateSearchSuggestions(showAll = false) {
        const searchValue = this.searchInput.value.trim().toLowerCase();
        this.searchSuggestions.innerHTML = '';

        if (!showAll && searchValue.length === 0) {
            this.searchSuggestions.style.display = 'none';
            return;
        }

        // This should be replaced with actual data from your LayerManager
        const matchingNames = []; // filteredMountainAreas.map(feature => feature.properties.MapName).filter(...)

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

    selectSuggestion(name) {
        this.searchInput.value = name;
        this.searchSuggestions.style.display = 'none';
        this.searchHandler(name);
    }

    handleSearchKeydown(e) {
        if (e.key === 'ArrowDown' && this.searchSuggestions.style.display !== 'none') {
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
        if (!this.searchInput.contains(e.target) && !this.searchSuggestions.contains(e.target)) {
            this.toggleSuggestions(false);
        }
    }

    clearSearch() {
        this.searchInput.value = '';
        this.searchHandler('');
    }

    updateHierLevelSlider(min, max, value) {
        this.hierLvlSlider.min = min;
        this.hierLvlSlider.max = max;
        this.hierLvlSlider.value = value;
        this.hierLvlValue.textContent = value;
    }
}