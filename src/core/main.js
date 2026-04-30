import { Application } from 'pixi.js';
import { MainMenu } from '../scenes/MainMenu.js';

(async () => {
    const app = new Application();

    await app.init({
        resizeTo: window
    });

    app.canvas.style.position = 'absolute';

    document.body.appendChild(app.canvas);

    const menu = new MainMenu(app);

    await menu.init();
    
    app.stage.addChild(menu.container);
    
})();