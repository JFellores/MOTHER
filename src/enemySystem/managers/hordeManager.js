export default class HordeManager {
    constructor(factory, config) {
        this.factory = factory;
        this.maxEnemies = config.maxEnemies || 300;
        this.spawnRadius = config.spawnRadius || 600; // Just outside camera view
        this.onSpawn = config.onSpawn ?? null;
    }

    trySpawn(type, playerX, playerY, currentCount) {
        if (currentCount >= this.maxEnemies) return;

        // Calculate a random point on a circle around the player
        const angle = Math.random() * Math.PI * 2;
        const spawnX = playerX + Math.cos(angle) * this.spawnRadius;
        const spawnY = playerY + Math.sin(angle) * this.spawnRadius;

        const enemy = this.factory.spawn(type, spawnX, spawnY);

        if (enemy && typeof this.onSpawn === 'function') {
            this.onSpawn(enemy);
        }

        return enemy;
    }
}