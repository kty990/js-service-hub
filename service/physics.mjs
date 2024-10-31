class Force {

    /**
     * 
     * @param {number} direction - Min: 0, Max: 360 
     * @param {*} intensity - Min: 0, Max: 99999999 
     */
    constructor(direction = 0, intensity = 1) {
        this.direction = direction;
        this.intensity = intensity;
        while (this.direction > 360) {
            this.direction -= 360;
        }
        while (this.direction < 0) {
            this.direction += 360;
        }

        if (intensity < 0 || intensity > 99999999) throw `Force intensity must be between [0] and [99,999,999], got ${intensity}`;
    }

    /**
     * 
     * @param {Actor} target 
     */
    apply(target) {
        function getForce() {
            let LEFT = Math.cos(this.direction) * intensity;
            let TOP = Math.sin(this.direction) * intensity;
            return { LEFT, TOP };
        }
        let { LEFT, TOP } = getForce();
        target.position.x += LEFT;
        target.position.y += TOP;
    }

    accelerate(direction, intensity, time) {
        let id;
        let elapsedTime = 0;

        id = setInterval(() => {
            if (elapsedTime < time) {
                const xAcceleration = Math.cos(direction) * intensity;
                const yAcceleration = Math.sin(direction) * intensity;

                const newDirection = Math.atan2(yAcceleration, xAcceleration) * (180 / Math.PI);
                const newIntensity = Math.sqrt(Math.pow(xAcceleration, 2) + Math.pow(yAcceleration, 2));
                this.direction = newDirection;
                this.intensity = newIntensity;

                elapsedTime += 0.01;
            } else {
                clearInterval(id);
                id = undefined;
                return;
            }
        }, 10);
    }
}

class Vector2 {
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    random(xmin, xmax, ymin, ymax) {
        let xDiff = xmax - xmin;
        let yDiff = ymax - ymin;
        let xR = Math.random() * xDiff;
        let yR = Math.random() * yDiff;
        return new Vector2(xR + xmin, yR + ymin);
    }

    interpolate(newX, newY) {
        return { x: (newX + this.x) / 2, y: (newY + this.y) / 2 };
    }
}

class Constraint {
    /**
     * 
     * @param {Actor} target 
     * @param {number} maxDistance 
     * @param {Vector2} position 
     * 
     */
    constructor(target, maxDistance, position) {
        this.target = target;
        this.maxDistance = maxDistance;
        this.position = position;
    }

    update() {
        let tx = this.target.position.x;
        let ty = this.target.position.y;
        let cx = this.position.x;
        let cy = this.position.y;
        let x = Math.abs(tx - cx);
        let y = Math.abs(ty - cy);
        let cDistance = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));

        if (cDistance > this.maxDistance) {
            // Update position of target element
            let direction = Math.atan2(cx - tx, cy, ty) * (180 / Math.PI);
            let xa = Math.cos(direction) * this.maxDistance;
            let ya = Math.sin(direction) * this.maxDistance;
            // Update position
            this.target.position.x = xa;
            this.target.position.y = ya;
        }
    }
}

class Event {
    channels = {};
    constructor() { }

    CheckEmpty(channel, shouldCreate = false) {
        if (!Array.from(Object.keys(this.channels)).includes(channel)) {
            if (shouldCreate) {
                this.channels[channel] = [];
            } else {
                return true;
            }
        }
        return false;
    }

    on(channel, cb) {
        this.CheckEmpty(channel, true);
        channels[channel].push(cb);
    }

    receive(channel, cb) {
        this.on(channel, cb);
    }

    fire(channel, ...args) {
        if (this.CheckEmpty(channel)) return;
        for (let cb of this.channels[channel]) {
            cb(...args);
        }
    }

    send(channel, ...args) {
        this.fire(channel, ...args);
    }

    once(channel, cb) {
        this.CheckEmpty(channel, true);
        let tmp = (...args) => {
            cb(...args);
            this.channels[channel].splice(this.channels[channel].indexOf(tmp), 1);
            return;
        }
        this.channels[channel].push(tmp);
    }
}

class CollisionDetector extends Event {
    constructor() {
        super();
    }

    /**
     * 
     * @param {Actor} target 
     * @param {Actor} other 
     */
    detectCollision(target, other) {
        if (target.position.x <= other.position.x + other.size.x && target.position.x >= other.position.x) {
            if (target.position.y <= other.position.y + other.size.y && target.position.y >= other.position.y) {
                this.fire('collision', target, other);
            }
        }
    }

