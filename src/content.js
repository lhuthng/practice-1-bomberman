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
        'flame': { origin: {...MBOrigin, dy: -3} },
        'quantity': { origin: {...MBOrigin} }, 
        'quality': { origin: {...MBOrigin} },
    }
}

const upgrades = {
    quality: (character) => { character.stats.power++; },
    quantity: (character) => { character.stats.remains += 1; }
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
            x, y, cellWidth, cellHeight, maxRow, maxCol, scale,
            characters: []
        }

        this.convert = this.convert.bind(this);
        this.convertToCenter = this.convertToCenter.bind(this);
        this.convertToMiddleBottom = this.convertToMiddleBottom.bind(this);
        this.revert = this.revert.bind(this);
        this.getEntity = this.getEntity.bind(this);
        this.getEntityProp = this.getEntityProp.bind(this);
        this.setEntity = this.setEntity.bind(this);
        this.setCharacter = this.setCharacter.bind(this);

        layers.floor    = layers.floor  || scene.add.layer();
        layers.border   = layers.border || scene.add.layer();
        layers.main     = layers.main   || scene.add.layer();

        
    
        const borderCol = maxCol + 2, borderRow = maxRow + 2;
        const voidEntity = { callback: function() { }, scope: undefined };
        const quickAdd = (layer, col, row, key, config) => {
            col = positiveModulo(col, borderCol);
            row = positiveModulo(row, borderRow);
            const { x, y } = this.convert(col, row);
            const { origin, depth, addEntity } = config || { };
            addEntity && this.setEntity(col, row, voidEntity);

            return addToLayer(setDepth(setOrigin(scene.add.image(x, y, atlasKey, key), origin, scale), depth), layer);
        }
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
        groups.static = groups.static || scene.physics.add.staticGroup();
        config = {...config, origin: LBOrigin };
        for (let col = 2; col < maxCol; col += 2) for (let row = 2; row < maxRow; row += 2) {
            const image = quickAdd(layers.main, col, row, solidKey, config);
            setDepth(image, image.y - 3 * this.props.scale);
            groups.solid.add(image);
            setBodyRect(image.body, cellWidth, cellHeight, 0, image.height - cellHeight, scale);
        }

        // create obstacles
        const obstacleCallback = () => { };
        for (let col = 1; col <= maxCol; col++) for (let row = 1; row <= maxRow; row++) {
            if (this.getEntity(col, row) === undefined && Math.random() <= 0.6) {
                const entity = {
                    callback: obstacleCallback,
                    mask: 0,    // 0bULDR
                }
                const check = (colOffset, rowOffset, position) => {
                    const checkEntity = this.getEntity(col + colOffset, row + rowOffset);
                    if (checkEntity && checkEntity.callback === obstacleCallback) {
                        entity.mask |=  1 << position;
                        checkEntity.mask |= 1 << (position - 2);
                    }
                }
                check(-1, 0, 2);
                check(0, -1, 3);
                this.setEntity(col, row, entity);
            }
        }

        for (let col = 1; col <= maxCol; col++) for (let row = 1; row <= maxRow; row++) {
            const entity = this.getEntity(col, row);
            if (entity && entity.callback == obstacleCallback) {
                const postfix = removeZeroBits(0b1101 & entity.mask) + 1;
                const block = new Block(this, col, row, atlasKey, 'bush');
                entity.callback = block.destroy;
                entity.isBlock = true;
            }
        }

        groups.characters = groups.characters || scene.add.group();
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

    convertToMiddleBottom(col, row) {
        const { cellWidth, cellHeight, scale } = this.props;
        const result = this.convert(col, row);
        result.x += cellWidth / 2 * scale;
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

    getEntityProp(col, row, name) {
        const entity = this.getEntity(col, row);
        return entity && entity[name];
    }

    setEntity(col, row, entity) {
        this.entities[col * (this.props.maxRow + 2) + row] = entity;
    }

    setCharacter(col, row, character) {
        const remove = (offsetCol, offsetRow) => {
            const entity = this.getEntity(col + offsetCol, row + offsetRow);
            if (entity !== undefined && entity.isBlock === true) entity.callback(true);
        }
        remove(0, 0); remove(0, 1); remove(1, 0); remove(0, -1); remove(-1, 0);
        this.props.characters.push(character);
    }
}

class Character extends PropsLookingTree {
    constructor(stage, col, row, key) {
        super(stage);

        const config = presets.config[key] || { }; 
        const { origin, colliderRadius} = config;

        stage.setCharacter(col, row, this);
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
            weaponSpeed: 3,
            power: 2,
            remains: 1,
        }

