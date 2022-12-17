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
export default class DirectoryNavigator {

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
                    return new DirectoryNavigator({ path: newPath })
                }
            }
        })

    }

    /**
     * This field returns the content of the file
     * @returns {Buffer}
     */
    get $fileContent() {
        return fs.readFileSync(this[path_symbol])
    }
    get $path() {
        return this[path_symbol]
    }

}