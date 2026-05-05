import { CompositeTilemap, Tilemap } from '@pixi/tilemap';
import { Assets, Texture, Rectangle, Loader } from 'pixi.js';

export default class TilemapManager {
    constructor(container, config = {}) {
        this.container = container;
        this.tilemap = null;
        this.tileSize = config.tileSize || 16;
        this.mapWidth = config.mapWidth || 1020;
        this.mapHeight = config.mapHeight || 960;
        this.tilesetPath = config.tilesetPath; // Path to single tileset image
        this.tilesetAtlasPath = config.tilesetAtlasPath; // Path to JSON atlas defining tile regions
        this.tileMapping = config.tileMapping || {}; // Maps tileName -> {x, y} in grid
        this.randomTiles = config.randomTiles || Object.keys(this.tileMapping);
        this.tileData = config.tileData || []; // 2D array of tile names
        this.baseTextures = [];
        this.tileTextures = {};
    }

    async init() {
        try {
            // todo: learn tilemaps
            const atlas = await Assets.load(this.tilesetAtlasPath);
            this.tileTextures = atlas.textures ?? atlas

            this.tilemap = new CompositeTilemap();
            this.tilemap.tile(this.tileTextures['top-left'], 0, 0);
            for (let i = 0; i < this.mapHeight; i += this.tileSize) {
                for (let j = 0; j < this.mapWidth; j += this.tileSize) {
                    const randomIndex = Math.floor(Math.random() * this.randomTiles.length);
                    const tileName = this.randomTiles[randomIndex];
                    this.tilemap.tile(this.tileTextures[tileName], j, i);
                }
            }
            this.container.addChild(this.tilemap);
        } catch (error) {
            console.error('Failed to load tilemap assets:', error);
        }
    }

    /* <<<<<<<<<TEMPORARY CODE -- SUBJECT FOR DELETION>>>>>>>>>>>> */

    buildTilemap(width, height) {
                if (!this.tilemap || Object.keys(this.tileTextures).length === 0) {
                    console.warn('Cannot build tilemap - missing tilemap or tile textures');
                    return;
                }

                this.tilemap.clear();
        
                // Calculate grid dimensions
                const cols = Math.ceil(width / this.tileSize);
                const rows = Math.ceil(height / this.tileSize);
                console.log(`Building tilemap: ${cols}x${rows} tiles`);
        
                // Get the pool of tiles to randomize from
                const tileNames = this.randomTiles.length > 0 ? this.randomTiles : Object.keys(this.tileTextures);
                console.log(`Tile pool for randomization:`, tileNames);
        
                // Iterate through entire screen grid
                const placementCounts = {};
                for (const n of tileNames) placementCounts[n] = 0;

                // Iterate through entire screen grid
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        // Randomly pick one tile from the pool
                        const randomIndex = Math.floor(Math.random() * tileNames.length);
                        const tileName = tileNames[randomIndex];
                        const texture = this.tileTextures[tileName];

                        if (texture) {
                            // Place the texture at this grid position
                            const pixelX = x * this.tileSize;
                            const pixelY = y * this.tileSize;
                            this.tilemap.tile(texture, pixelX, pixelY);
                            placementCounts[tileName] = (placementCounts[tileName] || 0) + 1;
                        } else {
                            placementCounts[tileName] = (placementCounts[tileName] || 0);
                        }
                    }
                }

                console.log('Tile placement counts:', placementCounts);
    }

    setTileData(tileData) {
        this.tileData = tileData;
        if (this.tilemap) {
            this.tilemap.clear();
            this.tileData.forEach((row, y) => {
                row.forEach((tileName, x) => {
                    const texture = this.tileTextures[tileName];
                    if (!texture) return;

                    const tileX = x * this.tileSize;
                    const tileY = y * this.tileSize;
                    this.tilemap.tile(texture, tileX, tileY);
                });
            });
        }
    }

    getTile(x, y) {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        if (this.tileData[tileY] && this.tileData[tileY][tileX]) {
            return this.tileData[tileY][tileX];
        }
        return null;
    }
}