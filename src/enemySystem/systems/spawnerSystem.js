import { Assets, Rectangle, Sprite, Texture } from 'pixi.js';
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
        this.enemyTextures = new Map();

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
            enemy.stagger(0.33);
        }

        projectile.destroy();
        this.player.removeProjectile(projectile);

        return true;
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
            const texture = await Assets.load(config.sprite);
            const frameCount = config.frameCount ?? 1;
            const frameWidth = texture.width / frameCount;
            const frameHeight = texture.height;

            this.enemyTextures.set(config.type, new Texture({
                source: texture.source,
                frame: new Rectangle(0, 0, frameWidth, frameHeight)
            }));
        }
    }

    registerEnemy(enemy) {
        if (!this.enemies.includes(enemy)) {
            this.enemies.push(enemy);
        }

        this.syncEnemyView(enemy);
    }

    syncEnemyView(enemy) {
        const texture = this.enemyTextures.get(enemy.type);

        if (!texture) return;

        if (!enemy.spriteView) {
            enemy.spriteView = new Sprite(texture);
            enemy.spriteView.anchor.set(0.5);
            enemy.spriteView.scale.set(enemy.scale);
        } else {
            enemy.spriteView.texture = texture;
        }

        if (!enemy.spriteView.parent) {
            this.container.addChild(enemy.spriteView);
        }

        enemy.spriteView.visible = true;
        enemy.spriteView.x = enemy.x;
        enemy.spriteView.y = enemy.y;
        enemy.spriteView.rotation = enemy.rotation;
    }
}
