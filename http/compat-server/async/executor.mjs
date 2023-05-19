/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module is part of the compat-server/async module. It exists as a separate process
 * to transpile a set of files, for better speed
 */


import fs from 'node:fs'
import recursePath from '../../../util/recursive-path.mjs'
import babel from '@babel/core'
import libPath from 'node:path'
import CompatFileServer from '../server.mjs'

/**
 * This method transpiles files in a path, or a single file
 * @param {string} path 
 * @param {string} compatRoot
 * @returns {Promise<void>}
 */
async function transpile(path, compatRoot) {

    await recursePath(path, async (info) => {

        if (!CompatFileServer.fileIsJS(info.path) || info.stat.size === 0) {
            return
        }

        const compatPath = `${compatRoot}/${libPath.relative(path, info.path)}.compat.babel`


        let isNew = false;
        if (!fs.existsSync(compatPath)) {
            await fs.promises.mkdir(libPath.dirname(compatPath), { recursive: true })
            isNew = true
        }
        if (!isNew && ((await fs.promises.stat(compatPath)).mtimeMs >= info.stat.mtimeMs)) {
            return
        }
        const data = await babel.transformFileAsync(info.path,
            {
                presets: [
                    [
                        '@babel/preset-env',
                        { modules: false }
                    ]
                ]
            }
        )
        fs.writeFileSync(compatPath, data.code)

    }, { sequential: false })
}

if ((typeof process.env.srcPath == 'undefined') || (typeof process.env.compatRoot == 'undefined')) {
    throw new Error(`Make sure 'srcPath', and 'compatRoot', are passed`)
}

await transpile(process.env.srcPath, process.env.compatRoot)

console.log(`Done transpiling ${process.env.srcPath} entirely`)