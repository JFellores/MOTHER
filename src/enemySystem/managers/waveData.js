import { ENEMY_TYPES } from '../data/enemyData.js';

export const WAVE_TIMELINE = [
    {
        time: 0,
        type: ENEMY_TYPES.DRONE,
        interval: 2
    },
    {
        time: 0,
        type: ENEMY_TYPES.SPIKE,
        interval: 5
    },
    {
        time: 0,
        type: ENEMY_TYPES.ORB,
        interval: 7
    },
    {
        time: 0,
        type: ENEMY_TYPES.RHINO,
        interval: 10
    }
];
