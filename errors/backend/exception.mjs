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
     * @param {string} param1.code The unique error code. For faculty based errors, you can avoid the prefix 'error.<faculty_name>'
     * @param {object} param1.flags
     * @param {boolean} param1.flags.showNodeTraces This is normally turned off. But if you turn it on, it'll include stack traces from internal node.js methods
     * @param {number} param1.flags.stackIndex Use this parameter to cut out some parts of the stack trace. For example, setting it to 3 will exclude all stack traces before line (3+1) 4
     * @param {Error} param1.cause
     */
    constructor(message, { code, cause, flags: { showNodeTraces = false, stackIndex = 0, prefix = true } = { showNodeTraces: false, stackIndex: 0 } } = {}) {
        super(message);


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



        let stackParts = this.stack.split('\n')

        if (!showNodeTraces) {
            stackParts = stackParts.filter(x => !(/ \(node:.+\)$/.test(x)));
            //The stack index allows only certain parts of the stack to be visible. It offsets the stack lines by a specified number
            stackParts = stackParts.join('\n').replace(this.message, '').split('\n').slice(stackIndex)
        }

        this.stack = stackParts.join('\n').replace(/\[Error\]/, '').replace(/Error:/, '') + `\n Exception id: ${this.id.cyan} \n${this.code ? 'code: ' + this.code.blue : ''}`
        this.stack = this.stack.replace(this.message, '')
        this.stack = `${'Exception'.red.bold}: ${this.message}\n${this.stack}`
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
