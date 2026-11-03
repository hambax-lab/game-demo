import Phaser from 'phaser';

// Заглушка игрового экрана: квадрат летит туда, куда нажал игрок.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;

    this.player = this.add.rectangle(width / 2, height / 2, 80, 80, 0xffd23f);

    this.input.on('pointerdown', (pointer) => {
      this.tweens.add({
        targets: this.player,
        x: pointer.x,
        y: pointer.y,
        duration: 250,
        ease: 'Quad.easeOut',
      });
    });

    this.add.text(24, 24, '← меню', {
      fontFamily: 'sans-serif',
      fontSize: '36px',
      color: '#ffffff',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer, x, y, event) => {
        event.stopPropagation();
        this.scene.start('Menu');
      });
  }
}
