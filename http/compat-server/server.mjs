/**
 * Copyright 2023 HolyCorn Software
 * The soul System
 * This module (compat-server), provides a special type of file server, that can
 * transpiles javascript files, to support older browsers.
 * It maintains a list of these files, and automatically transpiles them when necessary
 */

import libPath from 'path'
import fs from 'node:fs';
import babel from '@babel/core'
import os from 'node:os'
import shortUUID from "short-uuid";
import chokidar from 'chokidar'
import node_static from 'node-static'
import remoteTranspile from './async/local.mjs';

const tmp = Symbol()
const watcher = Symbol()
const getCompatFilePath = Symbol()
const watchPathForTranspile = Symbol()
const transpileTasks = Symbol()
const watched = Symbol()

export default class CompatFileServer {

    /**
     * 
     *
     */
    constructor() {


        /** This points the file location, where transpiled files will be kept */
        this[tmp] = `${os.tmpdir()}/${shortUUID.generate()}`
        fs.mkdirSync(this[tmp]);

        //Then, cleanup after the program is done
        process.addListener('SIGTERM', () => {
            fs.rmSync(this[tmp], { recursive: true, force: true })
        })

        this[transpileTasks] = {}
        this[watched] = []

    }

    /**
     * 
     * @param  {...string} paths A list of paths or files that will be watched, and transpiled
     */
    watch(...paths) {
        for (const path of paths) {

            if (this[watched].findIndex(x => x === path) !== -1) {
                continue;
            }

            if (!fs.existsSync(path)) {
                console.trace(`Warning!\nThe path '${path}', is not working.  `)
            }

            this[watchPathForTranspile](path).catch(e => {
                console.error(`Error adding path ${path}\n`, e)
            })
            this[watched].push(path)
        }
    }

    /**
     * This method 
     * @param {string} path 
     * @returns {Promise<void>}
     */
    async [watchPathForTranspile](path) {


        // Now, we watch for changes to files, and transpile them as well

        /** @type {chokidar.FSWatcher} */
        if (!this[watcher]) {
            this[watcher] = chokidar.watch(path);
        } else {
            this[watcher].add(path)
        }


        // Transpile the current files we have in the path
        await this.transpile(path)
        const transpileEnd = Date.now()


        /**
         * This method transpiles a new, or changed file
         * @param {string} path 
         * @param {fs.Stats} stat 
         */
        const transpile = (path, stat) => {
            if (!stat.isFile() || !CompatFileServer.fileIsJS(path) || stat.mtimeMs < transpileEnd) {
                return
            }

            this.transpile(path, true).catch(e => {
                console.error(`The file ${path} changed, but could not be transpiled\n`, e);
            })
        }

        /**
         * This method is called when a file is deleted. We also remove the associated
         * compat file
         * @param {string} path 
         * @param {fs.Stats} stat 
         */
        const doDelete = (path, stat) => {
            if (!stat.isFile()) return;
            fs.promises.rm(path, { force: true }).catch(e => {
                console.error(`The file ${path} was removed\nBut the compat file `
                    + `could not be removed `,
                    e
                )
            })
        }

        this[watcher].addListener('add', transpile)
        this[watcher].addListener('change', transpile)
        this[watcher].addListener('unlink', doDelete)
    }

    /**
     * This method returns the path the associated babel compat js file
     * @param {string} path 
     * @returns {string}
     */
    [getCompatFilePath](path) {

        let found;
        for (const item of this[watched]) {
            const relative = libPath.relative(item, path);
            if (!/\.\.\//.test(relative)) {
                found = item
            }
        }
        return libPath.normalize(`${this[tmp]}/${libPath.relative(found || process.cwd(), path)}.compat.babel`)
    }


    /**
     * This method transpiles a javascript file, and saves the output to another file
     * This method returns the path to the output file
     * @param {string} path 
     * @returns {Promise<string>}
     */
    async getCompatFile(path) {
        await this.transpile(path)

        const realPath = this[getCompatFilePath](path)

        if (fs.statSync(realPath).size == 0) {
            console.log(`How can ${realPath} be of size zero?`)
        }
        return realPath
    }




    /**
     * This method transpiles files in a path, or a single file
     * @param {string} path 
     * @param {boolean} force If true, the transpiling will happen, even if it alread did
     * @returns {Promise<void>}
     */
    async transpile(path, force) {

        if (!fs.existsSync(path)) {
            return console.log(`The path to be transpiled ${path}, doesn't exist`)
        }

        const stat = await fs.promises.stat(path)


        /**
         * This method creates a file if it doesn't exists.
         * It returns true if the file was newly created
         * @param {string} path
         * @returns {Promise<boolean>}
         */
        const ensureFile = async (path) => {
            if (!fs.existsSync(path)) {
                await fs.promises.mkdir(libPath.dirname(path), { recursive: true })
                return true
            }
        }



        const transpileOne = async (path, fStat) => {

            if (!CompatFileServer.fileIsJS(path)) {
                return
            }

            const compatPath = this[getCompatFilePath](path)
            const isNew = await ensureFile(compatPath)
            fStat ||= fs.promises.stat(path)



            if (!isNew && (await fs.promises.stat(compatPath)).mtimeMs > fStat.mtimeMs) {
                return
            }

            const data = await babel.transformFileAsync(path,
                {
                    presets: [
                        [
                            '@babel/preset-env',
                            { modules: false }
                        ]
                    ]
                }
            )
            await fs.promises.writeFile(compatPath, data.code)
        }



        const dirTranspile = async () => {
            await remoteTranspile(path, this[tmp])
        }

        try {
            await (this[transpileTasks][path] = stat.isFile() ? transpileOne(path, stat) : dirTranspile())
            delete this[transpileTasks][path]
        } catch (e) {
            delete this[transpileTasks][path]
            throw e
        }


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
