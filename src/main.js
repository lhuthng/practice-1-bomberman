class Demo extends Phaser.Scene {
    constructor() { 
        super();
        this.layers = {};
        this.groups = {};
        this.players = { controlable: {} };
    }

    preload() {
        this.load.path = 'assets/';
        this.load.atlas('demo-stage', 'atlas/demo.png', 'atlas/demo.json');
        this.load.aseprite('apprentice', 'anims/apprentice.png', 'anims/apprentice.json');
        this.load.aseprite('bombtion', 'anims/bombtion.png', 'anims/bombtion.json');
        this.load.aseprite('flame', 'anims/flame.png', 'anims/flame.json');
    }

    create() {
        this.anims.createFromAseprite('apprentice');
        this.anims.createFromAseprite('bombtion');
        this.anims.createFromAseprite('flame');
        this.stage = new Stage(0, 0, 16, 14, { 
            scale: 3
        }).create(this, this.layers, this.groups, 'demo-stage', 9, 9);

        // this.character = new Character(this, this.layers, this.groups, this.players.controlable, 'apprentice', this.stage, 1, 1, { scale: 3, origin: { x: 0.5, y: 1, dy: -2 } });
        this.character = new Character(this.stage, 'apprentice', { 
            scale: 3, 
            origin: {x: 0.5, y: 1, dy: -4 },
            weaponKey: 'bombtion'
        }).create(1, 1);

        const leftKey = this.input.keyboard.addKey('left');
        const rightKey = this.input.keyboard.addKey('right');
        const downKey = this.input.keyboard.addKey('down');
        const upKey = this.input.keyboard.addKey('up');
        const spaceKey = this.input.keyboard.addKey('space');
        
        // this.controller = new Controller(this, this.character, this.stage, { leftKey, rightKey, downKey, upKey, spaceKey });
        this.controller = new Controller(this.character)
            .create({ leftKey, rightKey, downKey, upKey, spaceKey });
        this.getTime = () => new Date().getTime();
        this.prevTime = this.getTime();
    }

    update() {
        const deltaTime = this.getTime() - this.prevTime;
        this.prevTime = this.getTime();
        this.controller.update(deltaTime);
        this.character.update(deltaTime);
    }
}

const config = {
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    backgroundColor: '#fefefe',
    parent: 'demo',
    render: { pixelArt: true },
    physics: {
        default: 'arcade',
        arcade: {
            debug: true
        }
    },
    scene: [ Demo ]
};

const game = new Phaser.Game(config);