/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module is part of the compat-server module, and allows for the transpiling
 * process to be performed in a separate process
 */


import child_process from 'node:child_process'
import libUrl from 'node:url'

const list = []


export default function remoteTranspile(path, compatRoot) {
    const existing = list.findIndex(x => x.path === path)
    if (existing !== -1) {
        return //console.log(`Not double transpiling ${path}\nby caller\n${new Error().stack}\nBecause originally it came from\n${list[existing].stack}`)
    }
    list.push({ path, stack: new Error().stack })
    return new Promise((resolve, reject) => {
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