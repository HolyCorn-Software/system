/**
 * Copyright 2023 HolyCorn Software
 * The soul System
 * This module, allows us to transpile app frontend code, in a general, and cheaper way
 */

import WaitList from "../../../../util/wait-list.mjs";
import worker_threads from 'node:worker_threads'
import libFs from 'node:fs'
import libOs from 'node:os'
import libPath from 'node:path'
import shortUUID from "short-uuid";
import { BasePlatform } from "../../../platform.mjs";
import libUrl from 'node:url'
import CompatFileServer from "../../../../http/compat-server/server.mjs";




const list = Symbol()
const current = Symbol()
const loop = Symbol()
const isLooping = Symbol()
const worker = Symbol()
const compatRoot = Symbol()
const workerCleanTimeout = Symbol()

export default class BaseCompatServer {

    constructor() {

        this[list] = new WaitList()
        /** @type {{path:string, promise:Promise<void>}} The path we are currently transpiling */
        this[current];

    }

    /**
     * This method returns a promise that resolves, when all paths have been transpiled
     */
    async allDone() {
        return CompatFileServer.COMPAT_ACTIVE && await this[list].zeroWait()
    }

    async getCompatRoot() {
        return this.compatRoot
    }


    get compatRoot() {
        if (this[compatRoot]) {
            return this[compatRoot]
        }
        this[compatRoot] = `${libOs.tmpdir()}/${shortUUID.generate()}${shortUUID.generate()}`
        libFs.mkdirSync(this[compatRoot])
        const destroy = () => {
            this[worker]?.terminate().finally(() => {
                libFs.rmSync(this[compatRoot], { recursive: true, force: true })
            })
        }
        process.addListener('SIGINT', destroy)
        process.addListener('SIGTERM', destroy)
        setTimeout(() => console.log(`compat root is ${this[compatRoot].yellow}`), 5000)
        return this[compatRoot]
    }

    /**
     * This method returns the path where the compat file(s) of a given path will be kept
     * @param {string} path 
     * @returns {string}
     */
    getCompatFilePath(path) {
        const relative = libPath.relative(libPath.resolve('.'), path)
        if (/^\.\./.test(relative)) {
            throw new Error(`The path ${path}, should not be transpiled, because it is out of the project's working directory`)
        }
        return `${this.compatRoot}/${relative}.compat.babel`
    }

    /**
     * This function is called, to transpile the oldest item in the list of paths
     */
    async [loop]() {

        if (!CompatFileServer.COMPAT_ACTIVE) {
            return;
        }

        if (this[isLooping]) {
            return;
        }

        clearTimeout(this[workerCleanTimeout])

        if (this[list].entries().length === 0) {
            this[workerCleanTimeout] = setTimeout(() => {
                this[worker]?.terminate()
                delete this[worker]
            }, 2_000)
            return;
        }

        if (!this[worker]) {
            const executorModulePath = libUrl.fileURLToPath(new URL('./executor.mjs', import.meta.url).href)
            this[worker] = new worker_threads.Worker(executorModulePath, { workerData: { compatRoot: this.compatRoot, fileRoot: libPath.resolve('.') } })
        }

        this[isLooping] = true


        let resolve, reject;

        const promise = (this[current] = {

            promise: new Promise((res, rej) => {
                resolve = res;
                reject = rej
            }),
            path: this[list].entries().shift()
        }).promise

        const path = this[current].path

        BasePlatform.get().bootTasks.add(path)



        const onMessage = (msg) => {
            if (msg.path !== path) {
                return;
            }
            if (msg.error) {
                reject(msg.error)
            } else {
                resolve()
            }
            this[worker].removeListener('message', onMessage)
        };


        this[worker].addListener('message', onMessage)

        this[worker].postMessage(path)

        try {
            await promise
        } catch { }

        this[isLooping] = false
        this[list].remove(path)
        BasePlatform.get().bootTasks.remove(path)

        this[loop]()

    }


    /**
     * This method adds a path to the list of transpiler tasks, and returns a promise,
     * that resolves, or rejects, depending on the success of the task
     * @param {string} path 
     * @param {boolean} wait This tells us, if we should wait for the transpiling to complete before returning
     * @returns {Promise<void>|undefined}
     */
    async transpile(path, wait) {
        if (!CompatFileServer.COMPAT_ACTIVE) {
            return;
        }
        let pathStats;
        if (libFs.existsSync(path) && (pathStats = await libFs.promises.stat(path)).isFile()) {
            if (((await libFs.promises.stat(`${this.getCompatFilePath(path)}`)).mtimeMs >= pathStats.mtimeMs)) {
                return console.log(`No need to transpile ${path}`);
            }
        }

        this[list].add(path)

        this[loop]()

        if (wait) {
            await new Promise((resolve, reject) => {
                const check = () => {
                    if (this[current].path = path) {
                        this[current].promise.then(resolve, reject)
                        this[worker].removeListener('message', check)
                    }
                };
                this[worker].addListener('message', check)
            })
        }
    }

}