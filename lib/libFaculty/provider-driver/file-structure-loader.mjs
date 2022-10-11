/**
 * Copyright 2022 HolyCorn Software
 * This module allows easily verifying and loading files stored in directories according to a named structure
 */


import fs from 'node:fs'
import libPath from 'node:path'
import { Exception } from '../../../errors/backend/exception.js';

/**
 * This allows developers to verify that directories conform to a given structure  or that a single directory conforms to a structure
 * @typedef {[string|DirectoryStructure]} DirectoryStructure
 * @typedef {{[key:string]: LoadedDirectory} & DirectoryNavigator} LoadedDirectory
 */

export class FileStructureLoader {


    /**
     * 
     * @param {object} param0 
     * @param {DirectoryStructure} param0.structure
     * @param {string} param0.path
     */
    constructor({ structure, path }) {
        /** @type {DirectoryStructure} */
        this.structure = structure

        /** @type {string} Where the files will be loaded from */
        this.path = path;


    }

    /**
     * This checks that the directory specified conforms, and then loads it
     * @returns {LoadedDirectory}
     */
    load() {

        const pathSep = libPath.sep

        /**
         * @param {string} path 
         * @param {DirectoryStructure} structure 
         * @returns {Promise<DirectoryStructure>}
         */
        const scan = (path, structure) => {
            //Go through the path, and then check if the files mentioned are found in the path
            //If a folder is found, call the entire process to scan the folder
            let elements = fs.readdirSync(path);

            let example = [
                'red.css',
                'blue.css',
                {
                    name: 'main',

                    files: [
                        'template.html',
                        'logic.js',
                        {
                            name: 'res',
                            files: [
                                'image1.png',
                            ],
                        }
                    ]
                }
            ]

            for (let struct of structure) { //So, for each of the entities in the structure definition, we check that the path complies
                if (typeof struct === 'string') {
                    if (
                        //Checking for the situation whereby either the entity is not found, or the entity is found to be a directory
                        !elements.some(element => {
                            return element === struct && fs.statSync(`${path}${pathSep}${element}`).isFile()
                        })
                    ) {
                        //Then either there's nothing bearing the intended name (as prescribed by structure), or it has been found, but it's not a file
                        throw new Exception(`${struct.yellow} was not found at ${path.yellow}, as intended`, {
                            code: 'error.system.unplanned'
                        })
                    }

                } else {
                    //Second situation, the entity is a folder
                    if (typeof struct.name === 'undefined' || !Array.isArray(struct.files)) {
                        throw new Exception(`Bad structure definition found ${JSON.stringify(struct)}. We either use strings of arrays (representing files) or objects with the 'files' and 'name' property (representing directories). For example: ${JSON.stringify(example)} `, {
                            code: 'error.system.unplanned'
                        })
                    }
                    scan(`${path}${pathSep}${struct.name}`, struct.files)

                }
            }

        }

        scan(this.path, this.structure)
        return new DirectoryNavigator({ path: this.path })

    }

    /**
     * This loads the sub-directories that conform to the structure and returns errors in relation to the directories that don't
     * @returns {{data: {[key:string]: LoadedDirectory}, errors: {[key:string]: Exception}}}
     */
    loadAll() {
        let files = fs.readdirSync(this.path).filter(x => fs.statSync(`${this.path}${libPath.sep}${x}`).isDirectory())
        let returns = {
            data: {},
            errors: {}
        }
        for (let file of files) {
            try {
                returns.data[file] = new FileStructureLoader({ structure: this.structure, path: `${this.path}${libPath.sep}${file}` }).load()
            } catch (e) {
                returns.errors[file] = e
            }
        }
        return returns;
    }

}

const path_symbol = Symbol(`DirectoryNavigator.prototype.path`)


/**
 * This is used with loaded directories in order to access files and directories within it, by using promises
 */
class DirectoryNavigator {

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
     * 
     * @returns {Buffer}
     */
    $data() {
        return fs.readFileSync(this[path_symbol])
    }
    $getPath(){
        return this[path_symbol]
    }

}