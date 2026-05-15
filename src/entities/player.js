import { AnimatedSprite, Assets, Rectangle, Texture } from 'pixi.js';
import Projectile from './projectile.js';

export class Player {
    constructor(app) {
        this.app = app;
        this.sprite = null;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.damageFlashTimer = null;
        this.idleFrames = [];
        this.attackFrames = [];
        this.isAttacking = false;
        this.projectiles = [];
        this.activeProjectile = null;
        this.idleAnimationSpeed = 0.08;
        this.attackAnimationSpeed = 0.4;
        this.attackAnimationDuration = 0.35;
        this.attackAnimationTimeLeft = 0;
        this.moveSpeed = 4;
        this.hitbox = null;
        this.projectileFrames = [];
        this.projectileConfig = {
            texturePath: '/projectileSprites/player-basic-attack.png',
            frameCount: 4,
            chargeTime: 0.5,
            lifetime: 3,
            launchSpeed: 350,
            spinSpeed: 10,
            holdOffset: 18,
            scale: 1,
            damage: 10
        };

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

            this.startProjectile();
        };

        this.onPointerUp = () => {
            this.releaseProjectile();
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

            this.updateAttackAnimation(delta);

            this.hitbox = this.sprite.getBounds();

            this.updateProjectiles(delta);
        };

        /* this.attachPart("/enemySprites/enemy1-1-attac-Sheet.png", 2, 3); */
    }

    setSceneContainer(container) {
        this.sceneContainer = container;
    }

    async init() {
        const idleTexture = await Assets.load('/playerSprites/player-idle-Sheet.png');
        const attackTexture = await Assets.load('/playerSprites/player-attack-Sheet.png');
        const projectileTexture = await Assets.load(this.projectileConfig.texturePath);

        this.idleFrames = this.createFrames(idleTexture, 4);
        this.attackFrames = this.createFrames(attackTexture, 9);
        this.projectileFrames = this.createFrames(projectileTexture, this.projectileConfig.frameCount);

        this.sprite = new AnimatedSprite(this.idleFrames);
        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(1);
        this.sprite.x = this.app.screen.width / 2;
        this.sprite.y = this.app.screen.height / 2;
        this.sprite.rotation = 0;
        this.sprite.animationSpeed = this.idleAnimationSpeed;
        this.sprite.loop = true;
        this.sprite.gotoAndPlay(0);
        this.hitbox = this.sprite.getBounds();
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);

        if (this.sprite) {
            this.sprite.tint = 0xFF6666;

            if (this.damageFlashTimer) {
                clearTimeout(this.damageFlashTimer);
            }

            this.damageFlashTimer = setTimeout(() => {
                if (this.sprite) {
                    this.sprite.tint = 0xFFFFFF;
                }

                this.damageFlashTimer = null;
            }, 120);
        }
    }

    startProjectile() {
        if (this.activeProjectile || this.projectileFrames.length === 0 || !this.sprite) return;

        const mouthPosition = this.getMouthPosition(this.projectileConfig.holdOffset);

        this.activeProjectile = new Projectile(
            this.app,
            this.getAttackParent(),
            this.projectileFrames,
            this.projectileConfig
        );

        this.activeProjectile.update(0, mouthPosition);
    }

    releaseProjectile() {
        if (!this.activeProjectile || !this.sprite) return;

        const angle = this.sprite.rotation - Math.PI / 2;

        this.activeProjectile.release(angle);
        this.projectiles.push(this.activeProjectile);
        this.activeProjectile = null;

        if (this.attackFrames.length > 0) {
            this.isAttacking = true;
            this.attackAnimationTimeLeft = this.attackAnimationDuration;
            this.sprite.textures = this.attackFrames;
            this.sprite.animationSpeed = this.attackAnimationSpeed;
            this.sprite.loop = false;
            this.sprite.gotoAndPlay(0);
        }
    }

    updateAttackAnimation(deltaTime) {
        if (!this.sprite || !this.isAttacking) return;

        this.attackAnimationTimeLeft -= deltaTime / 60;

        if (this.attackAnimationTimeLeft > 0) return;

        this.sprite.textures = this.idleFrames;
        this.sprite.animationSpeed = this.idleAnimationSpeed;
        this.sprite.loop = true;
        this.sprite.gotoAndPlay(0);
        this.isAttacking = false;
        this.attackAnimationTimeLeft = 0;
        this.sprite.onComplete = null;
    }

    updateProjectiles(deltaTime) {
        const mouthPosition = this.sprite ? this.getMouthPosition(this.projectileConfig.holdOffset) : null;

        if (this.activeProjectile) {
            this.activeProjectile.update(deltaTime, mouthPosition);
        }

        if (this.projectiles.length === 0) return;

        this.projectiles = this.projectiles.filter((projectile) => {
            const alive = projectile.update(deltaTime);

            if (!alive) {
                projectile.destroy();
                return false;
            }

            return true;
        });
    }

    removeProjectile(projectile) {
        const projectileIndex = this.projectiles.indexOf(projectile);

        if (projectileIndex !== -1) {
            this.projectiles.splice(projectileIndex, 1);
        }

        if (this.activeProjectile === projectile) {
            this.activeProjectile = null;
        }
    }

    getMouthPosition(offset = this.projectileConfig.holdOffset) {
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

    attachPart(sheetTexture, xOffset, yOffset) {
        const frameWidth = sheetTexture.width / 7;
        const frameHeight = sheetTexture.height;
        const frames = [];

        this.sprite.textures
    }
}
