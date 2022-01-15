class PropsLookingTree {
    constructor(parent) {
        if (parent) this._find = (propName) => this[propName] || parent._find(propName);
        else this._find = (_) => null;
    }
}

class Stage extends PropsLookingTree {
    constructor(x, y, cellWidth, cellHeight, config) {
        super(null);

        this.stage = this;
        this.config = config || {};
        this.x = x;
        this.y = y;
        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;
        this.scale = this.config.scale || 1;

        this.convert = this.convert.bind(this);
        this.convert2 = this.convert2.bind(this);
        this.convert3 = this.convert3.bind(this);
        this.revert = this.revert.bind(this);

        this.create = this.create.bind(this);
    }

    convert(col, row) {
        return {
            x: this.x + col * this.cellWidth * this.scale,
            y: this.y + row * this.cellHeight * this.scale
        };
    }

    convert2(col, row) {
        const result = this.convert(col, row);
        result.x += this.cellWidth / 2 * this.scale;
        result.y += this.cellHeight / 2 * this.scale;
        return result;
    }

    convert3(x, y) {
        const { col, row } = this.revert(x, y);
        return this.convert2(col, row);
    }

    revert(x, y) {
        return {
            col: (x - this.x) / this.scale / this.cellWidth >> 0,
            row: (y - this.y) / this.scale / this.cellHeight >> 0
        };
    }

    create(scene, layers, groups, atlas, rowNum, colNum) {
        this.scene = scene;
        this.groups = groups;
        this.layers = layers;

        layers.floor    = layers.floor  || scene.add.layer();
        layers.border   = layers.border || scene.add.layer();
        layers.main     = layers.main   || scene.add.layer();

        const addImage = (layer, col, row, key, config = {}) => {
            const { x, y } = this.convert(col, row);
            const image = scene.add.image(x, y, atlas, key);
            image.scale = this.scale;
            
            const { depth, origin } = config;

            setOrigin(image, origin, this.scale);

            if (depth) {
                const { value, auto } = depth;
                value && image.setDepth(depth);
                auto && image.setDepth(y);
            }

            layer.add(image);
            return image;
        }

        // Create floor
        for (let row = 0; row <= rowNum + 1; row++) for (let col = 0; col <= colNum + 1; col++) {
            addImage(layers.floor, col, row, `grass${(row + col) % 2 + 1}`);
        }

        // Create border;
        addImage(layers.border, 0, 0, 'wall1');
        addImage(layers.border, colNum + 1, 0, 'wall3');
        addImage(layers.border, 0, rowNum + 1, 'wall6');
        addImage(layers.border, colNum + 1, rowNum + 1, 'wall8');
        for (let col = 1; col <= colNum; col++) {
            addImage(layers.border, col, 0, 'wall2');
            addImage(layers.border, col, rowNum + 1, 'wall7');
        }
        for (let row = 1; row <= rowNum; row++) {
            addImage(layers.border, 0, row, 'wall4');
            addImage(layers.border, colNum + 1, row, 'wall5');
        }

        // Create solid;

        const solid = scene.physics.add.staticGroup();
        groups.solid = solid;
        for (let col = 2; col < colNum; col += 2) for (let row = 2; row < rowNum; row += 2) {
            const image = addImage(layers.main, col, row, 'solid', { depth: {auto: true} });
            solid.add(image);
            image.body.setSize(this.cellWidth * this.scale, this.cellHeight * this.scale, false);
            image.body.setOffset(0, (image.height - this.cellHeight) * this.scale);
        }
        return this;
    }

}

class Character extends PropsLookingTree {
    constructor(stage, key, config) {
        super(stage);

        this.stage = stage;
        this.config = config || {};
        this.scale = this.config.scale || 1;
        this.props = {
            key,
            speed: 60,
            power: 1,
            velocity: { x: 0, y: 0 },
            direction: { face: '-front', side: '-right' }
        };

        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
    }

