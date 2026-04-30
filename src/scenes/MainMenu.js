import { Container, Sprite, Assets, Text, TextStyle, Graphics, Rectangle } from 'pixi.js';
import { MainStage } from './MainStage.js';

export class MainMenu {
    constructor(app) {
        this.app = app;
        this.container = new Container();
        this.time = 0;
    }

    async init() {
        const backgroundTexture = await Assets.load('images/titleScreen.png');
        const background = new Sprite(backgroundTexture);

        await Assets.load({
            src: 'fonts/Lunar_Escape.otf',
            data: {
                family: 'Lunar_Escape',
            }
        });

  
        const responsiveFontSize = Math.min(150, this.app.screen.width * 0.2);

        const text = new Text({
            text: 'MOTHER',
            style: {
                fontFamily: 'Lunar_Escape',
                fontSize: responsiveFontSize,
                fill: '#b85d13',
                align: 'center'
            }
        });


        const button = new Container();
        
        // 1. Create a Graphics object for the button background
        const buttonBg = new Graphics();
        
        // 2. Define a responsive width and height for the box
        const btnWidth = Math.min(500, this.app.screen.width * 0.6);
        const btnHeight = Math.min(100, this.app.screen.height * 0.15);
        
        buttonBg.roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 15);
        buttonBg.fill({ color: 0x000000, alpha: 0.8 }); 
        buttonBg.stroke({ width: 4, color: 0xb85d13 });

        button.addChild(buttonBg);
        button.hitArea = new Rectangle(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
        
        const buttonText = new Text({
            text: 'START GAME',
            style: {
                fontFamily: 'Lunar_Escape',
                fontSize: Math.min(60, this.app.screen.width * 0.08), // Slightly responsive
                fill: '#b85d13',
                align: 'center'
            }
        });


        buttonText.anchor.set(0.5);
        button.addChild(buttonText);

        button.x = this.app.screen.width / 2;
        button.y = this.app.screen.height * 0.7;

        button.eventMode = 'static';
        button.cursor = 'pointer';

        button.on('pointerover', () => {
            buttonText.style.fill = '#f1c5a0'; 
            button.scale.set(1.1);
        });

        button.on('pointerout', () => {
            buttonText.style.fill = '#b85d13';
            button.scale.set(1);
        });

        const startLevel = async () => {
            this.app.stage.removeChildren();
            this.app.renderer.background.color = 0x000000; // Change background color for the main stage
            const mainStage = new MainStage(this.app);
            await mainStage.init();
            this.app.stage.addChild(mainStage.container);
            /* this.container.addChild(background);
            this.container.addChild(text);
            this.container.addChild(button); */
        };

        button.on('pointerdown', () => {
            console.log('Start Button Clicked! Time to shift scenes.');
            // add change scene code for here later
            startLevel();
        });

        
        text.anchor.set(0.5);
        
        text.x = this.app.screen.width / 2;
        text.y = this.app.screen.height * 0.27;
        
        background.anchor.set(0.5);
        // position
        background.x = this.app.screen.width / 2;
        background.y = this.app.screen.height / 2;

        const scale = Math.min(
            this.app.screen.width / backgroundTexture.width,
            this.app.screen.height / backgroundTexture.height
        );

        background.scale.set(scale);

        this.app.canvas.style.position = 'absolute';    

        this.container.addChild(background);
        this.container.addChild(text);
        this.container.addChild(button);

    }
}