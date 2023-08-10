/*
Copyright 2021 HolyCorn Software
This class exists for the purpose of extending other objects 
*/

export class SuperObject {
    /*

    NOTE
        At the moment, SuperObject doesn't work with getters and setters


    */

    constructor(target) {

        return new Proxy(target, {
            get: (target, property) => {
                const override = Reflect.get(this, property)
                if (typeof override !== 'undefined') {
                    return override
                }
                const results = Reflect.get(target, property)
                if (results instanceof Function) {
                    return results.bind(target)
                }
                return results
            }
        })
    }
}
