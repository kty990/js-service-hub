class TweenService {
    constructor() {
        this.TweenInfo = TweenInfo;
    }

    create_tween(target, info) {
        this.tween = new Tween(target, info);
    }
}

class TweenInfo {
    constructor(lifetime = 0, step = 0, options = {}) {
        this.lifetime = lifetime;
        this.options = options;
    }
}

class Tween {

    /**
     * 
     * @param {*} target 
     * @param {TweenInfo} info 
     */
    constructor(target, info) {
        if (!info instanceof TweenInfo) throw `Tween constructor argument 'info' must be of instance of TweenInfo, got ${typeof info} `;
        this.target = target;
        this.info = info;
        this.status = false; // false = not running, true = running
        this.currentStep = 0;
    }

    play() {
        if (this.status) return;
        this.status = true;
        const getValueAtStep = (step, initialValue, targetValue) => {
            if (typeof initialValue === 'string' && typeof targetValue === 'string') {
                // Handle string interpolation
                const initialChars = initialValue.split('');
                const targetChars = targetValue.split('');
                const stepSize = (targetChars.length - initialChars.length) / step;
                const interpolatedChars = [];
                for (let i = 0; i < step; i++) {
                    const index = Math.floor(initialChars.length + stepSize * i);
                    interpolatedChars.push(targetChars[index]);
                }
                return interpolatedChars.join('');
            } else {
                // Handle numerical values as before
                const difference = targetValue - initialValue;
                const stepSize = difference / step;
                return initialValue + stepSize * step;
            }
        };
        const _activateTween = (initialValue, t, k, v, info) => {
            setTimeout(() => {
                t[k] = getValueAtStep(this.currentStep++);
                if (t[k] == v) {
                    return;
                }
                _activateTween(initialValue, t, k, v, info);
            }, info.step);
        }
        for (const [key, value] of Object.entries(this.info.options)) {
            if (this.target[key]) {
                _activateTween(this.target[key], this.target, key, value, this.info);
            }
        }
    }

    reset() {
        this.currentStep = 0;
    }

    stop() {
        this.status = false;
        this.reset();
    }
}


export { TweenService }