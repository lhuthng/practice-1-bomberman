const MBOrigin = { x: .5,y: 1 }; // Middle-Bottom Origin
const LBOrigin = { x: 0, y: 1 };
const LTOrigin = { x: 0, y: 0 };

const presets = {
    weapon: {
        'apprentice': 'bombtion'
    },
    blast: {
        'bombtion': 'flame'
    },
    config: {
        'apprentice': { origin: {...MBOrigin, dy: -4} },
        'bombtion': { origin: {...MBOrigin, dy: -4} },
        'flame': { origin: {...MBOrigin, dy: -3} }
    }
}



class PropsLookingTree {
    constructor(parent) {
        if (parent) this._find = (propName) => this.props[propName] || parent._find(propName);
        else this._find = (_) => null;
    }
}

class Stage extends PropsLookingTree {

    constructor(scene, layers, groups, x, y, atlasKey, solidKey, cellWidth, cellHeight, maxRow, maxCol, scale) {
        super(null);

        this.stage = this;
        this.scene = scene;
        this.layers = layers;
        this.groups = groups;
        this.entities = [];
        this.props = {
            x, y, cellWidth, cellHeight, maxRow, maxCol, scale
        }

        this.convert = this.convert.bind(this);
        this.convertToCenter = this.convertToCenter.bind(this);
        this.revert = this.revert.bind(this);
        this.getEntity = this.getEntity.bind(this);
        this.setEntity = this.setEntity.bind(this);

        layers.floor    = layers.floor  || scene.add.layer();
        layers.border   = layers.border || scene.add.layer();
        layers.main     = layers.main   || scene.add.layer();

        
    
        const borderCol = maxCol + 2, borderRow = maxRow + 2;
        const quickAdd = (layer, col, row, key, config) => {
            col = positiveModulo(col, borderCol);
            row = positiveModulo(row, borderRow);
            const { x, y } = this.convert(col, row);
            const { origin, depth, addEntity } = config || { };
            addEntity && this.setEntity(col, row, voidEntity);

            return addToLayer(setDepth(setOrigin(scene.add.image(x, y, atlasKey, key), origin, scale), depth), layer);
        }
        const voidEntity = { callback: () => {} };
        // create floor
        for (let row = 0; row < borderRow; row++) for (let col = 0; col < borderCol; col++) {
            quickAdd(layers.floor, col, row, `grass${(row + col) % 2 + 1}`);
        }
        
        // create border
        let config = { addEntity: true };

        for (let row = 0; row < borderRow; row++) {
            quickAdd(layers.border, 0, row, 'wall4', config);
            quickAdd(layers.border, -1, row, 'wall5', config);
        }
        for (let col = 0; col < borderCol; col++) {
            quickAdd(layers.border, col, 0, 'wall2', config);
            quickAdd(layers.border, col, -1, 'wall7', config);
        }
        quickAdd(layers.border, 0, 0, 'wall1', config);
        quickAdd(layers.border, -1, 0, 'wall3', config);
        quickAdd(layers.border, 0, -1, 'wall6', config);
        quickAdd(layers.border, -1, -1, 'wall8', config);

        // create solid
        groups.solid = groups.solid || scene.physics.add.staticGroup();
        config = {...config, origin: LBOrigin };
        for (let col = 2; col < maxCol; col += 2) for (let row = 2; row < maxRow; row += 2) {
            const image = quickAdd(layers.main, col, row, solidKey, config);
            setDepth(image, image.y - 3 * this.props.scale);
            groups.solid.add(image);
            setBodyRect(image.body, cellWidth, cellHeight, 0, image.height - cellHeight, scale);
        }
        console.log(this.entities);
    }

    convert(col, row) {
        const { x, y, cellWidth, cellHeight, scale } = this.props;
        return {
            x: x + col * cellWidth * scale,
            y: y + row * cellHeight * scale
        };
    }

    convertToCenter(col, row) {
        const { cellWidth, cellHeight, scale } = this.props;
        const result = this.convert(col, row);
        result.x += cellWidth / 2 * scale;
        result.y -= cellHeight / 2 * scale;
        return result;
    }

    revert(x, y) {
        const { cellWidth, cellHeight, scale } = this.props;
        return {
            col: (x - this.props.x) / scale / cellWidth >> 0,
            row: 1 + (y - this.props.y) / scale / cellHeight >> 0
        };
    }

    getEntity(col, row) {
        return this.entities[col * (this.props.maxRow + 2) + row];
    }

