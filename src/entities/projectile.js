import { Sprite } from 'pixi.js';

export default class Projectile {
    constructor(app, container, frames, config = {}) {
        this.app = app;
        this.container = container;
        this.frames = frames;
        this.damage = config.damage ?? 10;
        this.chargeTime = config.chargeTime ?? 0.5;
        this.lifetime = config.lifetime ?? 3;
        this.launchSpeed = config.launchSpeed ?? 350;
        this.spinSpeed = config.spinSpeed ?? 10;
        this.holdOffset = config.holdOffset ?? 18;
        this.scale = config.scale ?? 2;
        this.boundsPadding = config.boundsPadding ?? 64;

        this.state = 'CHARGING';
        this.holdTime = 0;
        this.launchTime = 0;
        this.launchDirectionX = 0;
        this.launchDirectionY = 0;
        this.sprite = new Sprite(frames[0]);

        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(this.scale);
        this.sprite.visible = true;
        this.container.addChild(this.sprite);
    }

    update(deltaTime, mouthPosition) {
        const deltaSeconds = deltaTime / 60;

        if (this.state === 'CHARGING') {
            this.updateCharging(deltaSeconds, mouthPosition);
            return true;
        }

        return this.updateFlying(deltaSeconds);
    }

    updateCharging(deltaSeconds, mouthPosition) {
        if (!mouthPosition) return;

        this.holdTime = Math.min(this.chargeTime, this.holdTime + deltaSeconds);
        this.sprite.texture = this.frames[this.getChargeFrameIndex()];
        this.sprite.x = mouthPosition.x;
        this.sprite.y = mouthPosition.y;
        this.sprite.rotation += this.spinSpeed * deltaSeconds;
    }

    updateFlying(deltaSeconds) {
        this.launchTime += deltaSeconds;
        this.sprite.x += this.launchDirectionX * this.launchSpeed * deltaSeconds;
        this.sprite.y += this.launchDirectionY * this.launchSpeed * deltaSeconds;
        this.sprite.rotation += this.spinSpeed * deltaSeconds;
        this.sprite.texture = this.frames[this.getFlightFrameIndex()];

        return this.launchTime < this.lifetime && !this.isOutOfBounds();
    }

    release(angle) {
        if (this.state !== 'CHARGING') return;

        this.state = 'FLYING';
        this.launchDirectionX = Math.cos(angle);
        this.launchDirectionY = Math.sin(angle);
        this.launchTime = 0;
    }

    getChargeFrameIndex() {
        if (this.frames.length <= 1) return 0;

        const progress = Math.min(1, this.holdTime / this.chargeTime);
        return Math.min(this.frames.length - 1, Math.floor(progress * (this.frames.length - 1)));
    }

    getFlightFrameIndex() {
        if (this.frames.length <= 1) return 0;

        return Math.min(this.frames.length - 1, Math.floor(this.launchTime / 0.08));
    }

    getBounds() {
        const width = this.sprite.width;
        const height = this.sprite.height;

        return {
            left: this.sprite.x - width / 2,
            right: this.sprite.x + width / 2,
            top: this.sprite.y - height / 2,
            bottom: this.sprite.y + height / 2
        };
    }

    isOutOfBounds() {
        return (
            this.sprite.x < -this.boundsPadding ||
            this.sprite.x > this.app.screen.width + this.boundsPadding ||
            this.sprite.y < -this.boundsPadding ||
            this.sprite.y > this.app.screen.height + this.boundsPadding
        );
    }

    destroy() {
        if (this.sprite?.parent) {
            this.sprite.parent.removeChild(this.sprite);
        }
    }
}
