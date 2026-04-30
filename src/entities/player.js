import { AnimatedSprite, Assets, Rectangle, Texture } from 'pixi.js';

export class Player {
    constructor(app) {
        this.app = app;
        this.sprite = null;
        this.moveSpeed = 4;
        this.mousePosition = {
            x: 0,
            y: 0,
            active: false
        };
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };

        this.onKeyDown = (event) => {
            const key = event.key.toLowerCase();
            if (key in this.keys) this.keys[key] = true;
        };

        this.onKeyUp = (event) => {
            const key = event.key.toLowerCase();
            if (key in this.keys) this.keys[key] = false;
        };

        this.onPointerMove = (event) => {
            const canvasBounds = this.app.canvas.getBoundingClientRect();
            this.mousePosition.x = event.clientX - canvasBounds.left;
            this.mousePosition.y = event.clientY - canvasBounds.top;
            this.mousePosition.active = true;
        };

        this.updateMovement = (ticker) => {
            if (!this.sprite) return;

            const delta = ticker.deltaTime;
            const horizontal = (this.keys.d ? 1 : 0) - (this.keys.a ? 1 : 0);
            const vertical = (this.keys.s ? 1 : 0) - (this.keys.w ? 1 : 0);
            const movingDiagonally = horizontal !== 0 && vertical !== 0;
            const velocity = this.moveSpeed * delta * (movingDiagonally ? 0.7071067811865476 : 1);

            this.sprite.x += horizontal * velocity;
            this.sprite.y += vertical * velocity;

            this.sprite.play();

            const halfWidth = this.sprite.width / 2;
            const halfHeight = this.sprite.height / 2;

            this.sprite.x = Math.max(halfWidth, Math.min(this.app.screen.width - halfWidth, this.sprite.x));
            this.sprite.y = Math.max(halfHeight, Math.min(this.app.screen.height - halfHeight, this.sprite.y));

            if (this.mousePosition.active) {
                const dx = this.mousePosition.x - this.sprite.x;
                const dy = this.mousePosition.y - this.sprite.y;
                this.sprite.rotation = Math.atan2(dy, dx) + Math.PI / 2;
            }
        };
    }

    async init() {
        const sheetTexture = await Assets.load('/playerSprites/player-idle-Sheet.png');
        const frameWidth = sheetTexture.width / 4;
        const frameHeight = sheetTexture.height;
        const frames = [];

        for (let index = 0; index < 4; index += 1) {
            frames.push(new Texture({
                source: sheetTexture.source,
                frame: new Rectangle(index * frameWidth, 0, frameWidth, frameHeight)
            }));
        }

        this.sprite = new AnimatedSprite(frames);
        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(2);
        this.sprite.x = this.app.screen.width / 2;
        this.sprite.y = this.app.screen.height / 2;
        this.sprite.rotation = 0;
        this.sprite.animationSpeed = 0.04;
        this.sprite.gotoAndPlay(0);
    }
}
