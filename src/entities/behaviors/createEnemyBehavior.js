import DashBehavior from './DashBehavior.js';
import ExplodeBehavior from './ExplodeBehavior.js';
import RhinoLaserBehavior from './RhinoLaserBehavior.js';

export default function createEnemyBehavior(special) {
    if (!special) {
        return null;
    }

    switch (special.type) {
        case 'DASH':
            return new DashBehavior();
        case 'EXPLODE':
            return new ExplodeBehavior();
        case 'RHINO_LASER':
            return new RhinoLaserBehavior();
        default:
            return null;
    }
}
