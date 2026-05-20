import { ENEMY_TYPES } from '../data/enemyData.js';

export const WAVE_TIMELINE = [
    {
        time: 0,
        type: ENEMY_TYPES.DRONE,
        interval: 200
    },
    {
        time: 0,
        type: ENEMY_TYPES.SPIKE,
        interval: 500
    },
    {
        time: 0,
        type: ENEMY_TYPES.ORB,
        interval: 700
    },
    {
        time: 0,
        type: ENEMY_TYPES.RHINO,
        interval: 1
    }
];
