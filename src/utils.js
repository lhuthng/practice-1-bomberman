const epsilonConstrain = (value, epsilon) => {
    return Math.abs(value) < epsilon ? 0 : value;
};

const lerp = (start, end, interpolation) => {
    return start + (end - start) * interpolation;
};

const setOrigin = (target, origin, scale) => {
    if (origin) {
        if (origin.x) target.displayOriginX = target.width * origin.x;
        if (origin.y) target.displayOriginY = target.height * origin.y;
        if (origin.displayX) target.displayOriginX = origin.displayX;
        if (origin.displayY) target.displayOriginY = origin.displayY;
        if (origin.dx) target.displayOriginX += origin.dx;
        if (origin.dy) target.displayOriginY += origin.dy;
    }
    else target.setOrigin(0, 0);
    target.scale = scale;
};

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