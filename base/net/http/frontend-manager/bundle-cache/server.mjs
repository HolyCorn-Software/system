/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (server), is part of the bundle-cache module, and responsible 
 * for directly accepting HTTP requests, maintaining the map, 
 * and responding with cache bundles
 * 
 */

import libUrl from 'node:url'
import libFs from 'node:fs'
import libPath from 'node:path'
import shortUUID from "short-uuid"
import archiver from 'archiver'
import unzipper from "unzipper"
import { SuperResponse } from "../../../../../lib/nodeHC/http/super-response.js"
import FileCache from "../../../../../http/file-cache/cache.mjs"
import { SuperRequest } from "../../../../../lib/nodeHC/http/super-request.js"
import { BasePlatform } from "../../../../platform.mjs"
import chokidar from 'chokidar'
import CompatFileServer from '../../../../../http/compat-server/server.mjs'


const injectionData = Symbol()

const watcher = Symbol()
const bundlesPath = Symbol()
const publicPath = libUrl.fileURLToPath(new URL('./public/', import.meta.url).href)
const bundlingTasks = Symbol()
const filecache = Symbol()
const setupInjection = Symbol()


export default class BundleCacheServer {

    /**
     * 
     * @param {HTTPServer} httpServer
     */
    constructor() {

        /** @type {[url: string]: Promise<void>} */
        this[bundlingTasks] = {}

    }

    get domains() {
        const domains = BasePlatform.get().server_domains
        return [domains.secure, domains.plaintext]
    }

    get fileManager() {
        return BasePlatform.get().frontendManager.fileManager
    }
    get autorunManager() {
        return BasePlatform.get().frontendManager.autorun
    }
    getRelated(urlPath) {
        return this.fileManager.getRelated(urlPath).filter(x => (x.size || 0) <= BundleCacheServer.MAX_RESOURCE_SIZE)
    }

    /**
     * This method prepares the code that will be injected into HTML pages,
     * to allow for caching at the client side; and make provisions for updating the code
     * @returns {Promise<void>}
     */
    async [setupInjection]() {

        const loaderPath = `${publicPath}/loader.mjs`


        await libFs.promises.mkdir(
            this[bundlesPath] = `/tmp/${shortUUID.generate()}${shortUUID.generate()}`
        );

        process.addListener('SIGINT', () => {
            libFs.rmSync(this[bundlesPath], { force: true, recursive: true })
        });


        (this[watcher] ||= chokidar.watch(loaderPath)).on('change', () => {
            delete this[injectionData]
        })


    }

    async getInjectionData() {
        if (!this[injectionData]) {
            let path;
            if (CompatFileServer.COMPAT_ACTIVE) {
                await BasePlatform.get().compat.transpile(`${publicPath}/loader.mjs`, true)
                path = await BasePlatform.get().compat.getCompatFilePath(`${publicPath}/loader.mjs`, true)
            } else {
                path = `${publicPath}/loader.mjs`
            }
            this[injectionData] = `<!DOCTYPE html>\n<link rel="icon" href="/$/shared/static/logo.png">\n\n<script type='module'>${(await libFs.promises.readFile(path)).toString()}\n</script>`
        }
        return this[injectionData]
    }

