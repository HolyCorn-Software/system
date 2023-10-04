/*
Copyright 2021 HolyCorn Software
This module is used to willfully generate errors that can be debugged and traced uniquely
It is used to prevent embarrassing errors 
*/

import short from 'short-uuid'

function shortUniqueID() {
    let generator = short(short.constants.flickrBase58)
    return generator.new()
}


export class Exception extends Error {

    /**
     * 
     * @param {string} message Error message to be read by engineers
     * @param {object} param1 
     * @param {string} param1.code The unique error code.
     * @param {object} param1.flags
     * @param {boolean} param1.flags.showNodeTraces This is normally turned off. But if you turn it on, it'll include stack traces from internal node.js methods
     * @param {number} param1.flags.stackIndex Use this parameter to cut out some parts of the stack trace. For example, setting it to 3 will exclude all stack traces before line (3+1) 4
     * @param {Error} param1.cause
     */
    constructor(message, { code, cause, flags: { showNodeTraces = false, stackIndex = 0 } = { showNodeTraces: false, stackIndex: 0 } } = {}) {
        super(message, { cause });


        for (const property of ['id', 'code']) {
            Reflect.defineProperty(this, property, {
                enumerable: false,
                writable: true
            })
        }

        /** @type {string} */  this.id
        /** @type {string} */  this.code

        this.id = shortUniqueID();


        Object.assign(this, arguments[1])


        this.stack = this.stack.replace(/^Error: /, `${'Exception'.bold.red}\n`)
        if (!showNodeTraces) {
            this.stack = this.stack.replaceAll(/\n.*\(node:internal.*/g, '')
        }
        if (stackIndex !== 0) {
            this.stack = this.stack.split('\n').slice(stackIndex).join('\n')
        }
        this.cause = cause
    }

    /**
     * This defines a set of attributes that are visible and helpful to the client
     * 
     * @returns {{id:string, code:string, httpCode: number, message:string, version:2}}
     */
    get userObject() {
        return this
    }

}
