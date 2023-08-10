/**
 * Copyright 2021 HolyCorn Software
 * This module provides commonly used functionalities
 */

import vm from 'node:vm'
import exclusiveUpdate from "./exclusive-update.mjs";
import SimpleCache from "./simple-cache.mjs";
import recursePath from "./recursive-path.mjs";
import WaitList from './wait-list.mjs';

/**
 * 
 * @param {object} args 
 * @param {object} structure 
 */



/**
 * @template ArgType
 * @template StructInput
 * This method is used to check that arguments conform to a given structure.
 * @param {ArgType} args The Object to be checked
 * @param {FinalType<ArgType,StructInput,StructureCheckInput<ArgType>,StructInput>|ArgType|GenericCheckerStructure} structure The structure it must follow
 * @param {string|undefined} argName This is mandatory only when structure is a string. It is used to construct the resulting error message.
 * That is, ${argName} was supposed to be a ${structure} but a(n) ${typeof args} was passed
 * @param {(arg0: CheckerCallbackArgs<FinalType<ArgType,StructInput>>)=>void} error_callback An optional parameter that will be called when an error is detected, instead of throwing errors
 * @param {('definite'|'exclusive')[]} flags If 'definite' is passed, then type of each item is only checked when the item is not undefined. When 'exclusive' is set, the system will
 * throw an error if the object has more parameters than the structure
 * Example:
 * ```
 * checkArgs(userInput, 'string')
 * checkArgs(userInput, {name:'string', age:"number"})
 * checkArgs(userInput, {name:/.+ .+/, age:'number'})
 * checkArgs(userInput, {gender:"'male'|'female'", id:"number|boolean|'nothing'"})
 * ```
 */
