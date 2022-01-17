const epsilonConstrain = (value, epsilon) => {
    return Math.abs(value) < epsilon ? 0 : value;
};

const lerp = (start, end, interpolation) => {
    return start + (end - start) * interpolation;
};

const setOrigin = (target, origin, scale) => {
    
    if (origin) {
        if (origin.x !== undefined) target.displayOriginX = target.width * origin.x;
        if (origin.y !== undefined) target.displayOriginY = target.height * origin.y;
        if (origin.displayX !== undefined) target.displayOriginX = origin.displayX;
        if (origin.displayY !== undefined) target.displayOriginY = origin.displayY;
        if (origin.dx !== undefined) target.displayOriginX += origin.dx;
        if (origin.dy !== undefined) target.displayOriginY += origin.dy;
    }
    else target.setOrigin(0, 1);
    target.setScale(scale || 1);
    return target;
};

const setDepth = (target, depth) => {
    if (typeof depth === "number") target.setDepth(depth);
    else if (typeof depth === "function") target.setDepth(depth(target));
    return target;
}

const setBodyRect = (body, width, height, x = 0, y = 0, scale = 1) => {
    body.setSize(width * scale, height * scale);
    body.setOffset(x * scale, y * scale);
    return body;
}

const setBodyCircle = (body, radius, x = 0, y = 0, scale = 1) => {
    body.setCircle(radius * scale, (x - radius) * scale, (y - radius) * scale);
    return body;
}

const addToLayer = (target, layer) => {
    layer.add(target);
    return target;
}

const permutateWords = (pool) => {
    const result = [''];
    while (pool.length > 0) {
        const count = result.length;
        for (let index = 0; index < count; index++) {
            pool[0].forEach(word => result.push(result[index] + word));
        }
        pool.shift();
        result.splice(0, count);
    }
    return result;
}
