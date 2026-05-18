import { AnimatedSprite, Assets, Container, Rectangle, Texture } from 'pixi.js';
import ObjectPool from '../factories/objectPool.js';
import EnemyFactory from '../factories/enemyFactory.js';
import HordeManager from '../managers/hordeManager.js';
import WaveManager from '../managers/waveManager.js';
import { ENEMY_DATA } from '../data/enemyData.js';

export default class SpawnerSystem {
    constructor(app, container, player) {
        this.app = app;
        this.container = container;
        this.player = player;
        this.enemies = [];
        this.enemyFrames = new Map();
        this.enemyAttackFrames = new Map();
        this.enemyExplosionFrames = new Map();
        this.enemySpecialFrames = new Map();

        this.pool = new ObjectPool();
        this.factory = new EnemyFactory(this.pool);
        this.horde = new HordeManager(this.factory, {
            maxEnemies: 500,
            spawnRadius: 600,
            onSpawn: (enemy) => this.registerEnemy(enemy)
        });
        this.waveManager = new WaveManager(this.horde);

        this.update = (ticker) => {
            if (!this.player.sprite) return;

            const deltaTime = ticker.deltaTime;
            const deltaSeconds = deltaTime / 60;
            const playerX = this.player.sprite.x;
            const playerY = this.player.sprite.y;

            this.enemies = this.enemies.filter((enemy) => enemy.active);
            this.waveManager.update(deltaSeconds, playerX, playerY, this.enemies.length);

            for (const enemy of this.enemies) {
                enemy.update(playerX, playerY, deltaTime);
                if (!enemy.active) {
                    if (enemy.spriteView) {
                        enemy.spriteView.visible = false;
                    }

                    continue;
                }
                this.syncEnemyView(enemy);
            }

            this.checkProjectileHits();
            this.checkEnemyPlayerHits();
        };
    }

    async init() {
        await this.loadEnemyTextures();
        this.pool.preWarm(12);
    }

    checkProjectileHits() {
        if (!this.player.projectiles.length) return;

        for (const projectile of [...this.player.projectiles]) {
            if (!projectile?.sprite) continue;

            const projectileBox = projectile.getBounds();

            for (const enemy of this.enemies) {
                if (!enemy?.spriteView || !enemy.active) continue;

                this.hitEntity(projectile, projectileBox, enemy, this.getSpriteBox(enemy.spriteView, enemy.scale));

                if (!projectile.sprite.parent) {
                    break;
                }
            }
        }
    }

    checkEnemyPlayerHits() {
        if (!this.player.sprite || !this.player.hitbox) return;

        const playerBox = this.player.hitbox;

        for (const enemy of this.enemies) {
            if (!enemy?.active || !enemy?.spriteView) continue;

            if (enemy.special?.type !== 'DASH' || enemy.state !== 'DASHING') continue;

            if (!this.boxesOverlap(playerBox, this.getSpriteBox(enemy.spriteView, enemy.scale))) {
                continue;
            }

            this.player.takeDamage(enemy.special.damage ?? 10);
            break;
        }

        for (const enemy of this.enemies) {
            if (!enemy?.active || !enemy?.spriteView) continue;

            if (enemy.special?.type !== 'RHINO_LASER' || enemy.state !== 'LASER_ATTACK') continue;

            const laserBox = this.getAttackBox(enemy);

            if (!laserBox || !this.boxesOverlap(playerBox, laserBox)) {
                continue;
            }

            if (enemy.laserDamageTickRemaining <= 0) {
                this.player.takeDamage(enemy.special.damage ?? 24);
                enemy.laserDamageTickRemaining = enemy.special.damageTickInterval ?? 0.15;
            }

            break;
        }

        for (const enemy of this.enemies) {
            if (!enemy?.active || !enemy?.spriteView) continue;

            if (enemy.special?.type !== 'EXPLODE' || enemy.state !== 'RUSH') continue;

            if (!this.boxesOverlap(playerBox, this.getSpriteBox(enemy.spriteView, enemy.scale))) {
                continue;
            }

            enemy.beginExplosion?.();
            break;
        }
    }

    hitEntity(projectile, projectileBox, enemy, enemyBox) {
        if (!projectile?.sprite || !enemy?.spriteView) return false;

        if (!this.boxesOverlap(projectileBox, enemyBox)) {
            return false;
        }

        const damage = projectile.damage ?? 1;

        if (typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(damage);
        } else {
            enemy.health -= damage;

            if (enemy.health <= 0 && typeof enemy.die === 'function') {
                enemy.die();
            }
        }

        if (enemy.special?.type !== 'RHINO_LASER' && typeof enemy.stagger === 'function') {
            enemy.stagger(0.6);
        }

        projectile.destroy();
        this.player.removeProjectile(projectile);

        return true;
    }

