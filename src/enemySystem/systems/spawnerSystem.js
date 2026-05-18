import { AnimatedSprite, Assets, Rectangle, Texture } from 'pixi.js';
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
                enemy.lookAt(playerX, playerY);
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

        if (typeof enemy.stagger === 'function') {
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
            
            const attackFrameCount = config.attackFrameCount ?? 1;
            const frameCount = config.frameCount ?? 1;
            console.log(config.attackURL);
            // todo: add second map for attacking state
            this.enemyFrames.set(config.type, this.createFrames(sheetTexture, frameCount));
            if (config.attackURL) {
                const attackTexture = await Assets.load(config.attackURL);
                const frameCount = config.frameCount ?? 1;
                this.enemyAttackFrames.set(config.type, this.createFrames(attackTexture, config.attackFrameCount ?? 1));
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

        if (enemy.state === 'WINDUP') {
            if (enemy.prevState !== 'WINDUP' || enemy.spriteView.textures !== attackFrames) {
                enemy.spriteView.textures = attackFrames ?? animationFrames;
                enemy.spriteView.animationSpeed = 0.16;
                enemy.spriteView.loop = true;
                enemy.spriteView.gotoAndPlay(3);
            }

            enemy.prevState = 'WINDUP';
        } else if (enemy.state === 'DASHING') {
            if (enemy.prevState !== 'DASHING' || enemy.spriteView.textures !== attackFrames) {
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
            if (enemy.prevState === 'DASHING' || enemy.prevState === 'EXPLODING' || enemy.spriteView.textures !== animationFrames) {
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

    
}
