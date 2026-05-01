import { Container } from 'pixi.js';
import { Player } from '../entities/player.js';
import SpawnerSystem from '../enemySystem/systems/spawnerSystem.js';


export class MainStage {
    constructor(app) {
        this.app = app;
        this.container = new Container();
        this.player = new Player(app);
        this.spawnerSystem = new SpawnerSystem(app, this.container, this.player);
    }

    







    async init() {
        await this.player.init();
        this.container.addChild(this.player.sprite);

        await this.spawnerSystem.init();

        window.addEventListener('keydown', this.player.onKeyDown);
        window.addEventListener('keyup', this.player.onKeyUp);
        window.addEventListener('pointermove', this.player.onPointerMove);
        this.app.ticker.add(this.player.updateMovement);
        this.app.ticker.add(this.spawnerSystem.update);
    }
}
