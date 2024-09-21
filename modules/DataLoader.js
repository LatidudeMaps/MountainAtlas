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
            const response = await fetch("https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/MountainAreas.geojson");
            this.mountainAreasData = await response.json();
            this.mountainAreasLoaded = true;
            console.log('Mountain areas loaded');
            return this.mountainAreasData;
        } catch (error) {
            console.error('Error loading Mountain Areas:', error);
            throw error;
        }
    }

    async loadOsmPeaks() {
        console.log('Loading OSM peaks...');
        try {
            const response = await fetch("https://raw.githubusercontent.com/latidudemaps/MountainAtlas/main/data/OSM_peaks_GMBA.geojson");
            const osmPeaksData = await response.json();
            this.allOsmPeaks = osmPeaksData.features;
            this.osmPeaksLoaded = true;
            console.log('OSM peaks loaded');
            return this.allOsmPeaks;
        } catch (error) {
            console.error('Error loading OSM Peaks:', error);
            throw error;
        }
    }

    getUniqueHierLevels() {
        if (!this.mountainAreasData) return [];
        return [...new Set(this.mountainAreasData.features.map(feature => feature.properties?.Hier_lvl))].sort((a, b) => a - b);
    }
}