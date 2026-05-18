import { AnimatedSprite, Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import Projectile from './projectile.js';

export class Player {
    constructor(app) {
        this.app = app;
        this.sprite = null;
        this.bodySprite = null;
        this.partsContainer = null;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.damageFlashTimer = null;
        this.idleFrames = [];
        this.attackFrames = [];
        this.isAttacking = false;
        this.isPointerHolding = false;
        this.projectiles = [];
        this.activeProjectile = null;
        this.idleAnimationSpeed = 0.08;
        this.attackAnimationSpeed = 0.4;
        this.attackAnimationDuration = 0.35;
        this.attackAnimationTimeLeft = 0;
        this.moveSpeed = 4;
        this.hitbox = null;
        this.projectileFrames = [];
        this.attachedParts = [];
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

            this.isPointerHolding = true;
            this.app.renderer.events.setCursor('hold');
            this.startProjectile();
        };

        this.onPointerUp = () => {
            this.isPointerHolding = false;
            this.app.renderer.events.setCursor('default');
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

            if (this.bodySprite) {
                this.bodySprite.play();
            }

            this.updateAttachedParts(delta);

            const widthSource = this.bodySprite ?? this.sprite;
            const halfWidth = widthSource.width / 2;
            const halfHeight = widthSource.height / 2;

            this.sprite.x = Math.max(halfWidth, Math.min(this.app.screen.width - halfWidth, this.sprite.x));
            this.sprite.y = Math.max(halfHeight, Math.min(this.app.screen.height - halfHeight, this.sprite.y));

            if (this.mousePosition.active) {
                const dx = this.mousePosition.x - this.sprite.x;
                const dy = this.mousePosition.y - this.sprite.y;
                this.sprite.rotation = Math.atan2(dy, dx) + Math.PI / 2;
            }

            if (this.isPointerHolding) {
                this.app.renderer.events.setCursor('hold');
            }

            this.updateAttackAnimation(delta);

            this.hitbox = this.sprite.getBounds();

            this.updateProjectiles(delta);
        };
    }

    setSceneContainer(container) {
        this.sceneContainer = container;
    }

    async init() {
        const idleTexture = await Assets.load('/playerSprites/player-idle-Sheet.png');
        const attackTexture = await Assets.load('/playerSprites/player-attack-Sheet.png');
        const partTexture = await Assets.load('/enemySprites/enemy-1-idle-Sheet.png');
        const projectileTexture = await Assets.load(this.projectileConfig.texturePath);

        this.idleFrames = this.createFrames(idleTexture, 4);
        this.attackFrames = this.createFrames(attackTexture, 9);
        this.partFrames = this.createFrames(partTexture, 5);
        this.projectileFrames = this.createFrames(projectileTexture, this.projectileConfig.frameCount);

        this.sprite = new Container();
        this.bodySprite = new AnimatedSprite(this.idleFrames);
        this.partsContainer = new Container();

        this.bodySprite.anchor.set(0.5);
        this.bodySprite.scale.set(1);
        this.bodySprite.animationSpeed = this.idleAnimationSpeed;
        this.bodySprite.loop = true;
        this.bodySprite.gotoAndPlay(0);

        this.sprite.addChild(this.bodySprite);
        this.sprite.addChild(this.partsContainer);

        // Attach a small animated test part (example: shoulder/flare) above the body
        try {
            for (let i = 0; i < 1000; i++) {
                this.testPart = this.attachPart({
                    textures: this.partFrames,
                    x: Math.random() * 100,
                    y: Math.random() * 100,
                    animationSpeed: 0.12,
                    loop: true,
                    spinSpeed: 0,
                    rotation: Math.random() * Math.PI * 2,
                });
            }   
        } catch (err) {
            // non-fatal: if asset failed to load or attach, keep going
            this.testPart = null;
        }
        
        this.sprite.scale.set(1);
        this.sprite.x = this.app.screen.width / 2;
        this.sprite.y = this.app.screen.height / 2;
        this.sprite.rotation = 0;
        this.hitbox = this.sprite.getBounds();
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);

        if (this.bodySprite) {
            this.bodySprite.tint = 0xFF6666;

            if (this.damageFlashTimer) {
                clearTimeout(this.damageFlashTimer);
            }

            this.damageFlashTimer = setTimeout(() => {
                if (this.bodySprite) {
                    this.bodySprite.tint = 0xFFFFFF;
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
            this.bodySprite.textures = this.attackFrames;
            this.bodySprite.animationSpeed = this.attackAnimationSpeed;
            this.bodySprite.loop = false;
            this.bodySprite.gotoAndPlay(0);
        }
    }

    updateAttackAnimation(deltaTime) {
        if (!this.bodySprite || !this.isAttacking) return;

        this.attackAnimationTimeLeft -= deltaTime / 60;

        if (this.attackAnimationTimeLeft > 0) return;

        this.bodySprite.textures = this.idleFrames;
        this.bodySprite.animationSpeed = this.idleAnimationSpeed;
        this.bodySprite.loop = true;
        this.bodySprite.gotoAndPlay(0);
        this.isAttacking = false;
        this.attackAnimationTimeLeft = 0;
        this.bodySprite.onComplete = null;
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

    attachPart({
        textures = null,
        texture = null,
        x = 0,
        y = 0,
        rotation = 0,
        scale = 1,
        anchor = 0.5,
        animationSpeed = 0.1,
        loop = true,
        visible = true,
        spinSpeed = 0,
        parent = null
    } = {}) {
        const frames = Array.isArray(textures) ? textures : texture ? [texture] : [];
        const targetParent = parent ?? this.partsContainer ?? this.sprite;

        if (frames.length === 0 || !targetParent) {
            return null;
        }

        const part = frames.length > 1 ? new AnimatedSprite(frames) : new Sprite(frames[0]);

        if (part.anchor) {
            part.anchor.set(anchor);
        }

        part.position.set(x, y);
        part.rotation = rotation;
        part.scale.set(scale);
        part.visible = visible;
        part.spinSpeed = spinSpeed;

        if (part instanceof AnimatedSprite) {
            part.animationSpeed = animationSpeed;
            part.loop = loop;

            if (loop) {
                part.gotoAndPlay(0);
            } else {
                part.gotoAndStop(0);
            }
        }

        targetParent.addChild(part);
        this.attachedParts.push(part);

        return part;
    }

    detachPart(part) {
        const partIndex = this.attachedParts.indexOf(part);

        if (partIndex !== -1) {
            this.attachedParts.splice(partIndex, 1);
        }

        if (part?.parent) {
            part.parent.removeChild(part);
        }
    }

    updateAttachedParts(deltaTime) {
        const deltaSeconds = deltaTime / 60;

        for (const part of this.attachedParts) {
            if (part?.spinSpeed) {
                part.rotation += part.spinSpeed * deltaSeconds;
            }
        }
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
