import EnemyBehavior from './EnemyBehavior.js';

export default class ExplodeBehavior extends EnemyBehavior {
    handlesState(state) {
        return state === 'PREPARING' || state === 'RUSH' || state === 'EXPLODING';
    }

    checkTrigger(enemy, playerX, playerY, distanceSquared) {
        if (!enemy.special || enemy.special.type !== 'EXPLODE') {
            return false;
        }

        const triggerRange = enemy.special.triggerRange ?? enemy.special.range ?? 160;

        if (enemy.state === 'CHASE' && distanceSquared <= (triggerRange * triggerRange)) {
            this.beginPreparation(enemy);
            return true;
        }

        return false;
    }

    update(enemy, context) {
        switch (enemy.state) {
            case 'PREPARING':
                enemy.timer -= context.deltaSeconds;
                enemy.lookAt(context.playerX, context.playerY);

                enemy.flashAccumulator += context.deltaSeconds;

                if (enemy.flashAccumulator >= (enemy.special?.flashInterval ?? 0.15)) {
                    enemy.flashAccumulator = 0;
                    enemy.flashOn = !enemy.flashOn;

                    if (enemy.spriteView) {
                        enemy.spriteView.tint = enemy.flashOn ? 0xFF4A4A : 0xFFFFFF;
                    }
                }

                if (enemy.timer <= 0) {
                    if (enemy.spriteView) {
                        enemy.spriteView.tint = 0xFFFFFF;
                    }

                    enemy.state = 'RUSH';
                    enemy.timer = enemy.special?.rushDuration ?? 2.5;
                }
                break;

            case 'RUSH':
                enemy.lookAt(context.playerX, context.playerY);
                enemy.moveToward(
                    context.dx,
                    context.dy,
                    context.getDistance(),
                    enemy.speed * (enemy.special?.rushSpeedMultiplier ?? 2.4),
                    context.deltaTime
                );
                enemy.timer -= context.deltaSeconds;

                if (context.distanceSquared <= ((enemy.special?.contactRange ?? 32) ** 2)) {
                    this.beginExplosion(enemy);
                    break;
                }

                if (enemy.timer <= 0) {
                    this.beginExplosion(enemy);
                }
                break;

            case 'EXPLODING':
                enemy.timer -= context.deltaSeconds;

                if (enemy.timer <= 0) {
                    enemy.doExplosionDamage();
                    enemy.die();
                }
                break;
        }
    }

    beginPreparation(enemy) {
        enemy.state = 'PREPARING';
        enemy.timer = enemy.special?.prepDuration ?? 1.5;
        enemy.flashAccumulator = 0;
        enemy.flashOn = false;

        if (enemy.spriteView) {
            enemy.spriteView.tint = 0xFFFFFF;
        }
    }

    beginExplosion(enemy) {
        if (enemy.state === 'EXPLODING') {
            return;
        }

        enemy.state = 'EXPLODING';
        enemy.timer = enemy.special?.explosionDuration ?? 0.55;
        enemy.flashAccumulator = 0;
        enemy.flashOn = false;

        if (enemy.spriteView) {
            enemy.spriteView.tint = 0xFFFFFF;
        }
    }
}
