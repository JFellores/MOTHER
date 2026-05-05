import { AnimatedSprite, Assets, Rectangle, Sprite, Texture } from 'pixi.js';

export class Player {
    constructor(app) {
        this.app = app;
        this.sprite = null;
        this.idleFrames = [];
        this.attackFrames = [];
        this.basicAttackFrames = [];
        this.isAttacking = false;
        this.basicAttacks = [];
        this.basicAttack = null;
        this.idleAnimationSpeed = 0.08;
        this.attackAnimationSpeed = 0.4;
        this.basicAttackTexturePath = '/projectileSprites/player-basic-attack.png';
        this.basicAttackFrameCount = 4;
        this.basicAttackChargeTime = 0.5;
        this.basicAttackLifetime = 3;
        this.basicAttackLaunchSpeed = 350;
        this.basicAttackSpinSpeed = 10;
        this.basicAttackHoldOffset = 18;
        this.basicAttackScale = 2;
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

        this.onPointerDown = () => {
            if (!this.sprite || this.isAttacking) return;

            this.startBasicAttack();
        };

        this.onPointerUp = () => {
            this.releaseBasicAttack();
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

            this.updateBasicAttack(delta);
        };
    }

    setSceneContainer(container) {
        this.sceneContainer = container;
    }

    async init() {
        const idleTexture = await Assets.load('/playerSprites/player-idle-Sheet.png');
        const attackTexture = await Assets.load('/playerSprites/player-attack-Sheet.png');
        const basicAttackTexture = await Assets.load(this.basicAttackTexturePath);

        this.idleFrames = this.createFrames(idleTexture, 4);
        this.attackFrames = this.createFrames(attackTexture, 9);
        this.basicAttackFrames = this.createFrames(basicAttackTexture, this.basicAttackFrameCount);

        this.sprite = new AnimatedSprite(this.idleFrames);
        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(1);
        this.sprite.x = this.app.screen.width / 2;
        this.sprite.y = this.app.screen.height / 2;
        this.sprite.rotation = 0;
        this.sprite.animationSpeed = this.idleAnimationSpeed;
        this.sprite.loop = true;
        this.sprite.gotoAndPlay(0);
    }

    startBasicAttack() {
        if (this.basicAttack || this.basicAttackFrames.length === 0 || !this.sprite) return;

        const mouthPosition = this.getMouthPosition(this.basicAttackHoldOffset);
        const attackSprite = new Sprite(this.basicAttackFrames[0]);

        attackSprite.anchor.set(0.5);
        attackSprite.scale.set(this.basicAttackScale);
        attackSprite.x = mouthPosition.x;
        attackSprite.y = mouthPosition.y;

        this.getAttackParent().addChild(attackSprite);

        this.basicAttack = {
            sprite: attackSprite,
            holdTime: 0,
            launched: false,
            launchDirectionX: 0,
            launchDirectionY: 0,
            launchTime: 0,
            frameIndex: 0
        };
    }

    releaseBasicAttack() {
        if (!this.basicAttack || this.basicAttack.launched || !this.sprite) return;

        const angle = this.sprite.rotation - Math.PI / 2;

        this.basicAttack.launched = true;
        this.basicAttack.launchDirectionX = Math.cos(angle);
        this.basicAttack.launchDirectionY = Math.sin(angle);
        this.basicAttack.launchTime = 0;
        this.basicAttacks.push(this.basicAttack);
        this.basicAttack = null;

        if (this.attackFrames.length > 0) {
            this.isAttacking = true;
            this.sprite.textures = this.attackFrames;
            this.sprite.animationSpeed = this.attackAnimationSpeed;
            this.sprite.loop = false;
            this.sprite.onComplete = () => {
                this.sprite.textures = this.idleFrames;
                this.sprite.animationSpeed = this.idleAnimationSpeed;
                this.sprite.loop = true;
                this.sprite.gotoAndPlay(0);
                this.isAttacking = false;
                this.sprite.onComplete = null;
            };
            this.sprite.gotoAndPlay(0);
        }
    }

    updateBasicAttack(deltaTime) {
        const deltaSeconds = deltaTime / 60;
        const mouthPosition = this.sprite ? this.getMouthPosition(this.basicAttackHoldOffset) : { x: 0, y: 0 };

        if (this.basicAttack && !this.basicAttack.launched) {
            const attack = this.basicAttack;

            attack.holdTime = Math.min(this.basicAttackChargeTime, attack.holdTime + deltaSeconds);
            attack.frameIndex = this.getBasicAttackFrameIndex(attack.holdTime);
            attack.sprite.texture = this.basicAttackFrames[attack.frameIndex];
            attack.sprite.x = mouthPosition.x;
            attack.sprite.y = mouthPosition.y;
            attack.sprite.rotation += this.basicAttackSpinSpeed * deltaSeconds;
        }

        if (this.basicAttacks.length === 0) return;

        this.basicAttacks = this.basicAttacks.filter((attack) => {
            attack.launchTime += deltaSeconds;
            attack.sprite.x += attack.launchDirectionX * this.basicAttackLaunchSpeed * deltaSeconds;
            attack.sprite.y += attack.launchDirectionY * this.basicAttackLaunchSpeed * deltaSeconds;
            attack.sprite.rotation += this.basicAttackSpinSpeed * deltaSeconds;

            const flyingFrameIndex = Math.min(
                this.basicAttackFrames.length - 1,
                Math.floor(attack.launchTime / 0.08)
            );

            attack.sprite.texture = this.basicAttackFrames[flyingFrameIndex];

            if (attack.launchTime >= this.basicAttackLifetime || this.isBasicAttackOutOfBounds(attack.sprite)) {
                this.destroyBasicAttack(attack);
                return false;
            }

            return true;
        });
    }

    destroyBasicAttack(attack) {
        if (attack?.sprite?.parent) {
            attack.sprite.parent.removeChild(attack.sprite);
        }

        if (this.basicAttack === attack) {
            this.basicAttack = null;
        }
    }

    getBasicAttackFrameIndex(holdTime) {
        if (this.basicAttackFrames.length <= 1) return 0;

        const progress = Math.min(1, holdTime / this.basicAttackChargeTime);
        return Math.min(
            this.basicAttackFrames.length - 1,
            Math.floor(progress * (this.basicAttackFrames.length - 1))
        );
    }

    getMouthPosition(offset = this.basicAttackHoldOffset) {
        if (!this.sprite) {
            return { x: 0, y: 0 };
        }

        const angle = this.sprite.rotation - Math.PI / 2;

        return {
            x: this.sprite.x + Math.cos(angle) * offset,
            y: this.sprite.y + Math.sin(angle) * offset
        };
    }

    getAttackParent() {
        return this.sceneContainer ?? this.app.stage;
    }

    isBasicAttackOutOfBounds(sprite) {
        const padding = 64;

        return (
            sprite.x < -padding ||
            sprite.x > this.app.screen.width + padding ||
            sprite.y < -padding ||
            sprite.y > this.app.screen.height + padding
        );
    }

    createFrames(sheetTexture, frameCount) {
        const frameWidth = sheetTexture.width / frameCount;
        const frameHeight = sheetTexture.height;
        const frames = [];

        for (let index = 0; index < frameCount; index += 1) {
            frames.push(new Texture({
                source: sheetTexture.source,
                frame: new Rectangle(index * frameWidth, 0, frameWidth, frameHeight)
            }));
        }

        return frames;
    }
}
