/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (server), is part of the bundle-cache module, and responsible 
 * for directly accepting HTTP requests, maintaining the map, 
 * and responding with cache bundles
 * 
 */

import RequestMap from "./request-map.mjs"
import chokidar from 'chokidar'
import libUrl from 'node:url'
import babel from '@babel/core'
import libFs from 'node:fs'
import libPath from 'node:path'
import shortUUID from "short-uuid"
import fetch from 'node-fetch'
import archiver from 'archiver'
import unzipper from "unzipper"
import { SuperResponse } from "../../../lib/nodeHC/http/super-response.js"
import FileCache from "../../file-cache/cache.mjs"
import { SuperRequest } from "../../../lib/nodeHC/http/super-request.js"



const setup = Symbol()

const injectionData = Symbol()
const lastUpdateTime = Symbol()

const watcher = Symbol()
const bundlesPath = Symbol()
const publicPath = libUrl.fileURLToPath(new URL('../public/', import.meta.url).href)
const bundlingTasks = Symbol()
const filecache = Symbol()


export default class BundleCacheServer {

    /**
     * 
     * @param {HTTPServer} httpServer 
     * @param {string[]} domains
     * @param {soul.http.bundlecache.RequestMapCollection} collection
     */
    constructor(httpServer, domains, collection) {

        this[setup](httpServer, domains)
        this.map = new RequestMap(collection)
        this.setupInjection()
        /** @type {[url: string]: Promise<void>} */
        this[bundlingTasks] = {}

    }

    /**
     * This method prepares the code that will be injected into HTML pages,
     * to allow for caching at the client side; and make provisions for updating the code
     * @returns {Promise<void>}
     */
    async setupInjection() {

        const scriptPath = `${publicPath}/loader.mjs`

        /**
         * This method is used to regenerate the data for injection
         * @param {libFs.Stats} stat 
         */
        const createData = async (stat) => {
            stat ||= await libFs.promises.stat(scriptPath)
            if ((this[lastUpdateTime] || 0) >= stat.mtimeMs) {
                return;
            }
            this[lastUpdateTime] = Date.now() + 10
            return this[injectionData] = `<!DOCTYPE html>\n<script type='module'>${(await babel.transformFileAsync(scriptPath,
                {
                    presets: [
                        [
                            '@babel/preset-env',
                            { modules: false }
                        ]
                    ]
                }
            )).code
                }\n</script>`
        }

        if (!this[watcher]) {
            this[watcher] = chokidar.watch(scriptPath)
            const doCreate = (path, stat) => {
                createData().catch(e => console.warn(`Caching may not work\n`, e))
            }
            this[watcher].on('change', doCreate);

            this[watcher].on('add', doCreate)
            createData().catch(e => console.warn(`Caching may not work\n`, e))
        }


        await libFs.promises.mkdir(
            this[bundlesPath] = `/tmp/${shortUUID.generate()}`
        );
        process.addListener('SIGINT', () => {
            libFs.rmSync(this[bundlesPath], { force: true, recursive: true })
        })

    }

