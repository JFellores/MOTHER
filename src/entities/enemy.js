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
        this.specialView = null;
        this.specialMainView = null;
        this.specialHeadView = null;
        this.specialBodyView = null;
        this.specialTailView = null;
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

        if (this.spriteView) {
            this.spriteView.visible = true;
            this.spriteView.tint = 0xFFFFFF;
            this.spriteView.loop = true;
        }

        if (this.specialView) {
            this.specialView.visible = false;
            this.specialView.tint = 0xFFFFFF;
            this.specialView.loop = true;
        }

        if (this.specialMainView) this.specialMainView.visible = false;
        if (this.specialHeadView) this.specialHeadView.visible = false;
        if (this.specialBodyView) this.specialBodyView.visible = false;
        if (this.specialTailView) this.specialTailView.visible = false;
        /* this.sprite = new AnimatedSprite(this.idleFrames); */
    }

    update(playerX, playerY, deltaTime) {
        if (!this.active) return;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared);
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
                this.checkSpecialTriggers(playerX, playerY, distanceSquared);
                break;

            case 'CHARGE_SPIN':
                this.timer -= deltaSeconds;
                this.lookAt(playerX, playerY);
                this.specialRotation += (this.special?.chargeSpinSpeed ?? 10) * deltaSeconds;

                if (this.timer <= 0) {
                    this.beginRhinoLaserAttack();
                }
                break;

            case 'LASER_ATTACK':
                this.timer -= deltaSeconds;
                this.rotation = this.laserAimRotation;

                if (this.spriteView) {
                    this.spriteView.rotation = this.rotation;
                }

                if (this.laserDamageTickRemaining > 0) {
                    this.laserDamageTickRemaining = Math.max(0, this.laserDamageTickRemaining - deltaSeconds);
                }

                if (this.timer <= 0) {
                    this.beginRhinoLaserStop();
                }
                break;

            case 'LASER_STOP':
                this.timer -= deltaSeconds;
                this.rotation = this.laserAimRotation;

                if (this.spriteView) {
                    this.spriteView.rotation = this.rotation;
                }

                if (this.timer <= 0) {
                    this.state = 'CHASE';
                    this.specialCooldownRemaining = this.special?.cooldown ?? 4;
                }
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

                    if (distanceSquared <= ((this.special?.contactRange ?? 32) ** 2)) {
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
            const triggerRange = this.special.triggerRange ?? this.special.range ?? 160;

            if (this.state === 'CHASE' && dist <= (triggerRange * triggerRange)) {
                this.beginPreparation();
            }

            return;
        }

        if (this.special.type === 'RHINO_LASER') {
            const triggerRange = this.special.triggerRange ?? this.special.range ?? 220;

            if (this.state === 'CHASE' && dist <= (triggerRange * triggerRange)) {
                this.beginRhinoCharge();
            }

            return;
        }

        if (this.special.type === 'DASH' && this.specialCooldownRemaining > 0) {
            return;
        }

        if (this.special.type === 'DASH') {
            const stopRange = this.special.stopRange ?? this.special.range ?? 160;

            if (dist <= (stopRange * stopRange)) {
            this.state = 'WINDUP';
            this.timer = this.special.windup ?? 0.3;
            this.targetX = playerX;
            this.targetY = playerY;
            }
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

    beginRhinoCharge() {
        if (!this.special || this.special.type !== 'RHINO_LASER') {
            return;
        }

        this.state = 'CHARGE_SPIN';
        this.timer = this.special.chargeDuration ?? 8;
        this.laserHitDealt = false;
        this.specialRotation = 0;

        if (this.spriteView) {
            this.spriteView.tint = 0xFFFFFF;
        }
    }

    beginRhinoLaserAttack() {
        if (!this.special || this.special.type !== 'RHINO_LASER') {
            return;
        }

        this.state = 'LASER_ATTACK';
        this.timer = this.special.attackDuration ?? 1.2;
        this.laserHitDealt = false;
        this.laserAimRotation = this.rotation;
        this.specialRotation = -Math.PI / 2;
        this.laserDamageTickRemaining = 0;

        if (this.spriteView) {
            this.spriteView.tint = 0xFFFFFF;
        }
    }

    beginRhinoLaserStop() {
        if (!this.special || this.special.type !== 'RHINO_LASER') {
            return;
        }

        this.state = 'LASER_STOP';
        this.timer = this.special.stopDuration ?? 0.75;
        this.rotation = this.laserAimRotation;
        this.specialRotation = -Math.PI / 2;
        this.laserDamageTickRemaining = 0;

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

        this.damageTintTimer = duration;
        this.spriteView.tint = 0xFF6666;
    }

    stagger(duration = 0.6) {
        if (!this.active || this.type === 'rhino') return;

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

        if (this.spriteView) {
            this.spriteView.tint = 0xFFFFFF;
            this.spriteView.visible = false;
            this.spriteView.loop = true;
        }
    }
}