    handleEnemyExplosion(enemy) {
        if (!enemy?.special || enemy.special.type !== 'EXPLODE') {
            return;
        }

        const explosionRange = enemy.special.explosionRange ?? enemy.special.range ?? 90;
        const explosionDamage = enemy.special.damage ?? 10;

        if (this.player?.sprite) {
            const playerDistance = Math.hypot(this.player.sprite.x - enemy.x, this.player.sprite.y - enemy.y);

            if (playerDistance <= explosionRange) {
                this.player.takeDamage(explosionDamage);
            }
        }

        for (const otherEnemy of this.enemies) {
            if (!otherEnemy?.active || otherEnemy === enemy) continue;

            const enemyDistance = Math.hypot(otherEnemy.x - enemy.x, otherEnemy.y - enemy.y);

            if (enemyDistance <= explosionRange) {
                otherEnemy.takeDamage(explosionDamage);
            }
        }
    }

    getSpriteBox(sprite, scale) {
        const width = sprite.width * (scale / 4);
        const height = sprite.height * (scale / 4);

        return {
            left: sprite.x - width / 2,
            right: sprite.x + width / 2,
            top: sprite.y - height / 2,
            bottom: sprite.y + height / 2
        };
    }

    getAttackBox(enemy) {
        const attackSprite = enemy.specialView ?? enemy.spriteView;

        if (!attackSprite || typeof attackSprite.getBounds !== 'function') {
            return null;
        }

        const bounds = attackSprite.getBounds();

        return {
            left: bounds.x,
            right: bounds.x + bounds.width,
            top: bounds.y,
            bottom: bounds.y + bounds.height
        };
    }

    boxesOverlap(a, b) {
        return (
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top
        );
    }

