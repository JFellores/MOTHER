import { Container } from 'pixi.js';
import { Player } from '../entities/player.js';
import SpawnerSystem from '../enemySystem/systems/spawnerSystem.js';
import TilemapManager from '../environment/tilemap.js';


export class MainStage {
    constructor(app) {
        this.app = app;
        this.container = new Container();
        this.player = new Player(app);
        this.spawnerSystem = new SpawnerSystem(app, this.container, this.player);
        this.tilemapManager = new TilemapManager(this.container, {
            tilesetPath: 'public/tileMaps/tilemap-2.png',
            tileSize: 16,
            tileMapping: {
                'top-left': { x: 0, y: 0 },      
                'top-right': { x: 1, y: 0 }, 
                'bottom-left': { x: 2, y: 0 },      
                'bottom-right': { x: 3, y: 0 }, 
                'normal_floor': { x: 0, y: 1 },
            },
            tileData: [
                ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
                ['normal_floor'],
            ]
        });
    }

    async init() {
        await this.tilemapManager.init();
        
        await this.player.init();
        this.container.addChild(this.player.sprite);

        await this.spawnerSystem.init();

        window.addEventListener('keydown', this.player.onKeyDown);
        window.addEventListener('keyup', this.player.onKeyUp);
        window.addEventListener('pointermove', this.player.onPointerMove);
        this.app.ticker.add(this.player.updateMovement);
        this.app.ticker.add(this.spawnerSystem.update);
        this.app.ticker.add(this.tilemapManager.update.bind(this.tilemapManager));
    }
}
