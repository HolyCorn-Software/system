/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This utility allows us to recursively navigate all files, or files and folders 
 * in a given path
 */

import fs from 'node:fs'
import libPath from 'node:path'

/**
 * @typedef {{path:string, stat: fs.Stats}} PathInfo
 * This method is used to go through all files, subfiles, and folders of a directory, while
 *  calling the callback function for each item
 * @param {string} path 
 * @param {(info: PathInfo, cancel: ()=>void) => Promise<void>} callback A callback
 *  to be made for each of the files. If the cancel() method is called, the loop will break
 * @param {object} param1
 * @param {boolean} param1.includeDirs
 * @param {boolean} param1.sequential By default, this true. ```sequential``` determines if
 * one item should be processed at a time, or all at once
 * @returns {Promise<void>}
 */
export default async function recursePath(path, callback, { includeDirs, sequential = true } = {}) {
    const stat = await fs.promises.stat(path)

    let end = false;

    if (stat.isDirectory() && includeDirs) {
        await callback({ path, stat }, () => end = true)
    }

    if (!stat.isDirectory()) {
        await callback({ path, stat }, () => end = true)
        return end
    }

    for (const subpath of await fs.promises.readdir(path)) {

        const promise = recursePath(`${path}${libPath.sep}${subpath}`, async (path, cancel) => {
            await callback(path, cancel)
        }, { includeDirs, sequential })


        if (sequential && (await promise)) {
            end = true
            break;
        }

    }

    return end
}
