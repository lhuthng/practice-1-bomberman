class Demo extends Phaser.Scene {
    constructor() { 
        super();
        this.layers = {};
        this.groups = {};
        this.players = { controlable: {} };
    }

    preload() {
        this.load.path = '/assets/';
        this.load.atlas('demo-stage', 'atlas/demo.png', 'atlas/demo.json');
        this.load.aseprite('apprentice', 'anims/apprentice.png', 'anims/apprentice.json');
        this.load.aseprite('bombtion', 'anims/bombtion.png', 'anims/bombtion.json');
        this.load.aseprite('flame', 'anims/flame.png', 'anims/flame.json');
    }

    create() {
        this.anims.createFromAseprite('apprentice');
        this.anims.createFromAseprite('bombtion');
        this.anims.createFromAseprite('flame');
        this.stage = new Stage(
            this,
            this.layers,
            this.groups,
            0, 14 * 2,
            'demo-stage',
            'solid',
            16, 14,
            9, 9,
            3,
        )

        this.character = new Character(
            this.stage,
            1, 1,
            'apprentice',
        )

        const leftKey = this.input.keyboard.addKey('left');
        const rightKey = this.input.keyboard.addKey('right');
        const downKey = this.input.keyboard.addKey('down');
        const upKey = this.input.keyboard.addKey('up');
        const spaceKey = this.input.keyboard.addKey('space');
                
        this.controller = new DirectController(this.character)
            .create({ leftKey, rightKey, downKey, upKey, spaceKey });
    }

    update() {
        // console.log(this.input.mousePointer.x, this.input.mousePointer.y);
        this.controller.update();
        this.character.update();
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