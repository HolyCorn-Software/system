/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (version-reporter), is part of the bundle-cache module, and runs in 
 * faculties, and other, "subordinate", areas, and responsible for updating the
 * server on current versions of urls, according to versions of files
 */

import chokidar from 'chokidar'
import libPath from 'node:path'
import BundleCacheServer from '../server/server.mjs'

const watcher = Symbol()
const paths = Symbol()
const addURLToServer = Symbol()
const removeURLFromServer = Symbol()
const getURLPaths = Symbol()
const hooks = Symbol()
const configureWatcher = Symbol()

const bootPromise = new Promise(done => setTimeout(done, 2_000))

export default class VersionReporter {


    /**
     * 
     * @param {soul.http.bundlecache.VersionReporterHooks} _hooks 
     * @param {chokidar.FSWatcher} _watcher If set, the system will just directly use it,
     * instead of instantiating a new watcher
     */
    constructor(_hooks, _watcher) {

        /** @type {[url: string]: string} */
        this[paths] = {}

        this[hooks] = _hooks
        if (_watcher) {
            this[watcher] = _watcher
            this[configureWatcher]()
        }

    }

    /**
     * This method watches a generalized url, and file paths, or particular ones.
     * This means, when a file in that path, or when the file itself changes,
     * the server will be informed of the new version
     * @param {string} urlPath 
     * @param {string} dirPath 
     * @returns {void}
     */
    watch(urlPath, dirPath) {
        if (!this[watcher]) {
            this[watcher] = chokidar.watch(dirPath)

            this[configureWatcher]()

        } else {
            this[watcher].add(dirPath)
        }
        this[paths][urlPath] = dirPath
    }


    [configureWatcher]() {

        /**
         * This method is called when a new file is added to our watch, or it changes
         * This method is invoke for each an every file, not just the one being added
         * @param {"change"|"add"} action
         * @param {string} path 
         * @param {import('node:fs').Stats} stat 
         */
        const updateFxn = async (action, path, stat) => {
            // By rule, we only keep information about files 64KB or less
            if (stat.isFile() && stat.size <= BundleCacheServer.MAX_RESOURCE_SIZE && BundleCacheServer.isUIFile(path)) {
                // A new file has been placed under our watch
                // Let's make sure this path exists in the server
                try {
                    for (const urlPath of this[getURLPaths](path)) {
                        await bootPromise
                        if (action === 'add') {
                            this[addURLToServer](urlPath)
                        } else {
                            this[hooks].updateVersion(urlPath)
                        }
                    }
                } catch (e) {
                    console.error(`How could this be?\n`, e)
                }

            }
        }

        this[watcher].addListener('add', updateFxn.bind(undefined, 'add'))
        this[watcher].addListener('change', updateFxn.bind(undefined, 'change'))


        this[watcher].addListener('unlink',
            /**
             * This method is called when a file under our watch was removed
             * @param {string} path
             * @param {import('node:fs').Stats} stat
             */
            (path, stat) => {
                if (!stat || stat.isFile()) {
                    // A new file has been placed under our watch
                    // Let's make sure this path exists in the server
                    try {
                        for (const urlPath of this[getURLPaths](path)) {
                            this[removeURLFromServer](urlPath)
                        }
                    } catch (e) {
                        console.error(`How could this be?\n`, e)
                    }

                }
            }
        )
    }

    /**
     * This method gets the URLs associated with file being watched, according to map
     * @param {string} path 
     * @returns {string[]}
     */
    [getURLPaths](path) {
        const urls = []
        for (const urlPath in this[paths]) {
            const relative = libPath.relative(this[paths][urlPath], path);
            if (!/\.\.\//.test(relative)) {
                urls.push(...getAssociatedURLs(libPath.normalize(`${urlPath}/${relative}`)))
            }
        }
        if (urls.length === 0) {
            throw new Error(`Could not determine the URL path of ${path}, because it is not being watched.`)
        }
        return urls
    }

    /**
     * This method is used to add a URL to a server's watch list
     * @param {string} url 
     * @returns {void}
     */
    async [addURLToServer](url) {
        await bootPromise
        for (const assoc of getAssociatedURLs(url)) {
            this[hooks].addURL(assoc)
        }

    }

    /**
     * This method is used to remove a URL from a server's watch list
     * @param {string} url 
     * @returns {void}
     */
    async [removeURLFromServer](url) {
        await bootPromise
        for (const assoc of getAssociatedURLs(url)) {
            this[hooks].removeURL(assoc)
        }

    }

}

function getAssociatedURLs(url) {
    const urls = [url]

    if (url.endsWith('index.html')) {
        urls.push(libPath.normalize(libPath.dirname(url) + '/'))
    }

    return urls
}