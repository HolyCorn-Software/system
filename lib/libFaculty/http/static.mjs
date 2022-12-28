/**
 * Copyright 2022 HolyCorn Software
 * The Soul System
 * This module (static) automatically handles exposure of static files which the faculty has enlisted
 */

import nodeStatic from 'node-static'
import fs from 'node:fs'
import libPath from 'node:path'

export default class FacultyStaticHTTPManager {

    constructor() {

    }
    async init() {
        const faculty = FacultyPlatform.get()
        if (!(faculty.descriptor.http?.staticPaths && Reflect.ownKeys(faculty.descriptor.http?.staticPaths).length > 0)) {
            return
        }
        const sServer = new nodeStatic.Server('/')
        const httpServer = await HTTPServer.new()

        for (const oUrlPath in faculty.descriptor.http.staticPaths) {
            let urlPath;
            const filePath = libPath.resolve(faculty.descriptor.path, faculty.descriptor.http.staticPaths[oUrlPath])

            try {
                urlPath = soulUtils.cleanPath(
                    libPath.resolve(
                        '/',
                        soulUtils.substituteText(oUrlPath, { fPath: faculty.standard.httpPath })
                    ) + '/'
                )
            } catch (e) {
                console.error(`The urlPath ${oUrlPath.red} will be unavailable because the system was unable to resolve it to an absolute URL. The following error was encountered.\n`, e)
            }

            if (!fs.existsSync(filePath)) {
                console.warn(`The url ${oUrlPath.magenta} points to a non-existent file path: ${filePath.red}`)
            }

            if (fs.statSync(filePath).isDirectory()) {
                await faculty.base.shortcutMethods.http.claim(
                    {
                        remotePath: urlPath,
                        localPath: urlPath,
                        http: httpServer
                    }
                );

                httpServer.route(
                    {
                        path: urlPath,
                        vPath: '/',
                        callback: async (req, res) => {
                            if (req.url.startsWith('/')) {
                                req.url = './' + req.url.substring(1,)
                            }

                            let file = libPath.resolve(filePath, req.url)

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
                                sServer.serveFile(file, 200, {}, req, res, (status, headers) => {
                                    res.end()
                                })
                            }
                        }
                    }
                );

            } else {
                console.warn(`${filePath.red} is a file, and only directories are supported.`)
            }
        }
    }

}