    /**
     * This method sets up the BundleCache, for intercepting requests, to
     * be subsequently used in building maps, and responding with bundles
     */
    setup() {

        /** @type {FileCache} */
        this[filecache] = new FileCache(
            {
                watcher: this[watcher],
            }
        );

        this[setupInjection]()

        BasePlatform.get().http_manager.platform_http.addMiddleWare(
            {
                callback: async (req, res) => {

                    const url = `${req.url}`

                    if (req.headers['x-bundle-cache-ignore']) {
                        return false

                    }


                    // Here, first things first, if the request is pointing
                    // to a publicly needed resource
                    if (await this.grandServe(req, res)) {
                        return true
                    }

                    if (this.versionServe(req, res)) {
                        return true
                    }

                    if (await this.publicServe(req, res)) {
                        return true
                    }




                    // At this point, we are checking to see if the data being passed
                    // is HTML, and then injecting our service worker

                    const origWrite = res.write

                    let intercepted = false

                    const injectedData = await this.getInjectionData() || '<!-- No data -->\n'

                    res.write = (...args) => {

                        // Making sure we intercept only the first call to write()
                        if (intercepted) {
                            // If this is not the first write call,
                            // let's make all javascript inactive, so that the service
                            // worker can make it active

                            origWrite.call(
                                res,
                                /html/gi.test(res.getHeader('content-type')) ? Buffer.from(args[0]).toString().replaceAll(/(<script[^>]*)src/gi, `$1srd`) : args[0],
                                ...args.slice(1)
                            )
                            return;
                        }

                        intercepted = true


                        // If this is the first write call, let's inject the 
                        // service worker script

                        const intercept = /html/gi.test(res.getHeader('content-type'))

                        if (intercept) {
                            res.setHeader(
                                'Content-Length',
                                `${new Number(res.getHeader('content-length')) + injectedData.length}`
                            )
                            res.write(injectedData)

                            res.write(...args)

                        } else {
                            res.write(...args)
                        }


                    }

                    // And now, at this point, 
                    // we are simply checking, if the request originates
                    // from another request, so as to build our request
                    // Now, we'll build the map quite alright.
                    // But to limit the map to a page-by-page basis, instead
                    // of having a map of how each and every request is related,
                    // we shall prevent linking of one html, to another

                    // Let's wait for the request to end, so we can begin our processing
                    // Oly then can we know, if the size, and type of the resource
                    res.addListener('close', async () => {

                        // Now, let's keep aside cross origin referrers
                        try {
                            const size = res.getHeader('content-length') || 0
                            const src = req.headers['x-bundle-cache-src'] || req.headers['referer']
                            if (
                                size === 0
                                || size > BundleCacheServer.MAX_RESOURCE_SIZE
                                || !src
                                || req.method?.toLowerCase() !== 'get'
                            ) {
                                return;
                            }

                            const refURL = new URL(src)

                            if ((this.domains || []).findIndex(x => x == refURL.host) === -1) {
                                // We need not bother about this request, if it came
                                // from a foreign domain
                                return;
                            }

                            // If the referrer is HTML
                            const refisHTML = refURL.pathname.endsWith('/') || refURL.pathname.endsWith('html')
                            // And now, we need not keep track of
                            // which page (html), referred which other page


                            if (
                                !refisHTML // If the referer is not HTML
                                || //or
                                (
                                    // Both are HTML
                                    refisHTML
                                    && /html/gi.test(res.getHeader('content-type'))
                                )
                            ) {
                                // Then we have no business with them
                                return;
                            }



                            // Let's remember, that the given request, 
                            // is associated to it's referrer
                            if (url.indexOf("bundle-cache-ignore") == -1) {
                                this.fileManager.link(refURL.pathname, [url])
                            } else {
                                console.log(`Ignoring linking of URL `, url)
                            }
                        } catch (e) {
                            console.error(`Could not process request map because: \n`, e)
                        }
                    })

                }
            }
        )
    }

    /**
     * This method serves the client, if he's requesting for version information
     * @param {import('http').IncomingMessage} req 
     * @param {SuperResponse} res 
     * @returns {boolean}
     */
    versionServe(req, res) {
        const grandRegExp = /^\/\$\/system\/frontend-manager\/bundle-cache\/getGrandVersion$/
        if (grandRegExp.test(req.url)) {
            const path = req.headers['x-bundle-cache-path']
            if (!path) {
                res.statusCode = 400
                res.end('Bad request')
            } else {
                res.endJSON({ version: this.fileManager.getGrandVersion(path) })
            }
            return true
        }
    }

    /**
     * This method is used to intercept requests that have to do with serving files
     * from the public directory
     * @param {import('http').IncomingMessage} req 
     * @param {import('http').ServerResponse} res 
     * @returns {boolean}
     */
    async publicServe(req, res) {

        const publicRegexp = /\$\/system\/frontend-manager\/bundle-cache\/public/
        if (publicRegexp.test(req.url)) {
            const filePath = libPath.normalize(`${publicPath}/${req.url.replace(publicRegexp, '/')}`)

            if (!filePath.startsWith(publicPath)) {
                // Fraud (Trying to access a file out of context)
                return false
            }
            if (!libFs.existsSync(filePath)) {
                res.statusCode = 404
                res.end(`NOT FOUND`)
                return true
            }
            res.setHeader('Service-Worker-Allowed', '/');
            await HTTPServer.serveFile(filePath, res, filePath, this[filecache])
            return true

        }
    }

    /**
     * This method determines if a particular resource is an HTML page
     * @param {string} url 
     * @returns {boolean}
     */
    static isHTML(url) {
        return url.endsWith('/') || url.endsWith('html')
    }

