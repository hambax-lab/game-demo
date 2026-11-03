import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height * 0.35, 'DEMO', {
      fontFamily: 'sans-serif',
      fontSize: '96px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const start = this.add.text(width / 2, height * 0.6, 'ИГРАТЬ', {
      fontFamily: 'sans-serif',
      fontSize: '56px',
      color: '#111111',
      backgroundColor: '#ffd23f',
      padding: { x: 40, y: 20 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    start.on('pointerdown', () => this.scene.start('Game'));
  }
}
