/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module is part of the compat-server module, and allows for the transpiling
 * process to be performed in a separate process
 */


import child_process from 'node:child_process'
import libUrl from 'node:url'

/** @type {Set<{path:string, stack: string, promise:Promise<void>}>} */
const list = new Set()

const MAX_TASKS = 1


export default async function remoteTranspile(path, compatRoot) {

    if (list.has(path)) {
        return
    }

    // And now, since transpiling is a CPU-intensive task, let's limit the number of transpiling tasks

    if (list.size >= MAX_TASKS) {
        await new Promise(resolve => {
            list.forEach(it => {
                it.promise.finally(() => {
                    setTimeout(() => {
                        if (list.size < MAX_TASKS) {
                            resolve()
                        }
                    }, Math.random() * 100)
                })
            })
        });
    }

    const entry = {
        path,
        stack: new Error().stack,
        promise: new Promise((resolve, reject) => {
            const executorModulePath = libUrl.fileURLToPath(new URL('./executor.mjs', import.meta.url).href)
            child_process.exec(`node ${executorModulePath}`, { env: { srcPath: path, compatRoot } }, (error, output) => {
                if (error) {
                    reject(error)
                } else {
                    resolve()
                }
            })
        })
    }


    list.add(entry)

    entry.promise.finally(() => {
        list.delete(path)
    })

    return await entry.promise
}