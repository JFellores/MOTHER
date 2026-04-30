import { Container } from 'pixi.js';
import { Player } from '../entities/player.js';
import { Tilemap } from '@pixi/tilemap';
import { Loader } from '@pixi/loaders';


export class MainStage {
    constructor(app) {
        this.app = app;
        this.container = new Container();
        this.player = new Player(app);

        Loader.shared.add('', '');
    }

    







    async init() {
        await this.player.init();
        this.container.addChild(this.player.sprite);

        window.addEventListener('keydown', this.player.onKeyDown);
        window.addEventListener('keyup', this.player.onKeyUp);
        window.addEventListener('pointermove', this.player.onPointerMove);
        this.app.ticker.add(this.player.updateMovement);
    }
}
