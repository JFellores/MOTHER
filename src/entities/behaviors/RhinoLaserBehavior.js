import EnemyBehavior from './EnemyBehavior.js';

export default class RhinoLaserBehavior extends EnemyBehavior {
    handlesState(state) {
        return state === 'CHARGE_SPIN' || state === 'LASER_ATTACK' || state === 'LASER_STOP';
    }

    checkTrigger(enemy, playerX, playerY, distanceSquared) {
        if (!enemy.special || enemy.special.type !== 'RHINO_LASER') {
            return false;
        }

        const triggerRange = enemy.special.triggerRange ?? enemy.special.range ?? 220;

        if (enemy.state === 'CHASE' && distanceSquared <= (triggerRange * triggerRange)) {
            this.beginCharge(enemy);
            return true;
        }

        return false;
    }

    update(enemy, context) {
        switch (enemy.state) {
            case 'CHARGE_SPIN':
                enemy.timer -= context.deltaSeconds;
                enemy.lookAt(context.playerX, context.playerY);
                {
                    const stopRange = enemy.special?.stopRange ?? 180;
                    const distance = context.getDistance();

                    if (distance > stopRange) {
                        const movementScale = context.deltaTime / 60;
                        const maxStep = enemy.speed * movementScale;
                        const step = Math.min(maxStep, distance - stopRange);

                        if (distance > 1) {
                            enemy.x += (context.dx / distance) * step;
                            enemy.y += (context.dy / distance) * step;
                        }
                    }
                }
                enemy.specialRotation += (enemy.special?.chargeSpinSpeed ?? 10) * context.deltaSeconds;

                if (enemy.timer <= 0) {
                    this.beginLaserAttack(enemy);
                }
                break;

            case 'LASER_ATTACK':
                enemy.timer -= context.deltaSeconds;
                enemy.rotation = enemy.laserAimRotation;

                if (enemy.spriteView) {
                    enemy.spriteView.rotation = enemy.rotation;
                }

                if (enemy.laserDamageTickRemaining > 0) {
                    enemy.laserDamageTickRemaining = Math.max(0, enemy.laserDamageTickRemaining - context.deltaSeconds);
                }

                if (enemy.timer <= 0) {
                    this.beginLaserStop(enemy);
                }
                break;

            case 'LASER_STOP':
                enemy.timer -= context.deltaSeconds;
                enemy.rotation = enemy.laserAimRotation;

                if (enemy.spriteView) {
                    enemy.spriteView.rotation = enemy.rotation;
                }

                if (enemy.timer <= 0) {
                    enemy.state = 'CHASE';
                    enemy.specialCooldownRemaining = enemy.special?.cooldown ?? 4;
                }
                break;
        }
    }

    beginCharge(enemy) {
        enemy.state = 'CHARGE_SPIN';
        enemy.timer = enemy.special?.chargeDuration ?? 8;
        enemy.laserHitDealt = false;
        enemy.specialRotation = 0;
        enemy.laserDamageTickRemaining = 0;

        if (enemy.spriteView) {
            enemy.spriteView.tint = 0xFFFFFF;
        }
    }

    beginLaserAttack(enemy) {
        enemy.state = 'LASER_ATTACK';
        enemy.timer = enemy.special?.attackDuration ?? 1.2;
        enemy.laserHitDealt = false;
        enemy.laserAimRotation = enemy.rotation;
        enemy.specialRotation = -Math.PI / 2;
        enemy.laserDamageTickRemaining = 0;

        if (enemy.spriteView) {
            enemy.spriteView.tint = 0xFFFFFF;
        }
    }

    beginLaserStop(enemy) {
        enemy.state = 'LASER_STOP';
        enemy.timer = enemy.special?.stopDuration ?? 0.75;
        enemy.rotation = enemy.laserAimRotation;
        enemy.specialRotation = -Math.PI / 2;
        enemy.laserDamageTickRemaining = 0;

        if (enemy.spriteView) {
            enemy.spriteView.tint = 0xFFFFFF;
        }
    }

    allowsProjectileStagger() {
        return false;
    }
}