    create(row, col) {
        

        const { x, y } = this.stage.convert2(row, col);
        const { face, side } = this.props.direction;
        const { origin, scale } = this.config;
        const colliderRadius = 5;

        this.sprite = this.stage.scene.physics.add.sprite(x, y, this.props.key);
        this.sprite.play({ key: this.props.key + '-still' + face + side, repeat: -1 });
        setOrigin(this.sprite, origin, this.stage.scale);
        this.sprite.body.setCircle(
            colliderRadius,
            this.sprite.width * this.sprite.originX - colliderRadius,
            this.sprite.height * this.sprite.originY - colliderRadius
        );
        this.sprite.body.setCollideWorldBounds(true);
        this.stage.scene.physics.add.collider(this.sprite, this.stage.groups.solid);
        this.stage.layers.main.add(this.sprite);

        return this;
    }

    update(deltaTime) {
        const { sprite, scale } = this;
        const { velocity, speed, direction } = this.props;
        const { x, y } = velocity;
        let action = '-walk';

        if (x === 0 && y === 0) action = '-still';
        else if (x === 0) {
            direction.face = y > 0 ? '-front' : '-back';
        }
        else if (y === 0) {
            direction.face = '-front';
            direction.side = x > 0 ? '-right' : '-left';
        }
        else {
            direction.face = y > 0 ? '-front' : '-back';
            direction.side = x > 0 ? '-right' : '-left';
        }
        const key = this.props.key + action + direction.face + direction.side;
        if (key !== this.prevAnimKey) {
            this.prevAnimKey = key;
            sprite.play({ key, repeat: -1, frameRate: 0.2 * speed });
        }

        sprite.body.setVelocity(velocity.x * scale, velocity.y * scale);
        sprite.setDepth(sprite.y);
    }

    place() {
        const { col, row } = this.stage.revert(this.sprite.x, this.sprite.y);
        const weapon = new Weapon(this, this.config.weaponKey, this.config).create(col, row);

        // weapon.sprite.once('animationcomplete', () => {
        //     weapon.sprite.destroy();
        // })

        this.stage.scene.time.delayedCall(5000, () => {
            weapon.sprite.destroy();
            [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]].forEach(pair => {
                
                const { x, y } = this.stage.convert2(col + pair[0], row + pair[1]);
                const test = this.stage.scene.add.sprite(x, y);
                test.setDepth(y);
                test.play({ key: 'flame' });
                setOrigin(test, this.config.origin, this.config.scale);
                this.stage.layers.main.add(test);
                test.once('animationcomplete', () => {
                    test.destroy();
                    console.log(test);
                });
            });
        }, [], this);
        
    }
}

class Weapon extends PropsLookingTree{
    constructor(source, key, config) {
        super(source);

        this.source = source;
        this.props = {
            key
        };
        this.config = config || {};
        this.scale = this.config.scale;
    }

    create(col, row) {
        // const stage = this.source._find('stage');
        const stage = this.source.stage;
        const { x, y } = stage.convert2(col, row);
        this.sprite = stage.scene.add.sprite(x, y);
        this.sprite.play({ key: this.props.key + '-charge', repeat: -1 });
        this.sprite.setDepth(y);
        setOrigin(this.sprite, this.config.origin, this.scale);
        stage.layers.main.add(this.sprite);

        return this;
    }
}

class Controller extends PropsLookingTree {
    constructor(character) {
        super(character);
        
        this.character = character;

        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
    }

    create(keys) {
        this.keys = keys;

        const { spaceKey } = this.keys;
        spaceKey.on('down', (event) => {
            this.character.place();
        })
        return this;
    }

    update() {
        const { leftKey, rightKey, downKey, upKey, spaceKey } = this.keys;
        const { velocity, speed } = this.character.props;
        const newVelocity = { x: 0, y: 0};
        if (upKey.isDown) newVelocity.y -= speed;
        if (downKey.isDown) newVelocity.y += speed;
        if (leftKey.isDown) newVelocity.x -= speed;
        if (rightKey.isDown) newVelocity.x += speed;

        if (newVelocity.x !== 0 && newVelocity.y !== 0) {
            newVelocity.x *= 0.7;
            newVelocity.y *= 0.7;
        }
        if (newVelocity.x !== 0 || newVelocity.y !== 0) {
            velocity.x = epsilonConstrain(lerp(velocity.x, newVelocity.x, 0.5), 0.1);
            velocity.y = epsilonConstrain(lerp(velocity.y, newVelocity.y, 0.5), 0.1);
        }
        else {
            velocity.x =  0;
            velocity.y = 0;
        }

    }
}