    onCollision() {
        return new Promise((resolve) => {
            this.once('collision', resolve);
        })
    }
}

class Actor {
    forces = [];

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @param {HTMLElement} element 
     */
    constructor(x, y, w, h, element) {
        this.position = new Vector2(x, y);
        this.size = new Vector2(w, h);
        this.element = element;
    }

    update() {
        for (let f of forces) {
            f.apply(this.element);
        }
    }

    /**
     * 
     * @param {Force} force 
     */
    addForce(force) {
        this.forces.push(force);
    }

    getForceById(id) {
        for (let f of forces) {
            if (f.id == id) {
                return f;
            }
        }

        return undefined;
    }

    setMaterial(sprite, friction, mass) {
        this.material = new Material(sprite, friction, mass);
    }
}

class Particle extends Actor {
    constructor(x, y, w, h, lifetime) {
        super(x, y, w, h);
        this.lifetime = lifetime;
    }

    startDecay() {
        setTimeout(() => {
            this.destroy();
        }, this.lifetime);
    }

    destroy() {

    }
}

class ParticleEmitter extends Actor {
    constructor(x, y, w, h) {
        super(x, y, w, h);
    }

    /**
     * 
     * @param {number} count 
     * @param {number} lifetime - ms
     * @param {number} xAcceleration - Horizontal Acceleration (Positive = right, Negative = left)
     * @param {number} yAcceleration - Vertical Acceleration (Positive = Down, Negative = Up)
     */
    emit(count = 50, lifetime = 3000, xAcceleration = 1, yAcceleration = 1) {
        for (let i = 0; i < count; i++) {
            let pos = Vector2.random(this.position.x, this.position.x + this.size.x, this.position.y, this.position.y + this.size.y);
            let p = new Particle(pos.x, pos.y, 1, 1, lifetime);
            let acceleration = new Force(Math.sqrt(Math.pow(xAcceleration, 2) + Math.pow(yAcceleration, 2)), 1);
            p.addForce(acceleration);
            acceleration.accelerate(acceleration.direction, (xAcceleration + yAcceleration) / 2, lifetime);
        }
    }
}

class GravitySource extends Force {
    actors = [];
    constructor(x, y) {
        this.position = new Vector2(x, y);
    }

    addActor(actor) {
        this.actors.push(actor);
    }

    removeActor(actor) {
        this.actors.splice(this.actors.indexOf(actor), 1);
    }

    update() {
        for (let a of this.actors) {
            let tmpDir = Math.atan2(a.position.x - this.position.x, a.position.y - this.position.y) * (180 / Math.PI);
            this.direction = tmpDir;
            this.apply(a);
        }
    }
}

class Sprite {
    constructor(path) {
        this.path = path;
        this.image = load; s
    }
}

class World extends Event {
    gravity = new Force(180, 9.81); // down, 9.81 intensity
    actors = [];
    constraints = [];
    pixels = [];

    /**
     * 
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(canvas) {
        this.element = canvas;
    }

    addActor(actor) {
        this.actors.push(actor);
        this.fire('actor-add', actor);
    }

    removeActor(actor) {
        this.actors.splice(this.actors.indexOf(actor), 1);
        this.fire('actor-remove', actor);
    }

    addConstraint(constraint) {
        this.constraints.push(constraint);
        this.fire('constraint-add', constraint);
    }

    removeConstraint(constraint) {
        this.constraints.splice(this.constraints.indexOf(constraint), 1);
        this.fire('constraint-remove', constraint);
    }

    render() {
        for (let a of actors) {
            let pixels = a.render();
            // Set this.pixels array based on pixels, according to position and size
        }
    }

    update() {
        this.actors.forEach(a => a.update());
        this.constraints.forEach(c => c.update());
        this.fire('update');
    }
}

class Material {

    /**
     * 
     * @param {Sprite} sprite 
     * @param {number} friction Coefficient of friction
     * @param {*} mass - lbs
     */
    constructor(sprite, friction, mass) {
        this.sprite = sprite;
        this.friction = friction;
        this.mass = mass;
    }

}

export { Force, Constraint, Vector2, CollisionDetector, Material, Sprite, World, GravitySource, ParticleEmitter, Actor };
