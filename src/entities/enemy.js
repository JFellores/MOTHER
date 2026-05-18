import { ENEMY_DATA } from '../enemySystem/data/enemyData.js';
import createEnemyBehavior from './behaviors/createEnemyBehavior.js';

export default class Enemy {
    constructor() {
        this.active = false;
        this.state = 'IDLE';
        this.special = null;
        this.timer = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.rotation = 0;
        this.x = 0;
        this.y = 0;
        this.type = null;
        this.health = 0;
        this.speed = 0;
        this.spriteURL = null;
        this.spriteView = null;
        this.frameCount = 0;
        this.idleFrames = [];
        this.attackFrames = [];
        this.onExplosion = null;
        this.scale = 1;
        this.behavior = null;
        this.specialView = null;
        this.extraViews = {};
        this.tintResetTimer = null;
        this.specialCooldownRemaining = 0;
        this.prevState = 'NONE';
        this.flashAccumulator = 0;
        this.flashOn = false;
        this.laserHitDealt = false;
        this.specialRotation = 0;
        this.laserAimRotation = 0;
        this.laserDamageTickRemaining = 0;
        this.damageTintTimer = 0;
    }

    init(enemyTypeOrConfig, startX, startY) {
        const config = typeof enemyTypeOrConfig === 'string'
            ? ENEMY_DATA[enemyTypeOrConfig]
            : enemyTypeOrConfig;

        if (!config) {
            throw new Error(`Unknown enemy config: ${enemyTypeOrConfig}`);
        }

        this.x = startX;
        this.y = startY;
        this.type = config.type;
        this.health = config.health;
        this.speed = config.speed;
        this.spriteURL = config.spriteURL; // sprite url
        this.frameCount = config.frameCount ?? 1;
        this.special = config.special ?? null;
        this.behavior = createEnemyBehavior(this.special);
        this.active = true;
        this.state = 'CHASE';
        this.timer = 0;
        this.targetX = startX;
        this.targetY = startY;
        this.tintResetTimer = null;
        this.specialCooldownRemaining = 0;
        this.prevState = 'NONE';
        this.flashAccumulator = 0;
        this.flashOn = false;
        this.laserHitDealt = false;
        this.specialRotation = 0;
        this.laserAimRotation = 0;
        this.laserDamageTickRemaining = 0;
        this.damageTintTimer = 0;
        this.extraViews = {};

        if (this.spriteView) {
            this.spriteView.visible = true;
            this.spriteView.tint = 0xFFFFFF;
            this.spriteView.loop = true;
        }

        if (this.specialView) {
            this.specialView.removeChildren();
            this.specialView.visible = false;
            this.specialView.tint = 0xFFFFFF;
            this.specialView.loop = true;
        }
        /* this.sprite = new AnimatedSprite(this.idleFrames); */
    }

    update(playerX, playerY, deltaTime) {
        if (!this.active) return;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distanceSquared = dx * dx + dy * dy;
        const getDistance = () => Math.sqrt(distanceSquared);
        const deltaSeconds = deltaTime / 60;

        if (this.damageTintTimer > 0) {
            this.damageTintTimer = Math.max(0, this.damageTintTimer - deltaSeconds);

            if (this.damageTintTimer <= 0 && this.spriteView) {
                this.spriteView.tint = 0xFFFFFF;
            }
        }

        if (this.specialCooldownRemaining > 0) {
            this.specialCooldownRemaining = Math.max(0, this.specialCooldownRemaining - deltaSeconds);
        }

        switch (this.state) {
            case 'STAGGER':
                this.timer -= deltaSeconds;

                if (this.timer <= 0) {
                    this.state = 'CHASE';
                }
                break;

            case 'CHASE':
                this.lookAt(playerX, playerY);
                this.moveToward(dx, dy, getDistance(), this.speed, deltaTime);
                this.checkSpecialTriggers(playerX, playerY, distanceSquared);
                break;
        }

        if (this.behavior?.handlesState?.(this.state)) {
            this.behavior.update(this, {
                playerX,
                playerY,
                dx,
                dy,
                    getDistance,
                distanceSquared,
                deltaTime,
                deltaSeconds
            });
        }
    }

    checkSpecialTriggers(playerX, playerY, dist) {
        if (!this.special) return;
        if (this.behavior?.checkTrigger?.(this, playerX, playerY, dist)) {
            return;
        }
    }

    moveToward(dx, dy, dist, speed, deltaTime) {
        if (dist > 1) {
            const movementScale = deltaTime / 60;

            this.x += (dx / dist) * speed * movementScale;
            this.y += (dy / dist) * speed * movementScale;
        }
    }

    lookAt(targetX, targetY) {
        if (!this.active || this.state === 'STAGGER') return;

        const dx = targetX - this.x;
        const dy = targetY - this.y;

        this.rotation = Math.atan2(dy, dx) + Math.PI / 2;

        if (this.spriteView) {
            this.spriteView.rotation = this.rotation;
        }
    }

    takeDamage(amount) {
        if (!this.active) return;

        this.health -= amount;
                this.takeDamageTint(0.6);

        if (this.health <= 0) {
          this.die();
        }
    }

    takeDamageTint(duration) {
        if (!this.spriteView) return;

        this.damageTintTimer = duration;
        this.spriteView.tint = 0xFF6666;
    }

    canBeStaggered() {
        return this.behavior?.allowsProjectileStagger?.() ?? true;
    }

    stagger(duration = 0.6) {
        if (!this.active || !this.canBeStaggered()) return;

        this.state = 'STAGGER';
        this.timer = duration;
    }

    doExplosionDamage() {
        if (typeof this.onExplosion === 'function') {
            this.onExplosion(this);
        }
    }

    die() {
        this.active = false;
        this.state = 'IDLE';
        this.prevState = 'NONE';
        this.flashAccumulator = 0;
        this.flashOn = false;
        this.laserHitDealt = false;
        this.damageTintTimer = 0;
        this.laserDamageTickRemaining = 0;

        if (this.specialView) {
            this.specialView.removeChildren();
            this.specialView.visible = false;
        }

        if (this.spriteView) {
            this.spriteView.tint = 0xFFFFFF;
            this.spriteView.visible = false;
            this.spriteView.loop = true;
        }
    }
}