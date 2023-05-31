/**
 * Copyright 2022 HolyCorn Software
 * The Soul System
 * This module (static) automatically handles exposure of static files which the faculty has enlisted
 */

import fs from 'node:fs'
import libPath from 'node:path'
import CompatFileServer from '../../../http/compat-server/server.mjs'
import FacultyVersionReporter from './bundle-cache/version-reporter.mjs'
import chokidar from 'chokidar'
import FileCache from '../../../http/file-cache/cache.mjs'

export default class FacultyStaticHTTPManager {

    constructor() {

    }
    async init() {
        const faculty = FacultyPlatform.get()
        if (!(faculty.descriptor.http?.staticPaths && Reflect.ownKeys(faculty.descriptor.http?.staticPaths).length > 0)) {
            return
        }
        const watcher = new chokidar.FSWatcher()
        const compat = new CompatFileServer(watcher)
        const httpServer = await HTTPServer.new()
        const versionReporter = new FacultyVersionReporter(watcher)
        const cache = new FileCache({
            watcher
        })

        /**
         * This method is used to route a single URL path 
         * @param {string} urlPath 
         * @param {string} filePath 
         * @returns {Promise<void>}
         */
        async function doRoute(urlPath, filePath) {

            //First things first, clean, and substitute the URL, and path
            filePath = libPath.resolve(faculty.descriptor.path, filePath)

            urlPath = libPath.normalize(
                libPath.resolve(
                    '/',
                    soulUtils.substituteText(urlPath, { fPath: faculty.standard.httpPath })
                ) + '/'
            )


            //Now, if there are wildcard characters (*) in the paths, then let's handle them differently.
            const urlAsterix = urlPath.match(/\*/)?.index
            const fileAsterix = filePath.match(/\*/)?.index

            if (typeof fileAsterix == 'number') {

                const folder = filePath.substring(0, fileAsterix)

                for (let file of fs.readdirSync(folder)) {
                    await doRoute(`${urlPath.substring(0, urlAsterix || -1)}${file}`, `${folder}${file}`)
                }

                return;
            }



            if (!fs.existsSync(filePath)) {
                console.warn(`The url ${urlPath.magenta} points to a non-existent file path: ${filePath.red}`)
            }

            if (fs.statSync(filePath).isDirectory()) {
                await faculty.base.shortcutMethods.http.claim(
                    {
                        remotePath: urlPath,
                        localPath: urlPath,
                        http: httpServer
                    }
                );

                compat.watch(filePath)
                versionReporter.watch(urlPath, filePath)

                httpServer.route(
                    {
                        path: urlPath,
                        vPath: '/',
                        callback: async (req, res) => {
                            if (req.url.startsWith('/')) {
                                req.url = './' + req.url.substring(1,)
                            }

                            let file = libPath.resolve(filePath, req.url.split('?')[0])

                            function checkExist(file) {

                                if (!fs.existsSync(file)) {
                                    res.statusCode = 404
                                    res.end()
                                    return false
                                }

                                return true
                            }

                            while (checkExist(file) && fs.statSync(file).isDirectory()) {
                                file = `${file}${libPath.sep}index.html`
                            }

                            if (!res.headersSent) { //If the headers are sent, then it means we have probably already replied with a 404

                                if (CompatFileServer.fileIsJS(file)) {
                                    compat.getCompatFile(file).then((compatPath) => {
                                        HTTPServer.serveFile(compatPath, res, file, cache)
                                    })
                                    return true;
                                } else {
                                    HTTPServer.serveFile(file, res, file, cache)
                                    return true
                                }

                            }
                        }
                    }
                );

            } else {
                console.warn(`${filePath.red} is a file, and only directories are supported.`)
            }
        }


        for (const oUrlPath in faculty.descriptor.http.staticPaths) {

            try {

                await doRoute(oUrlPath, faculty.descriptor.http.staticPaths[oUrlPath])

            } catch (e) {
                console.error(`The urlPath ${oUrlPath.red} will be unavailable because the system was unable to resolve it to an absolute URL. The following error was encountered.\n`, e)
            }

        }
    }

}