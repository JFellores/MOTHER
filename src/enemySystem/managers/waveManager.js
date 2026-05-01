import { WAVE_TIMELINE } from './waveData.js';

export default class WaveManager {
    constructor(hordeManager) {
        this.horde = hordeManager;
        this.elapsedTime = 0;
        this.timers = {}; // Tracks spawn intervals for each active type
    }

    update(dt, playerX, playerY, currentEnemies) {
        this.elapsedTime += dt;

        // Check which wave entries are active based on elapsed time
        WAVE_TIMELINE.forEach(wave => {
            if (this.elapsedTime >= wave.time) {
                this.handleSpawning(wave, dt, playerX, playerY, currentEnemies);
            }
        });
    }

    handleSpawning(wave, dt, px, py, count) {
        if (!this.timers[wave.type]) this.timers[wave.type] = 0;

        this.timers[wave.type] += dt;

        if (this.timers[wave.type] >= wave.interval) {
            this.horde.trySpawn(wave.type, px, py, count);
            this.timers[wave.type] = 0;
        }
    }
}