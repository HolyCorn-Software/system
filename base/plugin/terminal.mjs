/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module (terminal) provides methods that can be used to manage plugins of the entire system
 */

import BasePluginManager from "./manager.mjs";


export default class BasePluginAPI extends BasePluginManager {


    constructor() {

        super()
        
        return new Proxy(this, {
            get: (target, property, receiver) => {
                const value = Reflect.get(target, property, receiver)
                if (typeof value === 'function') {
                    return function () {
                        return value(...[...arguments].slice(1))
                    }
                }
            }
        })


    }



}