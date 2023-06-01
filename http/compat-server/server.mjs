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
const getParentPath = Symbol()

const systemBootPromise = new Promise(x => setTimeout(x, 7000))

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

            this[watchPathForTranspile](path).then(() => {
                this[watched].push(path)
            }).catch(e => {
                console.error(`Error adding path ${path}\n`, e)
            })
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
        }
        this[watcher].add(path)

        await systemBootPromise

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

            this.transpile(path).catch(e => {
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
        return libPath.normalize(`${this[tmp]}/${libPath.relative(this[getParentPath](path) || process.cwd(), path)}.compat.babel`)
    }


    /**
     * This method gets the parent path of this path, according to the list
     * of directories the CompatFileServer is watching
     * @param {string} path 
     * @returns {string}
     */
    [getParentPath](path) {
        let found;
        for (const item of this[watched]) {
            const relative = libPath.relative(item, path);
            if (!/\.\.\//.test(relative)) {
                found = item;
            }
        }
        return found;
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

        await this.transpile(path)

        const realPath = this[getCompatFilePath](path)

        if ((await fs.promises.stat(realPath)).size == 0) {
            console.warn(`How can ${realPath} be of size zero?\nWhen the content is an array of `, (await fs.promises.readFile(realPath)).length, ` bytes`)
        }
        return realPath
    }




    /**
     * This method transpiles files in a path, or a single file
     * @param {string} path
     * @returns {Promise<void>}
     */
    async transpile(path) {

        if (!CompatFileServer.COMPAT_ACTIVE) {
            return
        }

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



        /**
         * This method transpiles a single file immediately
         * @param {string} path 
         * @param {fs.Stats} fStat 
         * @returns {Promise<void>}
         */
        const transpileOne = async (path, fStat) => {

            fStat ||= await fs.promises.stat(path)

            if (!CompatFileServer.fileIsJS(path) || (fStat.size === 0)) {
                return
            }

            const compatPath = this[getCompatFilePath](path)
            const isNew = await ensureFile(compatPath)



            if ((!isNew) && (await fs.promises.stat(compatPath)).mtimeMs >= fStat.mtimeMs) {
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
            // If something modified the file before us, let's rethink the need to transpile
            await new Promise((resolve, reject) => {
                fs.writeFile(compatPath, data.code, (error, data) => {
                    if (error) {
                        return reject(error)
                    }
                    const check = () => {
                        if ((fs.statSync(compatPath).size > 0)) {
                            clearInterval(interval)
                            resolve()
                            return true
                        }
                    }
                    let interval
                    if (!check()) {
                        interval = setInterval(check, 100)
                    }
                })
            })
            if ((await fs.promises.stat(compatPath)).size === 0) {
                console.log(`We ourselves finished transpiling, and the size was still zero`)
            }
        }



        /**
         * This method transpiles an entire directory
         * @param {string} path 
         * @returns {Promise<void>}
         */
        const dirTranspile = async (path) => {
            await remoteTranspile(path, this[tmp])
        }

        try {
            await (this[transpileTasks][path] = (async () => {
                if (stat.isFile()) {
                    const parentPath = this[getParentPath](path);
                    const parentTranspilePromise = this[transpileTasks][parentPath]


                    if (parentTranspilePromise) {
                        console.log(`Waiting for parent to transpile`)
                        // Let's give the part of the parent task,
                        // involved with transpiling this particular file 5s, or less to complete;
                        // else, we prioritize this single task
                        await Promise.race(
                            [
                                new Promise((resolve, reject) => {
                                    const compatPath = this[getCompatFilePath](path)
                                    let interval
                                    const check = () => {
                                        if (fs.existsSync(compatPath)) {
                                            clearInterval(interval)
                                            resolve()
                                            return true
                                        }
                                    }
                                    if (!check()) {
                                        interval = setInterval(check, 250)
                                    }
                                }),
                                new Promise(x => setTimeout(x, 5_000))
                            ]
                        )

                        console.log(`Done waiting for parent dir transpile`)
                    }
                    await transpileOne(path, stat)
                } else {
                    await dirTranspile(path)
                }
            })());
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
