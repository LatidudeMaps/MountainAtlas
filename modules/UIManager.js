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
        this.wikipediaPanel = null;
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

        this.setupSearchListeners();
        this.setupFilterListeners();
        this.setupWikipediaPanel();
    }

    setupWikipediaPanel() {
        this.wikipediaPanel = document.createElement('div');
        this.wikipediaPanel.id = 'wikipedia-panel';
        this.wikipediaPanel.style.display = 'none';

        const controlContainer = this.filterControl.getContainer();
        controlContainer.parentNode.insertBefore(this.wikipediaPanel, controlContainer.nextSibling);

        // Prevent click propagation
        L.DomEvent.disableClickPropagation(this.wikipediaPanel);
        L.DomEvent.disableScrollPropagation(this.wikipediaPanel);

        // Add touch event listeners for mobile devices
        this.wikipediaPanel.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: false });

        this.wikipediaPanel.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: false });

        this.wikipediaPanel.addEventListener('touchend', (e) => {
            e.stopPropagation();
        }, { passive: false });
    }

    setupSearchListeners() {
        if (!this.searchInput || !this.searchSuggestions) {
            console.error('Search elements not found in the DOM');
            return;
        }

        this.searchInput.addEventListener('focus', () => this.showSuggestions());
        this.searchInput.addEventListener('input', debounce(() => this.updateSearchSuggestions(), 300));
        this.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        
        this.searchInput.addEventListener('showAllSuggestions', () => this.updateSearchSuggestions(true));

        const searchContainer = this.filterControl.getContainer().querySelector('.custom-search');
        if (searchContainer) {
            searchContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showSuggestions();
            });
        } else {
            console.error('Search container not found');
        }

        const clearSearchButton = this.filterControl.getContainer().querySelector('#clear-search');
        if (clearSearchButton) {
            clearSearchButton.addEventListener('click', () => this.clearSearch());
        } else {
            console.error('Clear search button not found');
        }

        document.addEventListener('click', (e) => this.handleDocumentClick(e));
    }

    handleSliderTouch(e) {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        const sliderRect = this.hierLvlSlider.getBoundingClientRect();
        const pos = (touch.clientX - sliderRect.left) / sliderRect.width;
        const value = Math.round(pos * (this.hierLvlSlider.max - this.hierLvlSlider.min) + parseFloat(this.hierLvlSlider.min));
        this.hierLvlSlider.value = value;
        this.hierLvlValue.textContent = value;
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

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.hideSuggestions();
            this.searchHandler(null);
        }
    }

    showSuggestions() {
        if (this.searchSuggestions) {
            this.searchSuggestions.style.display = 'block';
        }
    }

    hideSuggestions() {
        if (this.searchSuggestions) {
            this.searchSuggestions.style.display = 'none';
        }
    }

    updateSearchSuggestions(showAll = false) {
        if (!this.searchInput || !this.searchSuggestions) return;

        const searchValue = this.searchInput.value.trim().toLowerCase();
        this.searchSuggestions.innerHTML = '';

        if (!showAll && searchValue.length === 0) {
            this.hideSuggestions();
            return;
        }

        const currentLevelNames = this.layerManager.getCurrentHierLevelMountainAreaNames();
        // Use getMatchingNames even when showing all names to ensure sorting
        const matchingNames = this.getMatchingNames(searchValue, currentLevelNames);

        if (matchingNames.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'suggestions-list';
            
            matchingNames.forEach((name, index) => {
                const li = document.createElement('li');
                li.textContent = name;
                li.setAttribute('tabindex', '0');
                li.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectSuggestion(name);
                });
                li.addEventListener('keydown', (e) => this.handleSuggestionKeydown(e, index, ul));
                ul.appendChild(li);
            });

            this.searchSuggestions.appendChild(ul);
            this.showSuggestions();

            this.searchSuggestions.addEventListener('wheel', (e) => {
                const isAtTop = this.searchSuggestions.scrollTop === 0;
                const isAtBottom = this.searchSuggestions.scrollHeight - this.searchSuggestions.scrollTop === this.searchSuggestions.clientHeight;

                if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
                    e.preventDefault();
                }
                e.stopPropagation();
            }, { passive: false });
        } else {
            this.hideSuggestions();
        }
    }

    getMatchingNames(searchValue, names) {
        return names
            .filter(name => searchValue === '' || name.toLowerCase().includes(searchValue.toLowerCase()))
            .sort((a, b) => a.localeCompare(b));
    }

    selectSuggestion(name) {
        if (this.searchInput) {
            this.searchInput.value = name;
            this.hideSuggestions();
            this.searchHandler(name);
            this.updateWikipediaPanel(name);
        }
    }

    updateWikipediaPanel(name) {
        const matchingLayers = this.layerManager.getMatchingLayers(name);
        if (matchingLayers.length > 0) {
            const properties = matchingLayers[0].properties;
            const wikiUrl = properties.wiki_url_it;
            
            if (wikiUrl) {
                this.wikipediaPanel.style.display = 'block';
                this.fetchWikipediaContent(wikiUrl);
            } else {
                this.wikipediaPanel.style.display = 'block';
                this.wikipediaPanel.innerHTML = '<p>Info non disponibili</p>';
            }
        } else {
            this.wikipediaPanel.style.display = 'none';
        }
    }

    fetchWikipediaContent(wikiUrl) {
        const pageName = wikiUrl.split('/').pop();
        const apiUrl = `https://it.wikipedia.org/w/api.php?action=parse&format=json&prop=text&page=${pageName}&origin=*`;

        this.wikipediaPanel.innerHTML = 'Caricamento...';

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.parse && data.parse.text) {
                    const markup = data.parse.text['*'];
                    const content = this.cleanWikipediaContent(markup);
                    this.wikipediaPanel.innerHTML = content;
                } else {
                    this.wikipediaPanel.innerHTML = '<p>Errore nel caricamento del contenuto.</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching Wikipedia content:', error);
                this.wikipediaPanel.innerHTML = '<p>Errore nel caricamento del contenuto.</p>';
            });
    }

    cleanWikipediaContent(markup) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = markup;

        // Remove unwanted elements
        const elementsToRemove = tempDiv.querySelectorAll('.mw-empty-elt, .mw-editsection, .reference, .navbox');
        elementsToRemove.forEach(el => el.remove());

        // Get all paragraphs
        const paragraphs = tempDiv.querySelectorAll('p');
        let content = '';
        for (let i = 0; i < paragraphs.length; i++) {
            content += paragraphs[i].outerHTML;
        }

        // Add a "Read more" link
        const readMoreLink = tempDiv.querySelector('a.external');
        if (readMoreLink) {
            content += `<p><a href="${readMoreLink.href}" target="_blank">Leggi di più su Wikipedia</a></p>`;
        }

        return content;
    }

    handleSearchKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchValue = this.searchInput.value.trim();
            if (searchValue) {
                this.hideSuggestions();
                this.searchHandler(searchValue);
            }
        } else if (e.key === 'ArrowDown' && this.searchSuggestions.style.display !== 'none') {
            e.preventDefault();
            const firstItem = this.searchSuggestions.querySelector('li');
            if (firstItem) firstItem.focus();
        }
    }

    handleSuggestionKeydown(e, index, ul) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.selectSuggestion(e.target.textContent);
        }
        if (e.key === 'ArrowDown') this.moveFocus(1, index, ul);
        if (e.key === 'ArrowUp') this.moveFocus(-1, index, ul);
    }

    moveFocus(direction, currentIndex, ul) {
        const items = ul.getElementsByTagName('li');
        const nextIndex = (currentIndex + direction + items.length) % items.length;
        items[nextIndex].focus();
    }

    handleDocumentClick(e) {
        const searchContainer = this.filterControl.getContainer().querySelector('.custom-search');
        if (searchContainer && !searchContainer.contains(e.target)) {
            this.hideSuggestions();
        }
    }

    setupFilterListeners() {
        if (!this.hierLvlSlider || !this.hierLvlValue) {
            console.error('Hierarchy level elements not found in the DOM');
            return;
        }

        this.hierLvlSlider.addEventListener('input', () => {
            this.hierLvlValue.textContent = this.hierLvlSlider.value;
        });

        this.hierLvlSlider.addEventListener('change', () => {
            console.log('Slider value changed to:', this.hierLvlSlider.value);
            this.filterHandler(this.hierLvlSlider.value);
        });

        // Touch event handling for mobile devices
        let isDragging = false;

        this.hierLvlSlider.addEventListener('touchstart', (e) => {
            isDragging = true;
            this.handleSliderTouch(e);
        }, { passive: false });

        this.hierLvlSlider.addEventListener('touchmove', (e) => {
            if (isDragging) {
                this.handleSliderTouch(e);
            }
        }, { passive: false });

        this.hierLvlSlider.addEventListener('touchend', () => {
            isDragging = false;
            this.filterHandler(this.hierLvlSlider.value);
        });
    }
}