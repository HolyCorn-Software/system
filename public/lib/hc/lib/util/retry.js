/**
 * Copyright 2022 HolyCorn Software
 * 
/**
 * This class allows us to retry an action in such a way that the time between each retry grows multiplicatively 
 */
export class GrowRetry {

    constructor(action, { maxTime = 10_000, startTime = 10, factor = 2 } = {}) {

        /** @type {function} */
        this.action = action

        /** @type {number} */ this.maxTime = maxTime
        /** @type {number} */ this.startTime = startTime
        /** @type {number} */ this.factor = factor

    }

    execute() {
        let currentTime = this.startTime + 0;

        return new Promise((resolve, reject) => {

            const doOnce = () => {
                setTimeout(async () => {
                    try {
                        resolve(await this.action());
                    } catch (e) {
                        currentTime *= this.factor
                        currentTime = currentTime > this.maxTime ? this.maxTime : currentTime < this.startTime ? this.startTime : currentTime;
                        doOnce();
                    }
                }, currentTime)
            }

            doOnce();

        })
    }

}
