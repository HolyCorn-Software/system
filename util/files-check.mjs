/**
 * Copyright 2022 HolyCorn Software
 * This module allows components to check if a path follows a given stucture
 */


import fs from 'node:fs'
import libPath from 'node:path'
import nodeUtil from 'node:util'
import DirectoryNavigator from './directory-navigator.mjs';


/**
 * This allows developers to verify that directories conform to a given structure  or that a single directory conforms to a structure
 * @typedef {{[key:string]: LoadedDirectory} & DirectoryNavigator} LoadedDirectory
 */

export default class FilesCheck {


    /**
     * 
     * @param {object} param0 
     * @param {DirectoryDefinition} param0.structure
     * @param {string} param0.path
     */
    constructor({ structure, path }) {
        /** @type {DirectoryDefinition} */
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
         * @param {DirectoryDefinition} structure 
         * @returns {Promise<void>}
         */
        const scan = (path, structure) => {
            //Go through the path, and then check if the files mentioned are found in the path
            //If a folder is found, call the entire process to scan the folde

            let example = {
                'red.css': true,
                'blue.css': true,
                'emptyFolder': {

                },

                'someFolder': {
                    'template.html': true,

                    'logic.js': true,
                    'res': {
                        'image1.png': true,
                    }
                }
            }

            if (typeof structure === 'boolean') {
                if (!fs.existsSync(path)) {
                    throw new Error(`The file ${field} doesn't exist.`)
                }
                return;
            }

            if (Array.isArray(structure)) {
                for (let file of structure) {
                    scan(path, file)
                }
                return;
            }

            if (typeof structure === 'string') {
                const subjectPath = `${path}${libPath.sep}${structure}`;
                if (!fs.existsSync(subjectPath)) {
                    throw new Error(`The file ${structure} doesn't exists.`)
                }
                return
            }



            if (typeof structure === 'object') {


                for (const field in structure) { //So, for each of the entities in the structure definition, we check that the path complies
                    const nextPath = `${path}${libPath.sep}${field}`;

                    if (typeof structure[field] === 'object') {
                        if (!fs.existsSync(nextPath)) {
                            throw new Error(`The folder ${field} doesn't exists.`)
                        }
                    }
                    scan(nextPath, structure[field])
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
    recursiveLoad() {
        let files = fs.readdirSync(this.path).filter(x => fs.statSync(`${this.path}${libPath.sep}${x}`).isDirectory())
        let returns = {
            data: {},
            errors: {}
        }
        for (let file of files) {
            try {
                returns.data[file] = new FilesCheck({ structure: this.structure, path: `${this.path}${libPath.sep}${file}` }).load()
            } catch (e) {
                returns.errors[file] = e
            }
        }
        return returns;
    }

}
