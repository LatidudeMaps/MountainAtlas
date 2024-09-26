import { debounce } from '../utils/helpers.js';

export class UIManager {
    constructor(searchHandler, filterHandler, layerManager, mapManager) {
        this.searchHandler = searchHandler;
        this.filterHandler = filterHandler;
        this.layerManager = layerManager;
        this.mapManager = mapManager;
        this.filterControl = null;
        this.searchInput = null;
        this.searchSuggestions = null;
        this.hierLvlSlider = null;
        this.hierLvlValue = null;
        this.wikipediaPanel = null;
        this.isDraggingWikiPanel = false;
        this.currentLanguage = 'it';
        this.highestPeaksPanel = null;
        this.disclaimerAccepted = false;
    }

    initializeElements(filterControl) {
        console.log('Initializing UI elements');
        this.filterControl = filterControl;
        this.initializeUIComponents();
        this.setupEventListeners();
        this.setupWikipediaPanel();
        this.setupHighestPeaksPanel();
    }

    initializeUIComponents() {
        const container = this.filterControl.getContainer();
        this.searchInput = container.querySelector('#search-input');
        this.searchSuggestions = container.querySelector('#search-suggestions');
        this.hierLvlSlider = container.querySelector('#hier-lvl-slider');
        this.hierLvlValue = container.querySelector('#hier-lvl-value');

        this.logComponentInitialization();
    }

    logComponentInitialization() {
        console.log('Search input found:', !!this.searchInput);
        console.log('Search suggestions found:', !!this.searchSuggestions);
        console.log('Hierarchy level slider found:', !!this.hierLvlSlider);
        console.log('Hierarchy level value found:', !!this.hierLvlValue);
    }

    setupEventListeners() {
        this.setupSearchListeners();
        this.setupFilterListeners();
    }

    setupWikipediaPanel() {
        this.wikipediaPanel = document.createElement('div');
        this.wikipediaPanel.id = 'wikipedia-panel';
        this.wikipediaPanel.style.display = 'none';

        const controlContainer = this.filterControl.getContainer();
        controlContainer.parentNode.insertBefore(this.wikipediaPanel, controlContainer.nextSibling);

        this.setupWikiPanelEventListeners();
    }

    setupWikiPanelEventListeners() {
        L.DomEvent.disableClickPropagation(this.wikipediaPanel);
        L.DomEvent.disableScrollPropagation(this.wikipediaPanel);

        this.wikipediaPanel.addEventListener('mousedown', this.handleWikiPanelInteraction.bind(this));
        this.wikipediaPanel.addEventListener('touchstart', this.handleWikiPanelInteraction.bind(this), { passive: true });
        this.wikipediaPanel.addEventListener('wheel', this.handleWikiPanelWheel.bind(this), { passive: false });
        this.wikipediaPanel.addEventListener('click', this.handleWikiPanelLinkClick.bind(this));

        document.addEventListener('mouseup', this.handleDocumentMouseUp.bind(this));
    }

    handleWikiPanelInteraction(e) {
        if (e.type === 'touchstart' || e.type === 'mousedown') {
            if (!this.isDraggingWikiPanel) {
                this.isDraggingWikiPanel = true;
                if (this.mapManager && this.mapManager.map) {
                    this.mapManager.map.dragging.disable();
                }
            }
        }

        if (e.type === 'mousedown') {
            e.stopPropagation();
        }
    }

    handleDocumentMouseUp() {
        if (this.isDraggingWikiPanel) {
            this.isDraggingWikiPanel = false;
            if (this.mapManager && this.mapManager.map) {
                this.mapManager.map.dragging.enable();
            }
        }
    }

    handleWikiPanelLinkClick(e) {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const href = e.target.getAttribute('href');
            if (href) {
                if (href.startsWith('/wiki/')) {
                    const pageName = href.split('/wiki/')[1];
                    this.fetchWikipediaContent(`https://it.wikipedia.org/wiki/${pageName}`);
                } else if (!href.startsWith('http')) {
                    this.fetchWikipediaContent(`https://it.wikipedia.org${href}`);
                } else {
                    window.open(href, '_blank');
                }
            }
        }
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
        e.preventDefault();
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

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.hideSuggestions();
            this.searchHandler(null);
            this.wikipediaPanel.style.display = 'none';
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
        console.log('Current level names:', currentLevelNames);
        const matchingNames = this.getMatchingNames(searchValue, currentLevelNames);

