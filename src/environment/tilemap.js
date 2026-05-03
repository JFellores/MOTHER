import { Tilemap } from '@pixi/tilemap';
import { Assets, Texture, Rectangle } from 'pixi.js';

export default class TilemapManager {
    constructor(container, config = {}) {
        this.container = container;
        this.tilemap = null;
        this.tileSize = config.tileSize || 16;
        this.tilesetPath = config.tilesetPath; // Path to single tileset image
        this.tileMapping = config.tileMapping || {}; // Maps tileName -> {x, y} in grid
        this.tileData = config.tileData || []; // 2D array of tile names
        this.baseTextures = [];
        this.tileTextures = {};
    }

    async init() {
        try {
            // Load the tileset image
            const tileset = await Assets.load(this.tilesetPath);
            this.baseTextures.push(tileset.baseTexture);
            
            // Create individual tile textures from the tileset
            for (const [tileName, gridPos] of Object.entries(this.tileMapping)) {
                const tilePixelX = gridPos.x * this.tileSize;
                const tilePixelY = gridPos.y * this.tileSize;
                
                this.tileTextures[tileName] = new Texture(
                    tileset.baseTexture,
                    new Rectangle(tilePixelX, tilePixelY, this.tileSize, this.tileSize)
                );
            }
            
            // Create tilemap with base texture
            this.tilemap = new Tilemap(this.baseTextures);
            
            // Add tiles based on tile data
            this.buildTilemap();
            
            // Add to container
            this.container.addChild(this.tilemap);
        } catch (error) {
            console.error('Failed to load tilemap assets:', error);
        }
    }

    buildTilemap() {
        if (!this.tilemap || !this.tileData.length) return;

        this.tileData.forEach((row, y) => {
            row.forEach((tileName, x) => {
                if (tileName && this.tileTextures[tileName]) {
                    const tileX = x * this.tileSize;
                    const tileY = y * this.tileSize;
                    this.tilemap.tile(this.tileTextures[tileName], tileX, tileY);
                }
            });
        });
    }

    update(dt) {
        // Add any tilemap updates here (parallax, animation, etc.)
    }

    setTileData(tileData) {
        this.tileData = tileData;
        if (this.tilemap) {
            this.tilemap.clear();
            this.buildTilemap();
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