    /**
     * This method sets up the BundleCache, for intercepting requests, to
     * be subsequently used in building maps, and responding with bundles
     * @param {HTTPServer} httpServer 
     * @param {string[]} domains A list of domains which this server is known
     * to operate on. This is to prevent cross-origin request poisoning
     * @returns {void}
     */
    [setup](httpServer, domains) {

        this[filecache] = new FileCache(
            {
                watcher: this[watcher],
            }
        );

        httpServer.addMiddleWare(
            {
                callback: async (req, res) => {

                    const url = `${req.url}`


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

                    res.write = (...args) => {

                        // Making sure we intercept only the first call to write()
                        if (intercepted) {
                            // If this is not the first write call,
                            // let's make all javascript inactive, so that the service
                            // worker can make it active

                            origWrite.call(
                                res,
                                /html/gi.test(res.getHeader('content-type')) ? Buffer.from(args[0]).toString().replaceAll(/(<script.*)src/gi, `$1srd`) : args[0],
                                ...args.slice(1)
                            )
                            return;
                        }

                        intercepted = true


                        // If this is the first write call, let's inject the 
                        // service worker script

                        const intercept = /html/gi.test(res.getHeader('content-type'))
                        if (intercept) {

                            const injectedData = this[injectionData] || '<!-- No data -->\n'
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
                            const src = req.headers['x-bundle-cache-src']
                            if (
                                size === 0
                                || size > BundleCacheServer.MAX_RESOURCE_SIZE
                                || !src
                                || req.method?.toLowerCase() !== 'get'
                            ) {
                                return;
                            }

                            const refURL = new URL(src)

                            if (domains.findIndex(x => x == refURL.host) === -1) {
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
                                console.log(`Not linking ${refURL.pathname} to ${url}`)
                                return;
                            }



                            // Let's remember, that the given request, 
                            // is associated to it's referrer
                            this.map.link(refURL.pathname, [url])
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
        const grandRegExp = /\$bundle_cache\/getGrandVersion$/
        if (grandRegExp.test(req.url)) {
            const path = req.headers['x-bundle-cache-path']
            if (!path) {
                res.statusCode = 400
                res.end('Bad request')
            } else {
                res.endJSON({ version: this.map.getGrandVersion(path) })
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

        const publicRegexp = /\$bundle_cache\/public/
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
     * This method handles situations where the client is requesting for a bundle
     * @param {SuperRequest} req 
     * @param {import('node:http').ServerResponse} res 
     * @returns {boolean}
     */
    async grandServe(req, res) {


        const bundleRegexp = /\$bundle_cache\/grand/


        /**
         * This is the heart of the grandServe() method.
         * It compiles several requests into one, and makes a zip out of
         * all the data in them
         * @returns {Promise<void>}
         */
        const grand = async () => {
            const path = req.headers['x-bundle-cache-path']
            if (!path) {
                res.statusCode = 500
                res.end('Bad request!')
                return;
            }
            const related = this.map.getRelated(path)
            related.push({ url: path, version: this.map.getVersion(path) })

            const bundlePath = libPath.normalize(`${this[bundlesPath]}/${path}.related.zip`)
            await libFs.promises.mkdir(libPath.dirname(bundlePath), { recursive: true })
            const grandVersion = this.map.getGrandVersion(path)

            const fileExists = libFs.existsSync(bundlePath)

            const toSafeZipPath = path => `/${path.endsWith('/') ? `${path}.index` : path}`

            const makeNew = () => {

                const zipStream = archiver.create('zip', { store: true })
                const fileStream = this[filecache].writeAsStream(bundlePath)
                zipStream.pipe(fileStream)

                return Promise.all(
                    related.map(
                        async entry => {
                            try {
                                let done
                                const results = await Promise.race(
                                    [
                                        fetch(`http://0.0.0.0${entry.url}`),
                                        new Promise((resolve, reject) => {
                                            setTimeout(() => {
                                                reject(new Error(`The url ${entry.url} too too long to fetch`))
                                            }, 5000)
                                        })
                                    ]
                                )
                                done = true
                                if ((results.status < 200) || (results.status >= 300)) {
                                    return console.log(`Not caching ${entry.url}\nResponse ${results.status}`)
                                }
                                const data = Buffer.from(
                                    await results.arrayBuffer()
                                )

                                return zipStream.append(
                                    data,
                                    { name: toSafeZipPath(entry.url), stats: { mtimeMs: entry.version?.emperical || -1, mode: 775 } }
                                )
                            } catch (e) {
                                console.error(`Ouch!\nCould not fetch ${entry.url}\n`, e)
                            }
                        }
                    )

                ).then(async () => {

                    await new Promise(resolve => {
                        zipStream.finalize()
                        const done = () => {
                            zipStream.removeAllListeners()
                            resolve()
                        }
                        fileStream.addListener('close', done)
                    })
                })
            }



            const modifyZip = async () => {
                // Let's only modify the URLs that have changed
                const results = await unzipper.Open.buffer(await this[filecache].read(bundlePath))

                const nwRelated = this.map.getRelated(path).filter(rel => {
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
                        tmpZip.append(await item.buffer(), {
                            name: toSafeZipPath(item.path),
                            stats: {
                                mtimeMs: item.lastModifiedDateTime.getTime(),
                                mode: 775,
                            }
                        })
                    }


                    await Promise.all(
                        nwRelated.map(async nw => {
                            try {
                                const results = await fetch(`http://0.0.0.0${nw.url}`)
                                if ((results.status < 200) || (results.status >= 300)) {
                                    return console.log(`Not caching ${nw.url}`)
                                }

                                const contentData = Buffer.from(
                                    await results.arrayBuffer()
                                )
                                tmpZip.append(
                                    contentData,
                                    {
                                        name: toSafeZipPath(nw.url),
                                        stats: {
                                            mtimeMs: nw.version.emperical,
                                            mode: 775
                                        }
                                    }
                                )
                            } catch (e) {
                                console.error(`Could not add ${nw.url}\nto the archive\n`, e, `\n`)
                            }
                        })
                    );


                    // Now that we are done fetching, and storing the new entries,
                    // as well as maintaining the older valid entries...
                    // Let's finalize things

                    await new Promise(resolve => {
                        tmpZip.finalize()
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
                            modStream
                        ).addListener('close', resolve).addListener('error', reject)
                    });

                    await new Promise((resolve, reject) => {

                        modStream.close((e) => {
                            resolve()
                            if (e) {
                                console.error(`Closing the file stream brought an error`)
                            }
                        })
                    })

                    console.log(`${bundlePath.yellow} updated to contain ${related.length} paths, instead of ${results.files.length}`)



                } else {
                    // Nothing to modify, despite the fact that the grand version thinks we should
                    // Therefore, we just touch the file
                    // console.log(`There are no new files to be added to the archive, out of the ${related.length} related URLs, and the ${results.files.length} existing files\nRelated:\n`, related.map(x => x.url), `\n\nExisting:\n`, results.files.map(x => `/${x.path}`))
                    console.warn(`${bundlePath.cyan} stays constant at ${results.files.length}==${related.length} paths, despite a request to update`)
                }
            }

            /**
             * This function is used to provide a synchronous execution of
             * either modifyZip(), or createNew(), by waiting for a previous
             * similar task
             * @param {Promise<void>} task 
             */
            const doTask = async (task) => {

                if (this[bundlingTasks][path]) {
                    await this[bundlingTasks][path]
                } else {
                    try {
                        await (this[bundlingTasks][path] = task())
                        delete this[bundlingTasks][path]
                    } catch (e) {
                        delete this[bundlingTasks][path]
                        console.log(`Task \n`, task, `\nFailed\n`, e)
                        throw e
                    }

                }
                res.setHeader('X-bundle-cache-version', grandVersion)
                // We're not including any cache, because stream length information may be incorrect
                await HTTPServer.serveFile(bundlePath, res, bundlePath)
            }


            /** @type {libFs.Stats} */
            let bundleStat;
            await doTask(
                // File exists, and it's updated
                fileExists && ((bundleStat = await libFs.promises.stat(bundlePath)).mtimeMs >= grandVersion)
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

    static isUIFile(path) {
        return /.((mjs)|(js)|(css)|(css3)|(svg)|(.{0,1}html))$/gi.test(path)
    }

}
