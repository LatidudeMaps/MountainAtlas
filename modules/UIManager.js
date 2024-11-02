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
        this.isMobile = window.innerWidth <= 768;
        this.setupResponsiveLayout();
        this.initialized = false;
    }

    initializeElements(filterControl) {
        console.log('Initializing UI elements');
        this.filterControl = filterControl;
        this.initializeUIComponents();
        this.setupEventListeners();
        this.setupWikipediaPanel();
        this.setupHighestPeaksPanel();
        this.setupResponsiveLayout();
        this.initialized = true;
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

    setupHighestPeaksPanel() {
        this.highestPeaksPanel = L.control({ position: this.isMobile ? 'topleft' : 'topright' });
        
        this.highestPeaksPanel.onAdd = () => {
            const container = L.DomUtil.create('div', 'highest-peaks-panel');
            container.innerHTML = '<h3>Top 5 peaks in map view</h3><div id="highest-peaks-content"></div>';
            
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            
            return container;
        };
        
        this.highestPeaksPanel.addTo(this.mapManager.map);
    }

    updateHighestPeaksPanel() {
        if (!this.mapManager.map.getCenter()) {
            console.log('Map not yet initialized, skipping update');
            return;
        }
    
        const highestPeaks = this.layerManager.getHighestPeaks(5);
        const content = document.getElementById('highest-peaks-content');
        
        if (content) {
            if (!highestPeaks || highestPeaks.length === 0) {
                content.innerHTML = '<p class="no-peaks">No peaks in current view</p>';
            } else {
                let html = '<table id="highest-peaks-table">';
                
                highestPeaks.forEach((peak, index) => {
                    const isHighest = index === 0;
                    const highlightClass = isHighest ? 'highest-peak' : '';
                    const starIcon = isHighest ? '&#9733; ' : '';
                    const peakName = peak.properties.name || 'Unnamed Peak';
                    html += `<tr class="${highlightClass}" style="cursor: pointer" title="Click to zoom to peak">
                            <td title="${peakName}">${starIcon}${peakName}</td>
                            <td>${peak.properties.elevation} m</td>
                        </tr>`;
                });
                
                html += '</table>';
                content.innerHTML = html;
    
                // Add click handler to the table
                const table = content.querySelector('#highest-peaks-table');
                if (table) {
                    table.addEventListener('click', (e) => {
                        const row = e.target.closest('tr');
                        if (row) {
                            const peakName = row.querySelector('td').getAttribute('title');
                            this.layerManager.markers.eachLayer((marker) => {
                                if (marker.feature.properties.name === peakName) {
                                    const latlng = marker.getLatLng();
                                    this.mapManager.flyTo(latlng, 14);
                                    marker.openPopup();
                                }
                            });
                        }
                    });
                }
            }
        }
    }

    setupWikipediaPanel() {
        console.log('Setting up Wikipedia panel');
        this.wikipediaPanel = document.createElement('div');
        this.wikipediaPanel.id = 'wikipedia-panel';
        this.wikipediaPanel.style.display = 'none';
    
        // Add touch handling for mobile
        if (this.isMobile) {
            this.setupMobileWikipediaPanel();
        }
    
        const container = this.isMobile ? document.body : document.querySelector('.leaflet-right');
        if (container) {
            container.appendChild(this.wikipediaPanel);
            console.log('Wikipedia panel appended to container');
        }
    
        this.setupWikiPanelEventListeners();
    }
    
    setupMobileWikipediaPanel() {
        let startY = 0;
        let startHeight = 0;
        
        this.wikipediaPanel.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startHeight = this.wikipediaPanel.offsetHeight;
        }, { passive: true });
    
        this.wikipediaPanel.addEventListener('touchmove', (e) => {
            const deltaY = e.touches[0].clientY - startY;
            const newHeight = Math.max(200, Math.min(window.innerHeight * 0.9, startHeight - deltaY));
            this.wikipediaPanel.style.height = `${newHeight}px`;
            document.body.classList.add('panel-open');
        }, { passive: true });
    
        this.wikipediaPanel.addEventListener('touchend', () => {
            const threshold = window.innerHeight * 0.3;
            if (this.wikipediaPanel.offsetHeight < threshold) {
                this.wikipediaPanel.classList.add('hidden');
                document.body.classList.remove('panel-open');
            }
        });
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

    toggleWikipediaPanel(show) {
        if (this.wikipediaPanel) {
            if (show === undefined) {
                this.wikipediaPanel.classList.toggle('hidden');
            } else {
                this.wikipediaPanel.classList.toggle('hidden', !show);
            }
        }
    }

    updateWikipediaPanel(name) {
        // Handle panel closing
        if (!name) {
            this.wikipediaPanel.style.display = 'none';
            if (this.isMobile) {
                document.body.classList.remove('panel-open');
                this.wikipediaPanel.classList.add('hidden');
            }
            return;
        }
        
        // Show and setup panel
        this.wikipediaPanel.style.display = 'block';
        if (this.isMobile) {
            document.body.classList.add('panel-open');
            this.wikipediaPanel.classList.remove('hidden');
            // Reset any custom height set during dragging
            this.wikipediaPanel.style.height = '60vh';
        }
    
        // Add language toggle
        this.wikipediaPanel.innerHTML = this.createLanguageToggle();
        
        // Find matching content
        const matchingLayers = this.layerManager.getMatchingLayers(name);
        if (matchingLayers.length > 0) {
            const properties = matchingLayers[0].properties;
            const wikiUrl = this.currentLanguage === 'it' ? properties.wiki_url_it : properties.wiki_url_en;
            
            if (wikiUrl) {
                // Show loading state
                const loadingMessage = this.currentLanguage === 'it' ? 'Caricamento...' : 'Loading...';
                this.wikipediaPanel.innerHTML += `
                    <div class="wiki-loading" style="text-align: center; padding: 1rem;">
                        ${loadingMessage}
                    </div>
                `;
                
                // Fetch content
                this.fetchWikipediaContent(wikiUrl);
            } else {
                // Handle missing wiki URL
                const message = this.currentLanguage === 'it' 
                    ? '<p style="padding: 1rem;">Info non disponibili</p>'
                    : '<p style="padding: 1rem;">Information not available in English</p>';
                this.wikipediaPanel.innerHTML += message;
            }
        } else {
            // Handle no matching content
            const message = this.currentLanguage === 'it'
                ? '<p style="padding: 1rem;">Nessun contenuto trovato</p>'
                : '<p style="padding: 1rem;">No matching content found</p>';
            this.wikipediaPanel.innerHTML += message;
        }
    
        // Mobile-specific setup for scroll handling
        if (this.isMobile) {
            // Prevent map interaction when touching the panel content
            const content = this.wikipediaPanel.querySelector('.wiki-content');
            if (content) {
                content.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                }, { passive: true });
                
                content.addEventListener('touchmove', (e) => {
                    e.stopPropagation();
                    
                    // Allow scrolling only if we're not at the boundaries
                    const isAtTop = content.scrollTop === 0;
                    const isAtBottom = content.scrollHeight - content.scrollTop === content.clientHeight;
                    
                    if ((isAtTop && e.touches[0].clientY > 0) || 
                        (isAtBottom && e.touches[0].clientY < 0)) {
                        e.preventDefault();
                    }
                }, { passive: false });
            }
    
            // Add drag handle for mobile
            const dragHandle = document.createElement('div');
            dragHandle.className = 'wiki-panel-handle';
            dragHandle.style.cssText = `
                width: 40px;
                height: 4px;
                background-color: #ccc;
                border-radius: 2px;
                margin: 8px auto;
            `;
            this.wikipediaPanel.insertBefore(dragHandle, this.wikipediaPanel.firstChild);
    
            // Ensure panel is positioned correctly on mobile
            this.wikipediaPanel.style.position = 'fixed';
            this.wikipediaPanel.style.bottom = '0';
            this.wikipediaPanel.style.left = '0';
            this.wikipediaPanel.style.right = '0';
            this.wikipediaPanel.style.margin = '0';
        } else {
            // Reset desktop positioning if needed
            this.wikipediaPanel.style.position = '';
            this.wikipediaPanel.style.bottom = '';
            this.wikipediaPanel.style.left = '';
            this.wikipediaPanel.style.right = '';
        }
    
        // Handle scroll propagation
        this.wikipediaPanel.addEventListener('wheel', (e) => {
            e.stopPropagation();
            
            // Check if we should allow scrolling
            const panel = e.currentTarget;
            const isAtTop = panel.scrollTop === 0;
            const isAtBottom = panel.scrollHeight - panel.scrollTop === panel.clientHeight;
            
            if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
                e.preventDefault();
            }
        }, { passive: false });
    
        // Clean up any inline positioning styles that might interfere with responsive layout
        if (!this.isMobile) {
            this.wikipediaPanel.style.top = '';
            this.wikipediaPanel.style.bottom = '';
            this.wikipediaPanel.style.transform = '';
        }
    
        // Update panel visibility in UI manager state
        this.toggleWikipediaPanel(true);
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

    setupResponsiveLayout() {
        const handleResize = () => {
            this.isMobile = window.innerWidth <= 768;
            if (this.initialized) {
                this.updateLayoutForScreenSize();
            }
        };

        window.addEventListener('resize', debounce(handleResize, 250));
        handleResize(); // Call once to set initial state
    }

    updateLayoutForScreenSize() {
        if (!this.initialized) return;
    
        const unifiedControl = document.querySelector('.unified-control');
        const highestPeaksPanel = document.querySelector('.highest-peaks-panel');
        const wikipediaPanel = document.getElementById('wikipedia-panel');
    
        if (this.isMobile) {
            this.movePanelsForMobile();
        } else {
            this.restorePanelsForDesktop();
        }
    
        if (unifiedControl) unifiedControl.style.width = this.isMobile ? 'calc(100% - 2rem)' : '18.75rem';
        if (highestPeaksPanel) highestPeaksPanel.style.width = this.isMobile ? 'calc(100% - 2rem)' : '18.75rem';
        if (wikipediaPanel) wikipediaPanel.style.width = this.isMobile ? 'calc(100% - 2rem)' : '18.75rem';
    
        // This line is causing the error - it calls a non-existent method
        this.updateHierarchyLevelSlider();
        
        this.updateSearchSuggestions(true);
    }

    movePanelsForMobile() {
        const mapContainer = document.getElementById('map');
        const highestPeaksPanel = document.querySelector('.highest-peaks-panel');
        const wikipediaPanel = document.getElementById('wikipedia-panel');

        if (highestPeaksPanel) {
            mapContainer.parentNode.insertBefore(highestPeaksPanel, mapContainer);
        }
        if (wikipediaPanel) {
            mapContainer.parentNode.insertBefore(wikipediaPanel, mapContainer.nextSibling);
        }
    }

    restorePanelsForDesktop() {
        const leafletRight = document.querySelector('.leaflet-right');
        const highestPeaksPanel = document.querySelector('.highest-peaks-panel');
        const wikipediaPanel = document.getElementById('wikipedia-panel');

        if (leafletRight) {
            if (highestPeaksPanel) {
                leafletRight.appendChild(highestPeaksPanel);
            }
            if (wikipediaPanel) {
                leafletRight.appendChild(wikipediaPanel);
            }
        }
    }

    updateControlSizes() {
        const unifiedControl = document.querySelector('.unified-control');
        const highestPeaksPanel = document.querySelector('.highest-peaks-panel');
        const wikipediaPanel = document.getElementById('wikipedia-panel');

        if (this.isMobile) {
            const width = `calc(100% - 2rem)`;
            if (unifiedControl) unifiedControl.style.width = width;
            if (highestPeaksPanel) highestPeaksPanel.style.width = width;
            if (wikipediaPanel) wikipediaPanel.style.width = width;
        } else {
            const width = `18.75rem`;
            if (unifiedControl) unifiedControl.style.width = width;
            if (highestPeaksPanel) highestPeaksPanel.style.width = width;
            if (wikipediaPanel) wikipediaPanel.style.width = width;
        }
    }
}