export function checkArgs(args, structure, argName, error_callback, flags = []) {


    /**
     * args could be {name:'Jimmy', age:34, size:'Large'}
     * structure could be {name:'string', age:'number', size:'number'}
     * 
     * We could still have a more reasonable structure like
     * {
     *      name:'string', 
     *      age:'number', 
     *      id:{
     *          dob:'string', 
     *          maritalStatus:'string'
     *      },
     *      cmr_phone:/^237(\d+)$/
     * }
     */
    let check = (obj, type, fieldName) => {

        if (flags.indexOf('definite') !== -1 && typeof object == 'undefined') {
            return
        }


        /**
         * Used internally to throw errors, or call the callback, depending on if the callback is available
         * @param {Error} error 
         * @param {{ideal:string, real:string, value: any, field: string}} callback_params 
         * @returns {any}
         */
        let throwError = (error, callback_params) => {
            if (typeof error_callback === 'function') {
                return error_callback({
                    field: fieldName,
                    ideal: type,
                    real: typeof obj,
                    value: obj,
                    error
                })
            }
            throw error
        }


        if (Array.isArray(type)) {
            for (let subtype of type) {
                try {
                    check(obj, subtype, fieldName)
                    return
                } catch { }
            }
            throwError(
                new Exception(`Please make sure ${fieldName} is one of the following types ${type.join(', ')}`, {
                    code: 'error.input.validation'
                })
            )
        }

        if (typeof type === 'string') {

            const subTypes = type.split('|')

            let isOkay = false;

            for (let subType of subTypes) {

                const enumRegExp = /^['"](.+)['"]$/
                if (enumRegExp.test(subType)) {
                    const enumValue = enumRegExp.exec(subType)[1]
                    if (obj === enumValue) {
                        isOkay = true
                        break
                    }
                } else {
                    if ((typeof obj) == subType) {
                        isOkay = true
                        break
                    }

                }

            }

            if (!isOkay) {
                throw new Exception(`${fieldName} was supposed to be a ${type} but ${obj ?? 'nothing' ? 'nothing' : `a(n) ${typeof obj}`} was passed`, {
                    code: `error.input.validation("${fieldName} was supposed to be a ${type} but a(n) ${typeof obj} `
                        + `was passed")`
                })
            }





        } else {
            let constraint = type

            if (constraint instanceof RegExp) {
                if (!constraint.test(obj)) {
                    throwError(new Exception('Input does not conform to the pattern', { code: `error.input.validation("${fieldName} does not follow the right pattern")` }))
                }
            } else {

                for (var field in type) {
                    check(obj?.[field], type[field], `${fieldName ? `${fieldName}.` : ''}${field}`)
                }

            }
        }


        //Now check if the object hasn't passed too much
        if (flags.indexOf('exclusive') !== -1 && type !== 'object' && typeof obj !== 'string') {
            for (let objectField in obj) {
                if (typeof type[objectField] === 'undefined') {
                    throw new Exception(`Sorry, ${objectField} was passed in ${fieldName}, when it was not needed.`)
                }
            }
        }
    }

    if (typeof structure !== 'undefined' && typeof args === 'undefined') {
        throw new Exception(`No value was passed for ${argName}`)
    }
    check(args, structure, argName)


}





/**
 * This method is used to call other functions only for a given amount of time. If the function takes more than the specified time to execute,
 * this method will throw an error
 * @param {function} func 
 * @param {object} param1
 * @param {string} param1.label A description of the action the method is trying to perform
 * @param {number} param1.timeout The maximum time to wait for this method to complete
 * @returns {Promise<any>}
 */
export let callWithTimeout = (func, { label, timeout = 5000 }) => {

    checkArgs(func, 'function', 'first argument');
    let stack = new Error().stack.split('\n').slice(2).join('\n');
    return new Promise(async (resolve, reject) => {

        let error_timeout = setTimeout(() => {
            // console.log(`${label || func.name} did not compelete before ${timeout / 1000}s deadline`)
            reject(`Timeout performing action ${label || func.name}\n${stack}`)
        }, timeout)


        try {
            let funcRet = await func();

            clearTimeout(error_timeout);
            resolve(funcRet);
        } catch (e) {
            reject(e);
        }
    })
}


export let callWithRetries = (func, { label, maxTries = 5, callInterval = 5000, timeout = 5000 }) => {

    checkArgs(func, 'function', 'first argument')
    const stack = new Error().stack.split('\n').slice(2).join('\n');

    return new Promise(async (resolve, reject) => {

        let call = () => {
            return new Promise(async (resolve, reject) => {
                setTimeout(() => reject(`timeout after ${timeout / 1000}s for task ${label}\n${maxTries} left\n${stack}`), timeout);
                try {
                    let ret = await func();
                    resolve(ret);
                    return true;
                } catch (e) {
                    reject(e);
                }
            })
        }

        let lastError = new Error(`Timeout performing action ${label} within ${maxTries * callInterval / 1000}s time limit`)

        while (maxTries-- > 0) {
            try {
                resolve(await call())
                break;
            } catch (e) {
                lastError = new Error(`${label} failed due to ,\n${e.stack || e} retrying in ${callInterval / 1000}s\n${stack}`)
            }
            await new Promise(r => setTimeout(r, callInterval))
        }

        reject(lastError)

    })


}


/**
 * Calling this method returns the file url and function that called your function.
 * @param {object} param0 
 * @param {boolean} param0.hideFunction Set this to true if you prefer to hide the function name and return only file url
 * @param {boolean} param0.hideFileURL Set this to true if you prefer to get only the function name and hide the file url
 * @param {number} param0.offset Use this value to offset which of the callers you want to get (e.g caller before the previous caller)
 * If both `hideFunction` and `hideFileURL` are passed, both will be ignored
 * @returns {string}
 */
export function getCaller({ hideFunction = true, hideFileURL, offset = 0 } = {}) {

    const urlAndFunction = /at (.+)/.exec(new Error().stack.split('\n')[3 + offset])[1]

    const sandbox = () => {


        if (!!hideFunction === !!hideFileURL) {
            return urlAndFunction
        }


        if (hideFileURL) {
            return /([^(]+) */.exec(urlAndFunction)?.[1]
        }

        if (hideFunction) {
            try {
                return /^.*(file[^)]+)(\)|$)/.exec(urlAndFunction)?.[1]
            } catch (e) {
                console.log(`urlAndFunction is ${urlAndFunction}`)
                throw e
            }
        }
    }

    let caller = sandbox()
    if (!caller) {
        console._log?.(`Couldn't make something out of urlAndFunction ${urlAndFunction} hideFunction: ${hideFunction}, hideFileURL: ${hideFileURL}\ncaller is ${caller}`)

    }

    return caller;
}



/**
 * This method picks a selected number of fields from an object, if and only if the object has those fields
 * @param {object} object 
 * @param {string[]} fields 
 * @param {(field:string)=>string} transform
 * @returns {object}
 */
export function pickOnlyDefined(object, fields, transform = x => x) {
    const result = {}
    fields ||= Reflect.ownKeys(object)
    for (let field of fields) {
        if (typeof object[field] !== 'undefined' && object[field] !== null) {
            result[transform(field)] = object[field]
        }
    }
    return result
}


/**
 * This method securely substitutes text data, using parameters provided
 * @param {string} string 
 * @param {object} data 
 * @returns {string}
 */
export function substituteText(string, data) {
    const context = vm.createContext({ ...data })
    return vm.runInContext(`\`${string}\``, context)
}

/**
 * This method cleans path information, by removing some things such as duplicated slashes
 * @deprecated Use (node:path).normalize()
 * @param {string} path 
 * @returns {string}
 */
function cleanPath(path) {
    return path.replaceAll(/[^^]\.\//g, '/').replaceAll(/((\\){2,})|((\/){2,})/g, x => `${x.substring(0, 1)}`)
}


export default {
    checkArgs,
    callWithTimeout,
    callWithRetries,
    pickOnlyDefined,
    substituteText,
    getCaller,
    cleanPath,
    exclusiveUpdate,
    SimpleCache: SimpleCache,
    recursePath,
    WaitList: WaitList
}