    async loadEnemyTextures() {
        for (const config of Object.values(ENEMY_DATA)) {
            const sheetTexture = await Assets.load(config.spriteURL);
            const frameCount = config.frameCount ?? 1;

            this.enemyFrames.set(config.type, this.createFrames(sheetTexture, frameCount));
            if (config.attackURL) {
                const attackTexture = await Assets.load(config.attackURL);
                this.enemyAttackFrames.set(config.type, this.createFrames(attackTexture, config.attackFrameCount ?? 1));
            }

            if (config.special?.animations) {
                const specialFrames = {};

                for (const [stateName, animationConfig] of Object.entries(config.special.animations)) {
                    if (animationConfig.parts) {
                        const parts = {};

                        for (const [partName, partConfig] of Object.entries(animationConfig.parts)) {
                            const partTexture = await Assets.load(partConfig.url);
                            parts[partName] = {
                                frames: this.createFrames(partTexture, partConfig.frameCount ?? 1),
                                animationSpeed: partConfig.animationSpeed ?? animationConfig.animationSpeed ?? 0.12,
                                loop: partConfig.loop ?? animationConfig.loop ?? true,
                                anchorX: partConfig.anchorX ?? 0,
                                anchorY: partConfig.anchorY ?? 0.5,
                                scaleX: partConfig.scaleX ?? 1,
                                scaleY: partConfig.scaleY ?? 1
                            };
                        }

                        specialFrames[stateName] = {
                            segmented: true,
                            animationSpeed: animationConfig.animationSpeed ?? 0.12,
                            loop: animationConfig.loop ?? true,
                            parts
                        };
                    } else {
                        const specialTexture = await Assets.load(animationConfig.url);
                        specialFrames[stateName] = {
                            frames: this.createFrames(specialTexture, animationConfig.frameCount ?? 1),
                            animationSpeed: animationConfig.animationSpeed ?? 0.12,
                            loop: animationConfig.loop ?? true,
                            anchorX: animationConfig.anchorX ?? 0.5,
                            anchorY: animationConfig.anchorY ?? 0.5,
                            scaleX: animationConfig.scaleX ?? 1,
                            scaleY: animationConfig.scaleY ?? 1
                        };
                    }
                }

                this.enemySpecialFrames.set(config.type, specialFrames);
            }

            if (config.special?.explosionURL) {
                const explosionTexture = await Assets.load(config.special.explosionURL);
                this.enemyExplosionFrames.set(
                    config.type,
                    this.createFrames(explosionTexture, config.special.explosionFrameCount ?? 8)
                );
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

    registerEnemy(enemy) {
        if (!this.enemies.includes(enemy)) {
            this.enemies.push(enemy);
        }

        enemy.onExplosion = (explodingEnemy) => this.handleEnemyExplosion(explodingEnemy);

        this.syncEnemyView(enemy);
    }

    syncEnemyView(enemy) {
        const animationFrames = this.enemyFrames.get(enemy.type);
        const attackFrames = this.enemyAttackFrames.get(enemy.type);
        const explosionFrames = this.enemyExplosionFrames.get(enemy.type);
        const specialFrames = this.enemySpecialFrames.get(enemy.type);

        if (!animationFrames) return;

        if (!enemy.spriteView) {
            enemy.spriteView = new AnimatedSprite(animationFrames);
            enemy.spriteView.anchor.set(0.5);
            enemy.spriteView.scale.set(enemy.scale);
            enemy.spriteView.animationSpeed = 0.12;
            enemy.spriteView.loop = true;
        } else {
            /* enemy.spriteView.textures = animationFrames; */
            
        }

        if (!enemy.specialView) {
            enemy.specialView = new Container();
            enemy.spriteView.addChild(enemy.specialView);
        }

        const specialAnimation = specialFrames?.[enemy.state];

        if (specialAnimation?.segmented) {
            const { head, body, tail } = specialAnimation.parts;

            if (!enemy.specialHeadView) {
                enemy.specialHeadView = new AnimatedSprite(head.frames);
                enemy.specialView.addChild(enemy.specialHeadView);
            }

            if (!enemy.specialBodyView) {
                enemy.specialBodyView = new AnimatedSprite(body.frames);
                enemy.specialView.addChild(enemy.specialBodyView);
            }

            if (!enemy.specialTailView) {
                enemy.specialTailView = new AnimatedSprite(tail.frames);
                enemy.specialView.addChild(enemy.specialTailView);
            }

            enemy.specialHeadView.visible = true;
            enemy.specialBodyView.visible = true;
            enemy.specialTailView.visible = true;

            enemy.specialHeadView.anchor.set(head.anchorX ?? 0, head.anchorY ?? 0.5);
            enemy.specialBodyView.anchor.set(body.anchorX ?? 0, body.anchorY ?? 0.5);
            enemy.specialTailView.anchor.set(tail.anchorX ?? 0, tail.anchorY ?? 0.5);

            enemy.specialHeadView.scale.set(head.scaleX ?? 1, head.scaleY ?? 1);
            enemy.specialBodyView.scale.set(body.scaleX ?? 1, body.scaleY ?? 1);
            enemy.specialTailView.scale.set(tail.scaleX ?? 1, tail.scaleY ?? 1);

            if (enemy.prevState !== enemy.state || enemy.specialHeadView.textures !== head.frames) {
                enemy.specialHeadView.textures = head.frames;
                enemy.specialHeadView.animationSpeed = head.animationSpeed ?? specialAnimation.animationSpeed;
                enemy.specialHeadView.loop = head.loop ?? specialAnimation.loop;
                enemy.specialHeadView.gotoAndPlay(0);
            }

            if (enemy.prevState !== enemy.state || enemy.specialBodyView.textures !== body.frames) {
                enemy.specialBodyView.textures = body.frames;
                enemy.specialBodyView.animationSpeed = body.animationSpeed ?? specialAnimation.animationSpeed;
                enemy.specialBodyView.loop = body.loop ?? specialAnimation.loop;
                enemy.specialBodyView.gotoAndPlay(0);
            }

            if (enemy.prevState !== enemy.state || enemy.specialTailView.textures !== tail.frames) {
                enemy.specialTailView.textures = tail.frames;
                enemy.specialTailView.animationSpeed = tail.animationSpeed ?? specialAnimation.animationSpeed;
                enemy.specialTailView.loop = tail.loop ?? specialAnimation.loop;
                enemy.specialTailView.gotoAndPlay(0);
            }

            const headWidth = enemy.specialHeadView.width;
            const bodyWidth = enemy.specialBodyView.width;

            enemy.specialHeadView.x = 0;
            enemy.specialBodyView.x = headWidth;
            enemy.specialTailView.x = headWidth + bodyWidth;

            enemy.specialView.visible = true;
            enemy.specialView.x = 0;
            enemy.specialView.y = this.getSpecialFxYOffset(enemy);
            enemy.specialView.rotation = enemy.specialRotation ?? 0;

            enemy.specialMainView?.visible && (enemy.specialMainView.visible = false);
            enemy.prevState = enemy.state;
        } else if (specialAnimation) {
            if (!enemy.specialMainView) {
                enemy.specialMainView = new AnimatedSprite(specialAnimation.frames);
                enemy.specialView.addChild(enemy.specialMainView);
            }

            enemy.specialMainView.visible = true;
            enemy.specialMainView.anchor.set(specialAnimation.anchorX ?? 0.5, specialAnimation.anchorY ?? 0.5);
            enemy.specialMainView.scale.set(specialAnimation.scaleX ?? 1, specialAnimation.scaleY ?? 1);

            if (enemy.prevState !== enemy.state || enemy.specialMainView.textures !== specialAnimation.frames) {
                enemy.specialMainView.textures = specialAnimation.frames;
                enemy.specialMainView.animationSpeed = specialAnimation.animationSpeed;
                enemy.specialMainView.loop = specialAnimation.loop;
                enemy.specialMainView.gotoAndPlay(0);
            }

            enemy.specialHeadView && (enemy.specialHeadView.visible = false);
            enemy.specialBodyView && (enemy.specialBodyView.visible = false);
            enemy.specialTailView && (enemy.specialTailView.visible = false);

            enemy.specialView.visible = true;
            enemy.specialView.x = 0;
            enemy.specialView.y = this.getSpecialFxYOffset(enemy);
            enemy.specialView.rotation = enemy.specialRotation ?? 0;

            enemy.specialMainView.play();
            enemy.prevState = enemy.state;
        } else if (enemy.specialView) {
            enemy.specialView.visible = false;
            enemy.specialMainView && (enemy.specialMainView.visible = false);
            enemy.specialHeadView && (enemy.specialHeadView.visible = false);
            enemy.specialBodyView && (enemy.specialBodyView.visible = false);
            enemy.specialTailView && (enemy.specialTailView.visible = false);
        }

        if (enemy.state === 'WINDUP') {
            if (enemy.prevState !== 'WINDUP' || enemy.spriteView.textures !== (attackFrames ?? animationFrames)) {
                enemy.spriteView.textures = attackFrames ?? animationFrames;
                enemy.spriteView.animationSpeed = 0.16;
                enemy.spriteView.loop = true;
                enemy.spriteView.gotoAndPlay(3);
            }

            enemy.prevState = 'WINDUP';
        } else if (enemy.state === 'DASHING') {
            if (enemy.prevState !== 'DASHING' || enemy.spriteView.textures !== (attackFrames ?? animationFrames)) {
                enemy.spriteView.textures = attackFrames ?? animationFrames;
                enemy.spriteView.animationSpeed = 0.16;
                enemy.spriteView.loop = true;
                enemy.spriteView.gotoAndPlay(4);
            }

            enemy.prevState = 'DASHING';
        } else if (enemy.state === 'STAGGER') {
            if (enemy.spriteView.textures !== animationFrames) {
                enemy.spriteView.textures = animationFrames;
                enemy.spriteView.animationSpeed = 0.12;
                enemy.spriteView.loop = true;
            }

            enemy.spriteView.tint = 0xFF6666;
            enemy.prevState = 'STAGGER';
        } else if (enemy.state === 'EXPLODING' && explosionFrames) {
            if (enemy.prevState !== 'EXPLODING' || enemy.spriteView.textures !== explosionFrames) {
                enemy.spriteView.textures = explosionFrames;
                enemy.spriteView.animationSpeed = 0.18;
                enemy.spriteView.loop = false;
                enemy.spriteView.gotoAndPlay(0);
            }

            enemy.spriteView.tint = 0xFFFFFF;
            enemy.prevState = 'EXPLODING';
        } else {
            if (enemy.spriteView.textures !== animationFrames) {
                enemy.spriteView.textures = animationFrames;
                enemy.spriteView.animationSpeed = 0.12;
                enemy.spriteView.loop = true;
                enemy.spriteView.gotoAndPlay(0);
            }

            if (enemy.state !== 'PREPARING') {
                enemy.spriteView.tint = 0xFFFFFF;
            }

            enemy.prevState = enemy.state;
        }

        if (!enemy.spriteView.parent) {
            this.container.addChild(enemy.spriteView);
        }

        enemy.spriteView.play();
        enemy.spriteView.visible = true;
        enemy.spriteView.x = enemy.x;
        enemy.spriteView.y = enemy.y;
        enemy.spriteView.rotation = enemy.rotation;
    }

    getSpecialFxYOffset(enemy) {
        if (enemy.state === 'CHARGE_SPIN') {
            return -26 / (enemy.scale || 1);
        }

        if (enemy.state === 'LASER_ATTACK') {
            return -30 / (enemy.scale || 1);
        }

        if (enemy.state === 'LASER_STOP') {
            return -30 / (enemy.scale || 1);
        }

        return 0;
    }

    
}
