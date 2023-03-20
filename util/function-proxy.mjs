/**
 * Copyright 2022 HolyCorn Software
 * The Soul System
 * This module allows us to create a proxy that would modify the arguments, and returns of any function calls made to an object
 */



/**
 * Donot import.
 * Use Faculty globals
 * 
 */
export default class FunctionProxy {


    /**
     * 
     * @param {object} object 
     * @param {FunctionProxyFunctions} modifier The object containing the functions that would be called to modify the arguments, and out. The output of the method would be used as input for the real method being called. If the method returns a promise, the promise too would be resolved 
     */
    constructor(object, modifier) {


        const prefix = arguments[2]

        function wrapReturn(metadata, data) {
            return (modifier?.returns || ((metadata, ret) => {
                return ret
            }))(metadata, data)
        }

        return new Proxy(object, {
            get: (target, property, receiver) => {

                const value = Reflect.get(target, property, receiver)
                switch (typeof value) {
                    case 'function':
                        return function () {
                            const methodMetadata = { property: prefix ? `${prefix}${property}` : property }
                            const modifiedParams = (modifier?.arguments || ((metadata, ...args) => args))(methodMetadata, ...arguments)
                            if (modifiedParams instanceof Promise) {
                                return (async function () {
                                    return await wrapReturn(await value.call(this, methodMetadata, ...(await modifiedParams)))
                                }.bind(this))()
                            } else {
                                const ret = value.call(this, ...modifiedParams)
                                return ret instanceof Promise ? (async () => wrapReturn(methodMetadata, await ret))() : wrapReturn(ret)
                            }
                        }.bind(object)
                    case 'object':
                        return new FunctionProxy(value, modifier, `${property}.`)

                    default:
                        return wrapReturn(value)
                }

            },
            set: (target, property, receiver) => {
                throw new Error(`Setting the '${property}' is not allowed via an ArgumentProxy interface.`)
            }
        })



    }

    /**
     * This class when instantiated, will create an ArgumentProxy such that the first argument of every function will be ommitted.
     * 
     * This is very useful in the soul system, especially in providing internal methods to faculties
     */
    static {

        /**
         * @class
         * @template Type
         * @extends Type
         * @augments Type
         */
        this.SkipArgOne = class {

            /**
             * This returns a wrapped object, whereby every first argument of every function called, will be removed
             * @param {Type} target 
             * @returns {Type}
             * @constructor
             */
            constructor(target) {

                return new FunctionProxy(target, {
                    arguments: (data, ...args) => {
                        return args.slice(1)
                    }
                })
            }
        }
    }

}