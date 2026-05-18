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
        spriteURL: '/enemySprites/enemy-1-idle-Sheet.png',
        attackURL: '/enemySprites/enemy-1-attack-Sheet.png',
        frameCount: 5,
        attackFrameCount: 7,
        special: {
            type: 'DASH',
            stopRange: 150,
            windup: 0.35,
            dashSpeed: 420,
            dashDuration: 0.4,
            recovery: 0.25,
            cooldown: 5,
            damage: 12
        },
        //partsDrop: 10
        //specialMove = {}
        //add more properties as needed, like attack patterns, damage, etc.
    },
    [ENEMY_TYPES.SPIKE]: {
        type: ENEMY_TYPES.SPIKE,
        health: 50,
        speed: 60,
        spriteURL: '/enemySprites/enemy-2-idle-Sheet.png',
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
        spriteURL: '/enemySprites/enemy-3-idle-Sheet.png',
        frameCount: 4,
        special: {
            type: 'EXPLODE',
            range: 180,
            triggerRange: 180,
            prepDuration: 1.5,
            flashInterval: 0.15,
            rushDuration: 2.5,
            rushSpeedMultiplier: 2.4,
            contactRange: 32,
            explosionRange: 120,
            explosionDuration: 0.55,
            explosionURL: '/enemySprites/enemyFX/orbExplosion.png',
            explosionFrameCount: 8,
            damage: 18
        },
        //partsDrop: 15
        //specialMove = {}
        //add more properties as needed, like attack patterns, damage, etc.
    },
    [ENEMY_TYPES.RHINO]: {
        type: ENEMY_TYPES.RHINO,
        health: 100,
        speed: 50,
        spriteURL: '/enemySprites/enemy-4-idle-Sheet.png',
        frameCount: 6,
        special: null,
        //partsDrop: 15
        //specialMove = {}
        //add more properties as needed, like attack patterns, damage, etc.
    }
};