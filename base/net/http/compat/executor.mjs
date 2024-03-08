/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module is part of the compat-server/async module. It exists as a separate thread/process
 * to transpile a set of files, for better speed
 */


import fs from 'node:fs'
import recursePath from '../../../../util/recursive-path.mjs'
import babel from '@babel/core'
import libPath from 'node:path'
import worker_threads from "node:worker_threads"
import CompatFileServer from '../../../../http/compat-server/server.mjs'

const compatRoot = worker_threads.workerData.compatRoot
const fileRoot = worker_threads.workerData.fileRoot

/**
 * This method transpiles files in a path, or a single file
 * @param {string} path 
 * @param {string} compatRoot
 * @returns {Promise<void>}
 */
async function transpile(path) {

    await recursePath(path, async (info) => {

        if (!CompatFileServer.fileIsJS(info.path) || info.stat.size === 0) {
            return
        }

        const compatPath = `${compatRoot}/${libPath.relative(fileRoot, info.path)}.compat.babel`


        let isNew = false;
        if (!fs.existsSync(compatPath)) {
            await fs.promises.mkdir(libPath.dirname(compatPath), { recursive: true })
            isNew = true
        }
        if (!isNew && ((await fs.promises.stat(compatPath)).mtimeMs >= info.stat.mtimeMs)) {

            return
        }
        try {
            const data = await babel.transformFileAsync(info.path,
                {
                    minified: true,
                    compact: true,
                    // sourceMaps: true,
                    comments: false,
                    presets: [
                        [
                            '@babel/preset-env',
                            {
                                modules: false,
                                exclude: [
                                    "babel-plugin-transform-async-to-generator",
                                    "babel-plugin-transform-regenerator"
                                ]
                            }
                        ],
                        [
                            "minify",
                            {
                                builtIns: true,
                                evaluate: true,
                                mangle: true,
                            }
                        ],
                    ]
                }
            )
            fs.writeFileSync(compatPath, data.code)

        } catch (e) {
            console.error(`Could not transpile ${info.path.red}\n`, e)
        }


    }, { sequential: true })
}

if ((typeof compatRoot == 'undefined')) {
    throw new Error(`Make sure 'compatRoot', has been passed`)
}

if ((typeof fileRoot == 'undefined')) {
    throw new Error(`Make sure 'fileRoot', has been passed`)
}

worker_threads.parentPort.addListener('message', (path) => {
    transpile(path)
        .then(() => worker_threads.parentPort.postMessage({ success: true, path }))
        .catch((e) => worker_threads.parentPort.postMessage({ error: e, path }))
})