    /**
     * This method handles situations where the client is requesting for a bundle
     * @param {SuperRequest} req 
     * @param {import('node:http').ServerResponse} res 
     * @returns {boolean}
     */
    async grandServe(req, res) {


        const bundleRegexp = /\/\$\/system\/frontend-manager\/bundle-cache\/grand/


        /**
         * This is the heart of the grandServe() method.
         * It compiles several requests into one, and makes a zip out of
         * all the data in them
         * @returns {Promise<void>}
         */
        const grand = async () => {
            const urlPath = req.headers['x-bundle-cache-path']
            if (!urlPath) {
                res.statusCode = 500
                res.end('Bad request!')
                return;
            }
            const related = this.getRelated(urlPath)

            const pathRoot = libPath.normalize(`${this[bundlesPath]}/${urlPath}`)
            const bundlePath = `${pathRoot}.related.zip`
            const otherPaths = req.headers['x-bundle-cache-other-paths']
            let specialExclude = {
                bundlePath: '',
                /** @type {ReturnType<this['fileManager']['getRelated']>[number][]} */
                urlPaths: []
            }

            const exclShouldIncludeURL = (_url) => {
                let url = toSafeZipPath(_url)
                const res = (specialExclude.urlPaths.length > 0) && (specialExclude.urlPaths.findIndex(x => {
                    const res = toSafeZipPath(x.url) == url
                    return res
                }) == -1)
                return res
            }

            // And now, let's give the user a special privilege of excluding certain files from the bundle
            if (otherPaths) {
                try {
                    const others = JSON.parse(Buffer.from(otherPaths, 'base64'))
                    for (const item in others) {
                        specialExclude.urlPaths.push(
                            ...this.fileManager.getRelated(item).filter(uItem => {
                                // uItem, is a URL, that's related to the grand path item.
                                // We can only include uItem in the ignore list, if it's less updated than item
                                return uItem.version.emperical < others[item]
                            })
                        )

                    }
                    specialExclude.bundlePath = `${pathRoot}.exc.${shortUUID.generate().substring(0, 5)}.zip`
                } catch (e) {
                    console.warn(`Error preventing exclusion of certain paths, from bundle\n`, e, `\nHeader: `, otherPaths)
                }
            }

            const specialZipStream = specialExclude.urlPaths.length > 0 ? archiver.create('zip', { store: true }) : undefined
            const specialFileStream = specialZipStream ? libFs.createWriteStream(specialExclude.bundlePath) : undefined
            specialFileStream ? specialZipStream.pipe(specialFileStream) : undefined


            await libFs.promises.mkdir(libPath.dirname(bundlePath), { recursive: true })
            const grandVersion = this.fileManager.getGrandVersion(urlPath)

            const fileExists = libFs.existsSync(bundlePath)

            const toSafeZipPath = path => !path ? path : `${path.startsWith('/') ? "" : '/'}${path.endsWith('/') ? `${path}.index` : path}`

            /**
             * This method file data, about a frontend resource entry
             * @param {ReturnType<this['getRelated']>[0]} entry 
             * @returns 
             */
            const getData = async (entry) => Buffer.concat(
                [
                    Buffer.from(BundleCacheServer.isHTML(entry.path) ? `${this.autorunManager.injection}\n${await this.getInjectionData()}` : ''),

                    await Promise.race(
                        [
                            (async () => {
                                return await libFs.promises.readFile(
                                    await CompatFileServer.getCompatFile(entry.path)
                                )
                            })(),

                            new Promise((_, reject) => {
                                setTimeout(() => {
                                    reject(new Error(`The url ${entry.url} too too long to fetch`))
                                }, 5000)
                            })
                        ]
                    )
                ]
            )


            const makeNew = () => {

                const zipStream = archiver.create('zip', { store: true })
                const fileStream = this[filecache].writeAsStream(bundlePath)
                zipStream.pipe(fileStream)

                return Promise.all(
                    related.map(
                        async entry => {
                            try {

                                if (!libFs.existsSync(entry.path)) {
                                    this.fileManager.removeURL(entry.url)
                                    return console.log(`Not caching ${entry.url.blue} (${entry.path?.cyan})\nFile was removed.`)
                                }

                                const results = await getData(entry)
                                const safeURL = toSafeZipPath(entry.url)

                                const promises = []

                                /**
                                 * 
                                 * @param {archiver.Archiver} archive 
                                 */
                                function zipAppend1(archive) {
                                    return zipAppend(archive, results, safeURL, entry.version?.emperical || -1)
                                }


                                promises.push(zipAppend1(zipStream))

                                // If there's need for some files to be excluded for the current user, and this path doesn't qualify exclusion, then add it
                                if (exclShouldIncludeURL(entry.url)) {
                                    promises.push(zipAppend1(specialZipStream))
                                }


                                return await Promise.all(promises)
                            } catch (e) {
                                console.error(`Ouch!\nCould not fetch ${entry.url}\n`, e)
                            }
                        }
                    )

                ).then(async () => {

                    await new Promise(resolve => {
                        let zipOKCount = 0;
                        let zipOKTarget = 1
                        let fileOKCount = 0;
                        let fileOKTarget = 1;

                        zipStream.finalize()
                        specialZipStream?.finalize()
                        specialZipStream ? zipOKTarget++ && fileOKTarget++ : undefined;

                        function cleanup() {
                            zipStream.removeAllListeners()
                            fileStream.removeAllListeners()
                            specialFileStream?.removeAllListeners()
                            specialZipStream?.removeAllListeners()
                        }

                        const check = () => {
                            if ((fileOKCount >= fileOKTarget) && (zipOKCount >= zipOKTarget)) {
                                resolve()
                                cleanup()
                                return true
                            }

                        }
                        zipStream.once('end', () => {
                            zipOKCount++
                            check()
                        })

                        fileStream.once('finish', () => {
                            fileOKCount++
                            check()
                        });

                        specialFileStream?.once('finish', () => {
                            fileOKCount++
                            check()
                        })

                        specialZipStream?.once('end', () => {
                            zipOKCount++
                            check()
                        })
                        check()

                        setTimeout(() => {
                            if (!check()) {
                                console.warn(`Stuck waiting for the streams to drain!!\nWe'll just force close them`)
                                if ((zipOKCount >= zipOKTarget)) {
                                    console.log(`And the ZIPs had finished!`)
                                }
                                cleanup()
                                resolve()
                            }
                        }, 5000)
                    })
                })
            }

            /**
             * 
             * @param {archiver.Archiver} archive 
             * @param {Buffer} buffer
             * @param {string} itemPath
             * @param {number} itemModified
             */
            function zipAppend(archive, buffer, itemPath, itemModified) {

                return archive.append(buffer, {
                    name: itemPath,
                    stats: {
                        mtimeMs: itemModified,
                        mode: 775,
                    }
                })
            }




            const modifyZip = async () => {
                // Let's only modify the URLs that have changed
                let results

                try {
                    results = await unzipper.Open.buffer(await this[filecache].read(bundlePath))
                } catch {
                    try {
                        this[filecache].remove(bundlePath)
                        results = await unzipper.Open.file(bundlePath)
                    } catch (e) {

                        console.log(`The error was with opening the zip `, bundlePath)
                        console.error(e)
                        throw new Error(`Error opening the zip`)
                    }
                }

                const nwRelated = this.getRelated(urlPath).filter(rel => {
                    const inZip = results.files.findIndex(x => `/${x.path}` == rel.url)
                    // TODO: Remove this temporary hack (rel.version.grand), and restore it to rel.version.emperical
                    return (inZip == -1) || (Math.max(rel.version.emperical, rel.version.grand) > results.files[inZip].lastModifiedDateTime.getTime())
                })

                // Remove the files that are not in the new idea of related paths

                // This array contains items that will be maintained in the new zip
                const keepZip = results.files.filter(entry => {
                    const path = `/${entry.path}`
                    return (
                        // It should be in the list of related URLs
                        (related.findIndex(x => x.url === path) !== -1)
                        // And it should not be in the list of URLs that will change
                        && nwRelated.findIndex(x => x.url === path) == -1
                    )
                })


                if (nwRelated.length > 0) {

                    const tmpPath = `${bundlePath}.tmp`
                    const tmpZip = archiver.create('zip', { store: true })
                    tmpZip.pipe(
                        this[filecache].writeAsStream(tmpPath)
                    );

                    for (const item of keepZip) {
                        const buffer = await item.buffer()
                        const itemPath = toSafeZipPath(item.path)
                        const itemModified = item.lastModifiedDateTime.getTime()

                        zipAppend(tmpZip, buffer, itemPath, itemModified)

                        if (exclShouldIncludeURL(itemPath)) {
                            zipAppend(specialZipStream, buffer, itemPath, itemModified)
                        }

                    }


                    await Promise.all(
                        nwRelated.map(async nw => {
                            try {
                                if (!libFs.existsSync(nw.path)) {
                                    this.fileManager.removeURL(nw.url)
                                    return console.log(`Not caching ${nw.url.yellow}\nIt might have been removed.`)
                                }
                                const results = await getData(nw)

                                const safeURLPath = toSafeZipPath(nw.url)
                                const modifiedTime = nw.version.emperical

                                zipAppend(tmpZip, results, safeURLPath, modifiedTime)

                                if (exclShouldIncludeURL(nw.url)) {
                                    zipAppend(specialZipStream, results, safeURLPath, modifiedTime)
                                }

                            } catch (e) {
                                console.error(`Could not add ${nw.url}\nto the archive\n`, e, `\n`)
                            }
                        })
                    );


                    // Now that we are done fetching, and storing the new entries,
                    // as well as maintaining the older valid entries...
                    // Let's finalize things

                    await new Promise(resolve => {
                        specialZipStream?.finalize()
                        tmpZip.finalize().catch(e => {
                            console.log(`Finalize failed!! `, e)
                        })
                        const done = () => {
                            tmpZip.removeAllListeners()
                            resolve()
                        }
                        tmpZip.addListener('end', done)
                    })


                    // Copy the tmp file, and replace the original
                    // Wait for the copy to finish
                    const modStream = await this[filecache].writeAsStream(bundlePath);
                    await new Promise(async (resolve, reject) => {
                        (await libFs.createReadStream(tmpPath)).pipe(
                            modStream,
                            { end: true }
                        ).addListener('close', resolve).addListener('error', reject)
                    });

                    await new Promise((resolve) => {

                        modStream.close((e) => {
                            resolve()
                            if (e) {
                                console.error(`Closing the file stream brought an error`)
                            }
                        })
                    })

                    libFs.rmSync(tmpPath)

                    console.log(`${bundlePath.yellow} updated to contain ${related.length} paths, instead of ${results.files.length}`)



                } else {
                    // Nothing to modify, despite the fact that the grand version thinks we should
                    // Therefore, we just touch the file
                    // console.log(`There are no new files to be added to the archive, out of the ${related.length} related URLs, and the ${results.files.length} existing files\nRelated:\n`, related.map(x => x.url), `\n\nExisting:\n`, results.files.map(x => `/${x.path}`))
                    console.warn(`${bundlePath.cyan} stays constant at ${results.files.length}==${related.length} paths, despite a request to update`)
                }
            }

            let nothingNew;

            /**
             * This function is used to provide a synchronous execution of
             * either modifyZip(), or createNew(), by waiting for a previous
             * similar task
             * @param {Promise<void>} task 
             */
            const doTask = async (task) => {

                if (this[bundlingTasks][urlPath]) {
                    let taskDone;
                    setTimeout(() => {
                        if (!taskDone) {
                            console.log(`And, we're still waiting for the task on ${urlPath} to complete.`)
                        }
                    }, 5000)
                    await this[bundlingTasks][urlPath]
                    taskDone = true
                } else {
                    try {
                        await (this[bundlingTasks][urlPath] = task())
                        delete this[bundlingTasks][urlPath]
                    } catch (e) {
                        delete this[bundlingTasks][urlPath]
                        console.log(`Task \n`, task, `\nFailed\n`, e)
                        throw e
                    }

                }
                res.setHeader('X-bundle-cache-version', grandVersion)

                if (nothingNew && specialExclude.urlPaths.length > 0) {
                    const archive = await unzipper.Open.file(bundlePath)
                    // console.log(`The remainder that would be included in the special zip `, remainder)
                    for (const entry of archive.files) {
                        if (exclShouldIncludeURL(entry.path)) {
                            zipAppend(specialZipStream, await entry.buffer(), entry.path, entry.lastModifiedTime)
                        }
                    }
                    await specialZipStream.finalize()
                    await new Promise(r => specialFileStream.once('finish', r))
                }



                const finalPath = specialExclude.urlPaths.length > 0 ? specialExclude.bundlePath : bundlePath
                try {
                    await HTTPServer.serveFile(finalPath, res, finalPath)
                } finally {
                    setTimeout(() => {
                        try {
                            libFs.rmSync(specialExclude.bundlePath)
                        } catch { }
                    }, 2_000)
                }
            }


            /** @type {libFs.Stats} */
            let bundleStat;
            await doTask(
                // File exists, and it's updated
                fileExists && ((bundleStat = await libFs.promises.stat(bundlePath)).mtimeMs >= grandVersion) && (nothingNew = true)
                    ? () => {
                        // Do nothing, and simply serve
                    }
                    : (
                        fileExists // File exists, and its backwards, modify
                            && bundleStat.size > 0
                            ? modifyZip
                            : makeNew // Doesn't exist at all
                    )
            ).catch(e => {
                res.statusCode = 500
                console.error(`Error during bundling\n`, e)
                res.end()
            })

        }

        if (bundleRegexp.test(req.url)) {
            await grand()
            return true
        }
        return false
    }

    static get MAX_RESOURCE_SIZE() {
        return 64 * 1024
    }

}
