import { ENEMY_DATA } from '../data/enemyData.js';

export default class EnemyFactory {
    constructor(pool) {
        this.pool = pool;
    }

    spawn(type, x, y) {
        const config = ENEMY_DATA[type];
        
        if (!config) {
            console.error(`Enemy type ${type} not found in EnemyData`);
            return null;
        }

        const enemy = this.pool.get();
        enemy.init(config, x, y);
        
        return enemy;
    }
}
