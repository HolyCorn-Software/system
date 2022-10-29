/*
Copyright 2021 HolyCorn Software

This module is part of the BasePlatform module

It is an api that provides a number of features related to managing and providing information about errors
*/


import libPath from 'node:path'

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const __dirname = libPath.dirname(fileURLToPath(import.meta.url));

import { ErrorEngine } from "../public/errors/engine.mjs";
import { checkArgs } from '../util/util.js';
import EventEmitter from 'node:events';



let flags = {
    already_warned_for_missing_system_errors: false
}



export class BasePlatformErrorAPI extends EventEmitter {


    /**
     * 
     * @param {import('./platform.mjs').BasePlatform} basePlatform 
     */
    constructor(basePlatform) {
        super();

        this.base = basePlatform
        this.custom = {}

        //This simply keeps track of events that have been emitted.
        //Events emitted will be delayed so that the same event doesn't get emitted more than once in a short space of time (e.g 2s)
        this.eventQueue = []

        /** @type {function(('change'), function(...any))} */ this.addListener
        /** @type {typeof this.addListener} */ this.on

    }

    emit(type, ...data) {
        if (this.eventQueue.indexOf(type) !== -1) {
            return; //We'll just let only the previous event fire
        }

        //However, if this is the first time
        //We delay the propagation
        //And while we delay it, we make sure other later callers don't immediately get propagated
        this.eventQueue.push(type);

        setTimeout(() => {
            super.emit(type, ...data);
            this.eventQueue = this.eventQueue.filter(x => x !== type);
        }, 1000)
    }



    /**
     * 
     * @param {string} code The code name for the error. Note that the 'error.system.' prefix will be prepended to this code
     * @param {import('../errors/handler.mjs').ErrorV2} param1 
     */
    setCustomError(code, { backend, frontend } = {}) {

        checkArgs(arguments, { 0: 'string', 1: { backend: { httpCode: 'number', message: 'string' }, frontend: { message: 'string' } } });

        if (typeof code !== 'string') {
            throw new Error(`The first argument ('code') is not a string`)
        }
        if (typeof backend === 'undefined') {
            throw new Error(`The 'backend' parameter of the second argument is not defined`)
        }

        if (typeof frontend === 'undefined') {
            throw new Error(`The 'frontend' parameter of the second argument is not defined`)
        }

        if (typeof backend.httpCode !== 'number' || typeof backend.message !== 'string' || typeof frontend.message !== 'string') {
            throw new Error(`Invalid parameters were passed.\nHere's an example:\n\t${JSON.stringify(BasePlatformErrorAPI.example)}`)
        }

        this.custom[code] = {
            backend,
            frontend
        }

        this.emit('change');

    }

    /**
     * Set's a number of custom errors at a single time.
     * Note that every error will be prefixed with 'error.system.'
     * @param {import('../errors/handler.mjs').ErrorMapV2} errorsMap 
     */
    setCustomErrors(errorsMap) {
        for (let error in errorsMap) {
            try {
                this.setCustomError(error, errorsMap[error])
            } catch (e) {
                throw new Error(`The error '${error}' is not properly defined\nHere's an example of what to do:\n\t${JSON.stringify(BasePlatformErrorAPI.example)}\n`, e)
            }
        }
    }

    static get example() {
        return {
            backend: {
                message: 'The client tried to make payments before signing in',
                httpCode: 401
            },
            frontend: {
                message: 'Please sign in before paying'
            }
        }
    }

    get map() {
        //The various error codes for the various faculties
        /** @type {import("../errors/handler.mjs").ErrorMapV2} */
        let map = {}

        for (var faculty of [...this.base.faculties]) {


            /** First, convert old-style errors to the modern format */
            let v1Errors = faculty.descriptor.errors;
            let v2Errors = faculty.descriptor.errorsV2;

            let errors = {
                ...ErrorEngine.convertV1MapToV2(v1Errors),
                ...v2Errors
            }

            // Now prefix the errors

            for (var error in errors) {


                if (!errors[error].backend || !errors[error].frontend) {

                    console.log(`The definition of ${error.red} is lacking the ${`${!errors[error].backend ? 'backend' : 'frontend'}`.red} attribute\n Use this example: %o`, BasePlatformErrorAPI.example)
                    continue
                }
                if (!errors[error].backend.httpCode) {
                    console.log(`The definition of ${error.red} is malformed because ${'backend.httpCode'.blue} is missing.\nUse this example: %o`, BasePlatformErrorAPI.example)
                    continue
                }
                map[`error.${faculty.descriptor.name}.${error}`] = errors[error]
            }
        }

        // Now compute the system error maps
        let system_errors = {};
        try {
            fs
            system_errors = require('../../common/errors.json');
        } catch (e) {
            if (!flags.already_warned_for_missing_system_errors) {
                setTimeout(() => console.log(`The system doesn't have any custom errors of it's own. \n Custom System errors should be defined in ${libPath.resolve(__dirname, '../../common/errors.json')} \n This is a suggestion for optimum results\n`), 2000)
                flags.already_warned_for_missing_system_errors = true;
            }
        }

        for (let error in { ...system_errors, ...this.custom }) {
            map[`error.system.${error}`] = system_errors[error];
        }

        return map
    }

}

function rightAlign(text) {
    const consoleWidth = process.stdout.columns;
    const numOfTabs = Math.max(0, Math.floor((consoleWidth - text.length)) - 1);
    return `${' '.repeat(numOfTabs)}${text}`

}