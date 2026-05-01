import Enemy from '../../entities/enemy.js';

export default class ObjectPool {
    constructor() {
        this.pool = [];
    }

    get() {
        let instance = this.pool.find(obj => !obj.active);

        if (!instance) {
            instance = new Enemy();
            this.pool.push(instance);
        }

        return instance;
    }

    getInUseCount() {
        return this.pool.filter(obj => obj.active).length;
    }

    preWarm(amount) {
        for (let i = 0; i < amount; i++) {
            this.pool.push(new Enemy());
        }
    }
}