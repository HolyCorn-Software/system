/**
 * Copyright 2022 HolyCorn Software
 * This module allows navigation of files, and folders in a simple way
 */





import fs from 'node:fs'
import libPath from 'node:path'


const path_symbol = Symbol(`DirectoryNavigator.prototype.path`)


/**
 * This is used with loaded directories in order to access files and directories within it, by using promises
 */
export default class ______DirectoryNavigator_____ {

    /**
     * 
     * @param {object} param0 
     * @param {string} param0.path
     */
    constructor({ path }) {

        const sep = libPath.sep

        /** @type {string} */
        this[path_symbol] = path;

        return new Proxy(this, {
            get: (target, property, receiver) => {
                if (property in target) {
                    //Very straightforward when reading a 
                    return Reflect.get(target, property, receiver)
                } else {
                    //If the caller is reading a directory, then it's also straightforward
                    let newPath = `${path}${sep}${property}`;
                    if (!fs.existsSync(newPath)) {
                        throw new Exception(`The path ${newPath.yellow} doesn't exist`, {
                            code: 'error.system.unplanned',
                            flags: {
                                stackIndex: 1
                            }
                        })
                    }
                    return new ______DirectoryNavigator_____({ path: newPath })
                }
            }
        })

    }

    /**
     * This field returns the content of the file
     * @deprecated Use $.fileContent
     * @returns {Buffer}
     */
    get $fileContent() {
        return fs.readFileSync(this[path_symbol])
    }

    /**
     * @deprecated Use $.path
     */
    get $path() {
        return this[path_symbol]
    }

    get $() {
        const ret = {
            fileContent: '',
            path: this[path_symbol],

            /**
             * This method tells us if a path is within this current path
             * @param {string} path 
             * @returns {boolean}
             */
            exists: (path) => fs.existsSync(`${this[path_symbol]}${libPath.sep}${path}`)
        }

        Reflect.defineProperty(ret, 'fileContent', {
            get: () => fs.readFileSync(this[path_symbol]),
            configurable: true,
            enumerable: true
        })

        return ret
    }

}