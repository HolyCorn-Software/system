/**
 * Copyright 2023 HolyCorn Software
 * The soul System
 * This module (compat-server), provides a special type of file server, that can
 * transpiles javascript files, to support older browsers.
 * It maintains a list of these files, and automatically transpiles them when necessary
 */

import libPath from 'path'
import fs from 'node:fs';
import node_static from 'node-static'
import { BasePlatform } from '../../base/platform.mjs';

const watched = Symbol()

const compatRoot = Symbol()


export default class CompatFileServer {

    /**
     * 
     *
     */
    constructor() {

        this[watched] = []


    }

    /**
     * 
     * @param  {...string} paths A list of paths or files that will be watched, and transpiled
     */
    watch(...paths) {
        for (const path of paths) {

            const fullPath = libPath.resolve(path)

            if (this[watched].findIndex(x => x === fullPath) !== -1) {
                continue;
            }

            if (!fs.existsSync(fullPath)) {
                console.trace(`Warning!\nThe path '${path}', is not working.  `)
            }

            this[watched].push(fullPath)

            if (FacultyPlatform.get() instanceof FacultyPlatform) {
                FacultyPlatform.get().base.channel.remote.compat.transpile(fullPath)
            } else {
                BasePlatform.get().compat.transpile(fullPath)
            }

        }
    }


    /**
     * This variable tells if compatibility mode is on.
     * 
     * That is, should we transpile?
     * @readonly
     * @returns {boolean}
     */
    static get COMPAT_ACTIVE() {
        return (typeof process.env.IGNORE_COMPAT) == 'undefined'
    }

    /**
     * This method transpiles a javascript file, and saves the output to another file
     * This method returns the path to the output file
     * @param {string} path 
     * @returns {Promise<string>}
     */
    async getCompatFile(path) {

        if (!CompatFileServer.COMPAT_ACTIVE) {
            return path
        }
        return await CompatFileServer.getCompatFile(path)

    }


    /**
     * This method returns the path to the file that's supposed to contain the transpiled version of the input file
     * @param {string} path 
     * @returns {Promise<string>}
     */
    static async getCompatFile(path) {

        if (!this.COMPAT_ACTIVE) {
            return path
        }


        this[compatRoot] ||= await (async () => {
            if (FacultyPlatform.get() instanceof FacultyPlatform) {
                return await FacultyPlatform.get().base.channel.remote.compat.getCompatRoot()
            } else {
                return BasePlatform.get().compat.compatRoot
            }
        })()


        const relative = libPath.relative(libPath.resolve('.'), path)
        if (/^\.\./.test(relative)) {
            throw new Error(`The path ${path}, is out of the project's working directory`)
        }
        const fin = `${compatRoot}/${relative}.compat.babel`
        return fin

    }


    /**
     * This method tells us if a file is a javascript file
     * @param {string} filename 
     * @returns {boolean}
     */
    static fileIsJS(filename) {
        const mimeType = node_static.mime.lookup(filename)
        return /javascript/gi.test(mimeType)

    }

}