        if (matchingNames.length > 0) {
            this.populateSuggestionsList(matchingNames);
        } else {
            this.hideSuggestions();
        }
    }

    getMatchingNames(searchValue, names) {
        return names
            .filter(name => name.toLowerCase().includes(searchValue.toLowerCase()))
            .sort((a, b) => a.localeCompare(b));
    }

    populateSuggestionsList(matchingNames) {
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

        this.searchSuggestions.addEventListener('wheel', this.handleSuggestionsWheel.bind(this), { passive: false });
    }

    handleSuggestionsWheel(e) {
        const isAtTop = this.searchSuggestions.scrollTop === 0;
        const isAtBottom = this.searchSuggestions.scrollHeight - this.searchSuggestions.scrollTop === this.searchSuggestions.clientHeight;

        if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
            e.preventDefault();
        }
        e.stopPropagation();
    }

    selectSuggestion(name) {
        if (this.searchInput) {
            this.searchInput.value = name;
            this.hideSuggestions();
            this.searchHandler(name);
            this.updateWikipediaPanel(name);
        }
    }

    toggleLanguage(lang) {
        if (lang === 'it' || lang === 'en') {
            this.currentLanguage = lang;
            const currentSearchValue = this.searchInput.value.trim();
            if (currentSearchValue) {
                this.updateWikipediaPanel(currentSearchValue);
            }
        }
    }

    updateWikipediaPanel(name) {
        this.wikipediaPanel.style.display = 'block';
        this.wikipediaPanel.innerHTML = this.createLanguageToggle();

        if (!name) {
            this.wikipediaPanel.innerHTML += '<p>No content selected</p>';
            return;
        }

        const matchingLayers = this.layerManager.getMatchingLayers(name);
        if (matchingLayers.length > 0) {
            const properties = matchingLayers[0].properties;
            const wikiUrl = this.currentLanguage === 'it' ? properties.wiki_url_it : properties.wiki_url_en;
            
            if (wikiUrl) {
                this.fetchWikipediaContent(wikiUrl);
            } else {
                const message = this.currentLanguage === 'it' 
                    ? '<p>Info non disponibili</p>'
                    : '<p>Information not available in English</p>';
                this.wikipediaPanel.innerHTML += message;
            }
        } else {
            this.wikipediaPanel.innerHTML += '<p>No matching content found</p>';
        }
    }

    handleWikiPanelWheel(e) {
        e.preventDefault();
        e.stopPropagation();
        this.wikipediaPanel.scrollTop += e.deltaY;
    }

    fetchWikipediaContent(wikiUrl) {
        const urlParts = wikiUrl.split('/wiki/');
        const pageName = urlParts[1].split('#')[0];
        const sectionAnchor = urlParts[1].split('#')[1] || '';
        const apiUrl = `https://${this.currentLanguage}.wikipedia.org/w/api.php?action=parse&format=json&prop=text|sections|displaytitle&page=${pageName}&origin=*`;
    
        const loadingMessage = this.currentLanguage === 'it' ? 'Caricamento...' : 'Loading...';
        this.wikipediaPanel.innerHTML = this.createLanguageToggle() + `<p>${loadingMessage}</p>`;
    
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => this.handleWikipediaResponse(data, pageName, sectionAnchor))
            .catch(this.handleWikipediaError.bind(this));
    }

    handleWikipediaResponse(data, pageName, sectionAnchor) {
        if (data.parse && data.parse.text) {
            const markup = data.parse.text['*'];
            const displayTitle = data.parse.displaytitle;
            const sections = data.parse.sections;
            
            let content = this.cleanWikipediaContent(markup, displayTitle, pageName, sectionAnchor, sections);
            
            if (content) {
                this.wikipediaPanel.innerHTML = this.createLanguageToggle() + content;
            } else {
                this.displayNoContentMessage(pageName, displayTitle);
            }
        } else {
            this.displayErrorMessage();
        }
    }

    handleWikipediaError(error) {
        console.error('Error fetching Wikipedia content:', error);
        this.displayErrorMessage();
    }

    displayNoContentMessage(pageName, displayTitle) {
        const noContentMessage = this.currentLanguage === 'it'
            ? 'Nessun contenuto trovato per questa sezione.'
            : 'No content found for this section.';
        const viewFullPageMessage = this.currentLanguage === 'it'
            ? 'Puoi visualizzare l\'intera pagina qui:'
            : 'You can view the full page here:';
        this.wikipediaPanel.innerHTML = this.createLanguageToggle() + `
            <p>${noContentMessage}</p>
            <p>${viewFullPageMessage}
            <a href="https://${this.currentLanguage}.wikipedia.org/wiki/${encodeURIComponent(pageName)}" target="_blank">
                ${displayTitle}
            </a></p>`;
    }

    displayErrorMessage() {
        const errorMessage = this.currentLanguage === 'it'
            ? 'Errore nel caricamento del contenuto.'
            : 'Error loading content.';
        this.wikipediaPanel.innerHTML = this.createLanguageToggle() + `<p>${errorMessage}</p>`;
    }

    createLanguageToggle() {
        return `
            <div class="language-toggle">
                <button class="${this.currentLanguage === 'it' ? 'active' : ''}" onclick="uiManager.toggleLanguage('it')">
                    <span class="fi fi-it"></span> IT
                </button>
                <button class="${this.currentLanguage === 'en' ? 'active' : ''}" onclick="uiManager.toggleLanguage('en')">
                    <span class="fi fi-gb"></span> EN
                </button>
            </div>
        `;
    }

    cleanWikipediaContent(markup, displayTitle, pageName, sectionAnchor, sections) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = markup;
    
        this.removeUnwantedElements(tempDiv);
        this.cleanOrRemoveInfobox(tempDiv);
    
        let content = this.extractRelevantContent(tempDiv, sectionAnchor);
    
        if (!content) {
            return null;
        }
    
        content = this.modifyRemainingLinks(content);
        content += this.createReadMoreLink(pageName, sectionAnchor);
    
        return content;
    }

    removeUnwantedElements(tempDiv) {
        const elementsToRemove = tempDiv.querySelectorAll('.mw-empty-elt, .mw-editsection, .reference, .navbox, .toc, .thumb, .mw-jump-link, .mw-redirectedfrom, .languagelinks, .mw-headline, .infobox, .sidebar');
        elementsToRemove.forEach(el => el.remove());
    }

    cleanOrRemoveInfobox(tempDiv) {
        const infobox = tempDiv.querySelector('.infobox, .sidebar, table.vcard');
        if (infobox) {
            infobox.remove();
        }
    }

    extractRelevantContent(tempDiv, sectionAnchor) {
        let content = '';
        let startExtraction = !sectionAnchor;
    
        const contentElements = tempDiv.querySelectorAll('p, ul, ol');
        for (let el of contentElements) {
            if (sectionAnchor && el.id === sectionAnchor) {
                startExtraction = true;
                continue;
            }
    
            if (startExtraction && (el.tagName === 'P' || el.tagName === 'UL' || el.tagName === 'OL')) {
                content += el.outerHTML;
            }
        }
    
        return content;
    }

    modifyRemainingLinks(content) {
        const tempContent = document.createElement('div');
        tempContent.innerHTML = content;
        const links = tempContent.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/wiki/')) {
                link.setAttribute('href', `https://${this.currentLanguage}.wikipedia.org${href}`);
            }
        });
    
        return tempContent.innerHTML;
    }

    createReadMoreLink(pageName, sectionAnchor) {
        const readMoreText = this.currentLanguage === 'it' ? 'Leggi di più su Wikipedia' : 'Read more on Wikipedia';
        const readMoreLink = `https://${this.currentLanguage}.wikipedia.org/wiki/${encodeURIComponent(pageName)}${sectionAnchor ? '#' + sectionAnchor : ''}`;
        return `<p><a href="${readMoreLink}" target="_blank">${readMoreText}</a></p>`;
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

        this.setupTouchEvents();
    }

    setupTouchEvents() {
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

    setupHighestPeaksPanel() {
        this.highestPeaksPanel = L.control({ position: 'bottomright' });
        
        this.highestPeaksPanel.onAdd = () => {
            const container = L.DomUtil.create('div', 'highest-peaks-panel');
            container.innerHTML = '<h3>Highest Peaks</h3><div id="highest-peaks-content"></div>';
            return container;
        };
        
        this.highestPeaksPanel.addTo(this.mapManager.map);
        // Remove the immediate call to updateHighestPeaksPanel here
    }

    updateHighestPeaksPanel() {
        if (!this.mapManager.map.getBounds().isValid()) {
            console.log('Map bounds not yet valid, skipping update');
            return;
        }
        const highestPeaks = this.layerManager.getHighestPeaks(5);
        const content = document.getElementById('highest-peaks-content');
        
        if (content) {
            if (highestPeaks.length === 0) {
                content.innerHTML = '<p>No peaks in current view</p>';
            } else {
                let html = '<table id="highest-peaks-table">';
                html += '<thead><tr><th>Name</th><th>Elevation (m)</th></tr></thead><tbody>';
                
                highestPeaks.forEach(peak => {
                    html += `<tr>
                        <td>${peak.properties.name || 'Unnamed Peak'}</td>
                        <td>${peak.properties.elevation}</td>
                    </tr>`;
                });
                
                html += '</tbody></table>';
                content.innerHTML = html;
            }
        }
    }
}