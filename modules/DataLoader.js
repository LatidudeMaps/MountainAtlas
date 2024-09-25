export class DataLoader {
    constructor() {
        this.mountainAreasData = null;
        this.allOsmPeaks = null;
        this.mountainAreasLoaded = false;
        this.osmPeaksLoaded = false;
    }

    async loadMountainAreas() {
        console.log('Loading mountain areas...');
        try {
            const response = await this.fetchData("https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/MountainAreas.geojson");
            this.mountainAreasData = await response.json();
            this.mountainAreasLoaded = true;
            console.log('Mountain areas loaded successfully');
            return this.mountainAreasData;
        } catch (error) {
            console.error('Error loading Mountain Areas:', error);
            this.mountainAreasLoaded = false;
            throw error;
        }
    }

    async loadOsmPeaks() {
        console.log('Loading OSM peaks...');
        try {
            const response = await this.fetchData("https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/OSM_peaks_GMBA.geojson");
            const osmPeaksData = await response.json();
            
            // Debug: Log a sample of the loaded data
            console.log('Sample OSM peak data:', osmPeaksData.features[0]);
            
            this.allOsmPeaks = osmPeaksData.features;
            this.osmPeaksLoaded = true;
            console.log('OSM peaks loaded successfully');
            return this.allOsmPeaks;
        } catch (error) {
            console.error('Error loading OSM Peaks:', error);
            this.osmPeaksLoaded = false;
            throw error;
        }
    }

    async fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    }

    getUniqueHierLevels() {
        if (!this.mountainAreasData) {
            console.warn('Mountain areas data not loaded');
            return [];
        }
        const hierLevels = this.mountainAreasData.features
            .map(feature => feature.properties?.Hier_lvl)
            .filter(level => level !== undefined);
        return [...new Set(hierLevels)].sort((a, b) => a - b);
    }

    isDataLoaded() {
        return this.mountainAreasLoaded && this.osmPeaksLoaded;
    }

    getMountainAreasCount() {
        return this.mountainAreasData ? this.mountainAreasData.features.length : 0;
    }

    getOsmPeaksCount() {
        return this.allOsmPeaks ? this.allOsmPeaks.length : 0;
    }
}