import EnemyBehavior from './EnemyBehavior.js';

export default class DashBehavior extends EnemyBehavior {
    handlesState(state) {
        return state === 'WINDUP' || state === 'DASHING' || state === 'RECOVERY';
    }

    checkTrigger(enemy, playerX, playerY, distanceSquared) {
        if (!enemy.special || enemy.special.type !== 'DASH' || enemy.specialCooldownRemaining > 0) {
            return false;
        }

        const stopRange = enemy.special.stopRange ?? enemy.special.range ?? 160;

        if (enemy.state === 'CHASE' && distanceSquared <= (stopRange * stopRange)) {
            enemy.state = 'WINDUP';
            enemy.timer = enemy.special.windup ?? 0.3;
            enemy.targetX = playerX;
            enemy.targetY = playerY;
            return true;
        }

        return false;
    }

    update(enemy, context) {
        switch (enemy.state) {
            case 'WINDUP':
                enemy.timer -= context.deltaSeconds;
                enemy.lookAt(context.playerX, context.playerY);

                if (enemy.timer <= 0) {
                    this.beginDash(enemy, context.playerX, context.playerY);
                }
                break;

            case 'DASHING': {
                const dashDx = enemy.targetX - enemy.x;
                const dashDy = enemy.targetY - enemy.y;
                const dashDistance = Math.sqrt(dashDx * dashDx + dashDy * dashDy);

                enemy.lookAt(enemy.targetX, enemy.targetY);
                enemy.moveToward(dashDx, dashDy, dashDistance, enemy.special?.dashSpeed ?? enemy.speed, context.deltaTime);
                enemy.timer -= context.deltaSeconds;

                if (enemy.timer <= 0) {
                    enemy.state = 'RECOVERY';
                    enemy.timer = enemy.special?.recovery ?? 0.2;
                }
                break;
            }

            case 'RECOVERY':
                enemy.timer -= context.deltaSeconds;

                if (enemy.timer <= 0) {
                    enemy.state = 'CHASE';
                }
                break;
        }
    }

    beginDash(enemy, playerX, playerY) {
        enemy.state = 'DASHING';
        enemy.timer = enemy.special?.dashDuration ?? 0.25;
        enemy.specialCooldownRemaining = enemy.special?.cooldown ?? 5;
        enemy.targetX = playerX;
        enemy.targetY = playerY;
    }
}