    setEntity(col, row, entity) {
        this.entities[col * (this.props.maxRow + 2) + row] = entity;
    }
}

class Character extends PropsLookingTree {
    constructor(stage, row, col, key) {
        super(stage);

        const { origin, colliderRadius} = presets.config[key];

        this.stage = stage;
        this.props = {
            key,
            velocity:   { x: 0, y: 0 },
            action:     '-still',
            velocity: { x: 0, y: 0 },
            direction:  config.direction    || { face: '-front', side: '-right' },
            scale:      stage.props.scale   || 1
        };
        this.stats = {
            speed: 45,
            weaponSpeed: 5,
            power: 3
        }

        const { x, y } = stage.convertToCenter(row, col);
        const sprite = stage.scene.physics.add.sprite(x, y, key);
        stage.layers.main.add(sprite);
        sprite.play({ key: key + '-still' + this.props.direction.face + this.props.direction.side, repeat: -1 });
        setDepth(setOrigin(sprite, origin, this.props.scale), y);
        setBodyCircle(sprite.body, 4, sprite.width * sprite.originX, sprite.height * sprite.originY);
        sprite.body.setCollideWorldBounds(true);
        stage.scene.physics.add.collider(sprite, stage.groups.solid);
        this.sprite = sprite;

        this.update = this.update.bind(this);
    }

    update() {
        const { sprite } = this;
        const { velocity, direction, scale } = this.props;
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
            sprite.play({ key, repeat: -1, frameRate: 0.2 * this.stats.speed });
        }

        sprite.body.setVelocity(velocity.x * scale, velocity.y * scale);
        sprite.setDepth(sprite.y);
    }

    place() {
        const { col, row } = this.stage.revert(this.sprite.x, this.sprite.y);
        if (this.stage.getEntity(col, row) === undefined) {
            const key = this.props.key;
            new Weapon(this, col, row, presets.weapon[key], this.stats.power, this.stats.weaponSpeed);
        }
    }
}

class Weapon extends PropsLookingTree {
    constructor(source, col, row, key, power, triggerTime) {
        super(source);

        const config = presets.config[key];

        this.source = source;
        this.stage = this.source.stage;
        this.isActive = true;
        this.props = {
            col, row, key, power,
            scale: config.scale || source.props.scale || 1
        };
        this.trigger = this.trigger.bind(this);

        const stage = source.stage;
        const { x, y } = stage.convertToCenter(col, row);
        const sprite = stage.scene.add.sprite(x, y)
        sprite.play({ key: key + '-charge', repeat: -1 });
        setOrigin(setDepth(sprite, sprite.y), config.origin, this.props.scale);
        stage.layers.main.add(sprite);
        this.sprite = sprite;
        this.stage.setEntity(col, row, { callback: this.trigger });

        this.stage.scene.time.delayedCall(triggerTime * 1000, this.trigger, [], this);
    }

    trigger() {
        if (this.isActive) {
            this.isActive = false;
            const { col: rootCol, row: rootRow } = this.props;
            this.stage.setEntity(rootCol, rootRow, undefined);
            const blastKey = presets.blast[this.props.key]
            new Explosion(this, rootCol, rootRow, blastKey);
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(dir => {
                for (let power = 1; power < this.props.power; power++) {
                    const col = rootCol + dir[0] * power, row = rootRow + dir[1] * power;
                    const entity = this.stage.getEntity(col, row);
                    if (entity === undefined) {
                        new Explosion(this, col, row, blastKey);
                    } else {
                        entity.callback();
                        break;
                    }
                }
            });
            this.sprite.destroy();
        }
    }
}

class Explosion extends PropsLookingTree {
    constructor(weapon, col, row, key) {
        super(weapon);

        const config = presets.config[key];

        this.props = {
            key,
            scale: config.scale || weapon.props.scale
        }
        const stage = weapon.stage;
        const { x, y } = stage.convertToCenter(col, row);
        const sprite = stage.scene.add.sprite(x, y);
        sprite.play({ key });
        setOrigin(setDepth(sprite, y), config.origin, this.props.scale);
        stage.layers.main.add(sprite);
        sprite.once('animationcomplete', () => {
            sprite.destroy();
        });
    }
}

class Block extends PropsLookingTree {
    constructor(stage, key) {
        super(stage);
    }
}

class Item extends PropsLookingTree {
    constructor(stage) {
        super(stage);
        
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
        const { leftKey, rightKey, downKey, upKey } = this.keys;
        const { velocity } = this.character.props;
        const { speed } = this.character.stats;
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