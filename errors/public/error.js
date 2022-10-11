/*
Copyright 2021 HolyCorn Software
This module ensures that errors from the Server get displayed to client in a user-friendly manner
*/

import { ErrorEngine } from '../../public/errors/engine.mjs'

const errorMap = await (await fetch('/$/system/maps/errors')).json() //This is a map of which errors mean what, gotten from the faculties

console.warn(`/system/static/errors/public/error.js has been moved to /$/system/static/public/errors/error.js`)


/**
* @type {import ("system/public/errors/engine.mjs").ErrorEngine}
*/
let engine = new ErrorEngine(errorMap)

export class CalculatedError extends Error {
    // One that can be shown to the user
    /**
     * 
     * @param {{code:string, httpCode:number, id:string, message:string} | string} v2Error 
     */
    constructor(v2Error) {
        super(engine.resolve(v2Error.code || v2Error).message);
        if (typeof v2Error === 'object') {
            Object.assign(this, v2Error)
        }
    }
}


/**
 * @param {string|CalculatedError|Error} error
 * @returns {CalculatedError|undefined}
 */
export function handle(error) {
    error = typeof error == 'string' ? new CalculatedError(error) : error

    return error;
}


