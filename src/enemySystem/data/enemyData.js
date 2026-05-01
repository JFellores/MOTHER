export const ENEMY_TYPES = {
    DRONE: 'drone',
    SPIKE: 'spike',
    ORB: 'orb'
};

export const ENEMY_DATA = {
    [ENEMY_TYPES.DRONE]: {
        type: ENEMY_TYPES.DRONE,
        health: 20,
        speed: 100,
        sprite: '/enemySprites/enemy-1-idle-Sheet.png',
        frameCount: 5,
        special: null,
        //partsDrop: 10
        //specialMove = {}
        //add more properties as needed, like attack patterns, damage, etc.
    },
    [ENEMY_TYPES.SPIKE]: {
        type: ENEMY_TYPES.SPIKE,
        health: 50,
        speed: 60,
        sprite: '/enemySprites/enemy-2-idle-Sheet.png',
        frameCount: 7,
        special: null,
        //partsDrop: 25
        //specialMove = {}
        //add more properties as needed, like attack patterns, damage, etc.

    },
    [ENEMY_TYPES.ORB]: {
        type: ENEMY_TYPES.ORB,
        health: 30,
        speed: 140,
        sprite: '/enemySprites/enemy-3-idle-Sheet.png',
        frameCount: 4,
        special: null,
        //partsDrop: 15
        //specialMove = {}
        //add more properties as needed, like attack patterns, damage, etc.
    }
};