        const { x, y } = stage.convertToCenter(row, col);
        const sprite = stage.scene.physics.add.sprite(x, y, key);
        sprite._character = this;
        stage.layers.main.add(sprite);
        sprite.play({ key: key + '-still' + this.props.direction.face + this.props.direction.side, repeat: -1 });
        setDepth(setOrigin(sprite, origin, this.props.scale), y);
        setBodyCircle(sprite.body, 4, sprite.width * sprite.originX, sprite.height * sprite.originY);
        sprite.body.setCollideWorldBounds(true);
        stage.scene.physics.add.collider(sprite, stage.groups.solid);

        stage.scene.physics.add.overlap(sprite, stage.groups.static, (character, powerUp) => {
            character = sprite._character;
            powerUp = powerUp._powerUp;
            powerUp.upgrade(character);
            powerUp.destroy();
        })

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
        if (this.stats.remains > 0 && this.stage.getEntity(col, row) === undefined) {
            const key = this.props.key;
            this.stats.remains -= 1;
            new Weapon(this, col, row, presets.weapon[key], this.stats.power, this.stats.weaponSpeed, () => { this.stats.remains += 1; });
        }
    }
}

class Weapon extends PropsLookingTree {
    constructor(source, col, row, key, power, triggerTime, callback) {
        super(source);

        const config = presets.config[key] || { };

        this.source = source;
        this.stage = this.source.stage;
        this.isActive = true;
        this.props = {
            col, row, key, power, callback,
            scale: config.scale || source.props.scale || 1
        };
        this.trigger = this.trigger.bind(this);

        const stage = source.stage;
        const { x, y } = stage.convertToCenter(col, row);
        const sprite = stage.scene.add.sprite(x, y)
        // const sprite = stage.scene.physics.add.sprite(x, y);
        stage.groups.solid.add(sprite);
        // this.stage.scene.physics.add.collider(source.sprite, sprite);
        // this.stage.characters.forEach(character => {

        // });
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
            if (this.props.callback !== undefined) this.props.callback();
            const { col: rootCol, row: rootRow } = this.props;
            this.stage.setEntity(rootCol, rootRow, undefined);
            const blastKey = presets.blast[this.props.key]
            new Explosion(this, rootCol, rootRow, blastKey);
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(dir => {
                for (let power = 1; power < this.props.power; power++) {
                    const col = rootCol + dir[0] * power, row = rootRow + dir[1] * power;
                    const entity = this.stage.getEntity(col, row);
                    if (entity === undefined || entity.callback()) {
                        new Explosion(this, col, row, blastKey);
                    } else {
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

        const config = presets.config[key] || { };

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
    constructor(stage, col, row, atlasKey, key) {
        super(stage);
        
        const config = presets.config[key] || { };

        this.stage = stage;
        this.props = {
            col, row, atlasKey, key,
            scale: config.scale || stage.props.scale
        };

        const { x, y } = stage.convert(col, row);
        this.image = stage.scene.add.image(x, y, atlasKey, key);
        setOrigin(setDepth(this.image, y), config.origin, this.props.scale);
        stage.layers.main.add(this.image);
        stage.groups.solid.add(this.image);
        setBodyRect(this.image.body, stage.props.cellWidth, stage.props.cellHeight, 0, this.image.height - stage.props.cellHeight, this.props.scale);

        this.destroy = this.destroy.bind(this);
    }

    destroy(instant = false) {
        this.image.destroy();
        this.stage.setEntity(this.props.col, this.props.row, undefined);
        if (instant === true) {
            
        }
        else {
            const { col, row, atlasKey } = this.props;
            const random = Math.random() * 6;
            if (random < 1) new PowerUp(this.stage, col, row, atlasKey, 'quality');
            else if (random < 2) new PowerUp(this.stage, col, row, atlasKey, 'quantity');
        }
        return false;
    }
}

class Item extends PropsLookingTree {
    constructor(stage) {
        super(stage);
        
    }
}

class DirectController extends PropsLookingTree {
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

class PowerUp extends PropsLookingTree {
    constructor(stage, col, row, atlasKey, key) {
        super(stage);

        const config = presets.config[key] || { };

        this.stage = stage;
        this.upgrade = upgrades[key];
        this.props = {
            col, row, key,
            scale: config.scale || stage.props.scale
        };

        const { x, y } = stage.convertToMiddleBottom(col, row);
        this.image = stage.scene.add.image(x, y, atlasKey, key);
        this.image._powerUp = this;
        setOrigin(setDepth(this.image, y), config.origin, this.props.scale);
        stage.layers.main.add(this.image);
        stage.groups.static.add(this.image);
        setBodyRect(this.image.body, stage.props.cellWidth - 2, stage.props.cellHeight, 1, this.image.height - stage.props.cellHeight + 1, this.props.scale);
        this.image.onCollide = false;
        this.destroy = this.destroy.bind(this);
        const entity = { callback: this.destroy }
        this.stage.setEntity(col, row, entity);

    }
    destroy() {
        this.image.destroy();
        this.stage.setEntity(this.props.col, this.props.row, undefined);
        return true;
    }
}
