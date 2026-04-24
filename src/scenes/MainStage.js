import { Container, Sprite, Assets, Texture, Rectangle } from 'pixi.js';

export class MainStage {
    constructor(app) {
        this.app = app;
        this.container = new Container();
        /* this.time = 0; */
        this.character = new Sprite();
        this.directionTextures = null;
        this.currentDirection = 'front';
        this.moveSpeed = 4;
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

        this.updateMovement = (ticker) => {
            if (!this.character) return;

            const delta = ticker.deltaTime;
            const velocity = this.moveSpeed * delta;

            if (this.keys.w) this.character.y -= velocity;
            if (this.keys.s) this.character.y += velocity;
            if (this.keys.a) this.character.x -= velocity;
            if (this.keys.d) this.character.x += velocity;

            let nextDirection = this.currentDirection;
            if (this.keys.w) nextDirection = 'back';
            else if (this.keys.s) nextDirection = 'front';
            else if (this.keys.a) nextDirection = 'left';
            else if (this.keys.d) nextDirection = 'right';

            if (this.directionTextures && nextDirection !== this.currentDirection) {
                this.currentDirection = nextDirection;
                this.character.texture = this.directionTextures[this.currentDirection];
            }

            const halfWidth = this.character.width / 2;
            const halfHeight = this.character.height / 2;

            this.character.x = Math.max(halfWidth, Math.min(this.app.screen.width - halfWidth, this.character.x));
            this.character.y = Math.max(halfHeight, Math.min(this.app.screen.height - halfHeight, this.character.y));
        };
    }

    async init() {
        /* const backgroundTexture = await Assets.load('images/titleScreen.png');
        const background = new Sprite(backgroundTexture);
        this.container.addChild(background); */
        const playerData = {
            frames: {
                front: {
                    frame: { x: 0, y: 0, width: 32, height: 32 },
                    sourceSize: { width: 32, height: 32 },
                    spriteSourceSize: { x: 0, y: 0, width: 32, height: 32 }
                },
                right: {
                    frame: {x: 32, y: 0, width: 32, height: 32},
                    sourceSize: {width: 32, height: 32},
                    spriteSourceSize: {x: 0, y: 0, width: 32, height: 32}
                },
                left: {
                    frame: {x: 64, y: 0, width: 32, height: 32},
                    sourceSize: {width: 32, height: 32},
                    spriteSourceSize: {x: 0, y: 0, width: 32, height: 32}
                },
                back: {
                    frame: {x: 96, y: 0, width: 32, height: 32},
                    sourceSize: {width: 32, height: 32},
                    spriteSourceSize: {x: 0, y: 0, width: 32, height: 32}
                }
            },
            meta: {
                image: 'images/Sprite-0001-Sheet.png',
                size: { w: 128, h: 32 },
            }, 
            animations: {
                front: ['front'],
                right: ['right'],
                left: ['left'],
                back: ['back']
            }
        }

        /* const texture = await Assets.load(playerData.meta.image);
        const spritesheet = new Spritesheet(texture.source, playerData);
        await spritesheet.parse(); */

        const sheetTexture = await Assets.load('images/Sprite-0001-Sheet.png');
        this.directionTextures = {
            front: new Texture({ source: sheetTexture.source, frame: new Rectangle(0, 0, 32, 32) }),
            right: new Texture({ source: sheetTexture.source, frame: new Rectangle(32, 0, 32, 32) }),
            left: new Texture({ source: sheetTexture.source, frame: new Rectangle(64, 0, 32, 32) }),
            back: new Texture({ source: sheetTexture.source, frame: new Rectangle(96, 0, 32, 32) })
        };

        const sprite = new Sprite(this.directionTextures.front);

        /* const sprite = new AnimatedSprite(spritesheet.animations.front); */
        /* sprite.scale.set(1); */
        sprite.anchor.set(0.5);
        sprite.x = this.app.screen.width / 2;
        sprite.y = this.app.screen.height / 2;
        this.character = sprite;
        this.container.addChild(sprite);

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        this.app.ticker.add(this.updateMovement);
    }
}