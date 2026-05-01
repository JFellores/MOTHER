import { ENEMY_DATA } from '../enemySystem/data/enemyData.js';

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
        this.sprite = null;
        this.spriteView = null;
        this.onExplosion = null;
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
        this.sprite = config.sprite;
        this.special = config.special ?? null;
        this.active = true;
        this.state = 'CHASE';
        this.timer = 0;
        this.targetX = startX;
        this.targetY = startY;

        if (this.spriteView) {
            this.spriteView.visible = true;
        }
    }

    update(playerX, playerY, deltaTime) {
        if (!this.active) return;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        switch (this.state) {
            case 'CHASE':
                this.lookAt(playerX, playerY);
                this.moveToward(dx, dy, distance, this.speed, deltaTime);
                this.checkSpecialTriggers(playerX, playerY, distance);
                break;

            case 'DASHING': {
                const dashDx = this.targetX - this.x;
                const dashDy = this.targetY - this.y;
                const dashDistance = Math.sqrt(dashDx * dashDx + dashDy * dashDy);

                this.lookAt(this.targetX, this.targetY);
                this.moveToward(dashDx, dashDy, dashDistance, this.special?.dashSpeed ?? this.speed, deltaTime);
                this.timer -= deltaTime / 60;

                if (this.timer <= 0) {
                    this.state = 'CHASE';
                }
                break;
            }

            case 'EXPLODING':
                this.timer -= deltaTime / 60;

                if (this.timer <= 0) {
                    this.doExplosionDamage();
                    this.die();
                }
                break;
        }
    }

    checkSpecialTriggers(playerX, playerY, dist) {
        if (!this.special) return;

        if (this.special.type === 'EXPLODE' && dist < this.special.range) {
            this.state = 'EXPLODING';
            this.timer = this.special.fuse ?? 1.0;
            return;
        }

        if (this.special.type === 'DASH' && dist < this.special.range) {
            this.state = 'DASHING';
            this.timer = this.special.duration ?? 0.5;
            this.targetX = playerX;
            this.targetY = playerY;
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
        if (!this.active) return;

        const dx = targetX - this.x;
        const dy = targetY - this.y;

        this.rotation = Math.atan2(dy, dx) + Math.PI / 2;

        if (this.spriteView) {
            this.spriteView.rotation = this.rotation;
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }

    doExplosionDamage() {
        if (typeof this.onExplosion === 'function') {
            this.onExplosion(this);
        }
    }

    die() {
        this.active = false;
        this.state = 'IDLE';

        if (this.spriteView) {
            this.spriteView.visible = false;
        }
    }
}