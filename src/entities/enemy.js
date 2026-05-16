import { Texture, Rectangle } from 'pixi.js';
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
        this.spriteURL = null;
        this.spriteView = null;
        this.frameCount = 0;
        this.idleFrames = [];
        this.attackFrames = [];
        this.onExplosion = null;
        this.scale = 1;
        this.tintResetTimer = null;
        this.specialCooldownRemaining = 0;
        this.prevState = 'NONE';
        this.flashAccumulator = 0;
        this.flashOn = false;
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

        if (this.spriteView) {
            this.spriteView.visible = true;
            this.spriteView.tint = 0xFFFFFF;
            this.spriteView.loop = true;
        }
        /* this.sprite = new AnimatedSprite(this.idleFrames); */
    }

    update(playerX, playerY, deltaTime) {
        if (!this.active) return;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const deltaSeconds = deltaTime / 60;

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

            case 'WINDUP':
                this.timer -= deltaSeconds;
                this.lookAt(playerX, playerY);

                if (this.timer <= 0) {
                    this.beginDash(playerX, playerY);
                }
                break;

            case 'CHASE':
                this.lookAt(playerX, playerY);
                this.moveToward(dx, dy, distance, this.speed, deltaTime);
                this.checkSpecialTriggers(playerX, playerY, distance);
                break;

                case 'PREPARING':
                    this.timer -= deltaSeconds;
                    this.lookAt(playerX, playerY);

                    this.flashAccumulator += deltaSeconds;

                    if (this.flashAccumulator >= (this.special?.flashInterval ?? 0.15)) {
                        this.flashAccumulator = 0;
                        this.flashOn = !this.flashOn;

                        if (this.spriteView) {
                            this.spriteView.tint = this.flashOn ? 0xFF4A4A : 0xFFFFFF;
                        }
                    }

                    if (this.timer <= 0) {
                        if (this.spriteView) {
                            this.spriteView.tint = 0xFFFFFF;
                        }

                        this.state = 'RUSH';
                        this.timer = this.special?.rushDuration ?? 2.5;
                    }
                    break;

                case 'RUSH':
                    this.lookAt(playerX, playerY);
                    this.moveToward(
                        dx,
                        dy,
                        distance,
                        this.speed * (this.special?.rushSpeedMultiplier ?? 2.4),
                        deltaTime
                    );
                    this.timer -= deltaSeconds;

                    if (distance <= (this.special?.contactRange ?? 32)) {
                        this.beginExplosion();
                        break;
                    }

                    if (this.timer <= 0) {
                        this.beginExplosion();
                    }
                    break;

            case 'DASHING': {
                const dashDx = this.targetX - this.x;
                const dashDy = this.targetY - this.y;
                const dashDistance = Math.sqrt(dashDx * dashDx + dashDy * dashDy);

                this.lookAt(this.targetX, this.targetY);
                this.moveToward(dashDx, dashDy, dashDistance, this.special?.dashSpeed ?? this.speed, deltaTime);
                this.timer -= deltaSeconds;

                if (this.timer <= 0) {
                    this.state = 'RECOVERY';
                    this.timer = this.special?.recovery ?? 0.2;
                }
                break;
            }

            case 'RECOVERY':
                this.timer -= deltaSeconds;

                if (this.timer <= 0) {
                    this.state = 'CHASE';
                }
                break;

            case 'EXPLODING':
                this.timer -= deltaSeconds;

                if (this.timer <= 0) {
                    this.doExplosionDamage();
                    this.die();
                }
                break;
        }
    }

    checkSpecialTriggers(playerX, playerY, dist) {
        if (!this.special) return;

        if (this.special.type === 'EXPLODE') {
            if (this.state === 'CHASE' && dist <= (this.special.triggerRange ?? this.special.range ?? 160)) {
                this.beginPreparation();
            }

            return;
        }

        if (this.special.type === 'DASH' && this.specialCooldownRemaining > 0) {
            return;
        }

        if (this.special.type === 'DASH' && dist <= (this.special.stopRange ?? this.special.range ?? 160)) {
            this.state = 'WINDUP';
            this.timer = this.special.windup ?? 0.3;
            this.targetX = playerX;
            this.targetY = playerY;
        }
    }

    beginPreparation() {
        if (!this.special || this.special.type !== 'EXPLODE') {
            return;
        }

        this.state = 'PREPARING';
        this.timer = this.special.prepDuration ?? 1.5;
        this.flashAccumulator = 0;
        this.flashOn = false;

        if (this.spriteView) {
            this.spriteView.tint = 0xFFFFFF;
        }
    }

    beginExplosion() {
        if (!this.special || this.special.type !== 'EXPLODE' || this.state === 'EXPLODING') {
            return;
        }

        this.state = 'EXPLODING';
        this.timer = this.special.explosionDuration ?? 0.55;
        this.flashAccumulator = 0;
        this.flashOn = false;

        if (this.spriteView) {
            this.spriteView.tint = 0xFFFFFF;
        }
    }

    beginDash(playerX, playerY) {
        if (!this.special || this.special.type !== 'DASH') {
            this.state = 'CHASE';
            return;
        }

        this.state = 'DASHING';
        this.timer = this.special.dashDuration ?? 0.25;
        this.specialCooldownRemaining = this.special.cooldown ?? 5;
        this.targetX = playerX;
        this.targetY = playerY;
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

        if (this.tintResetTimer) {
            clearTimeout(this.tintResetTimer);
        }

        this.spriteView.tint = 0xFF6666;

        this.tintResetTimer = setTimeout(() => {
            if (this.spriteView) {
                this.spriteView.tint = 0xFFFFFF;
            }
            this.tintResetTimer = null;
        }, duration * 1000);
    }

    stagger(duration = 0.6) {
        if (!this.active) return;

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

        if (this.tintResetTimer) {
            clearTimeout(this.tintResetTimer);
            this.tintResetTimer = null;
        }

        if (this.spriteView) {
            this.spriteView.tint = 0xFFFFFF;
            this.spriteView.visible = false;
            this.spriteView.loop = true;
        }
    }
}