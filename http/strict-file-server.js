/*
Copyright 2021 HolyCorn Software
This module is used to create a file server that exposes only specific files and folders
*/

import { HTTPServer } from "./server.mjs";
import { fileURLToPath } from 'url'
import libPath from 'path'
import fs from 'node:fs';
import CompatFileServer from "./compat-server/server.mjs";

const compatServer = Symbol()

export class StrictFileServer {

    /**
     * 
     * @param {{http:HTTPServer, urlPath:string, refFolder:string, cors:boolean}} param0 
     * @param {string} importURL
     * 
     * Note, initializing a StrictFileServer doesn't give access to any file.
     * You have to add paths (using the add() method) which will be available
     * refFolder (Reference Folder) is the folder from which every request is calculated
     * 
     * Imagine you have
     * ```
     * -home
     *  -videos
     *   -user
     *     -anyonecanviewthis.mp4
     *   -system
     *     -noonecanviewthis.mp4
     * ```
     * Assuming you are going to whitelist `home/videos/user`
     * 
     * Assuming your `urlPath` is `/`
     * 
     * by specifying the refFolder as `home/videos/user` means the video will be available at `/anyonecaviewthis.mp4`
     * 
     * However, by specifying refFolder as `home/videos` the video will be available at `/user/anyonecanviewthis.mp4`
     * 
     * And it goes without saying that, even though the ref folder is `home/videos`, `home/videos/system/noonecanviewthis.mp4` is still unavailable
     * 
     * 
     */
    constructor({ http, urlPath, refFolder, cors }, importURL = soulUtils.getCaller()) {
        if (!http instanceof HTTPServer) {
            throw new Error(`Please pass an HTTP server as the http parameter`)
        }

        if (!importURL) {
            throw new Error(`Please pass import.meta.url as the second argument. We use it to give meaning to the http path and whitelists. A path like ../../home.js will be unresolved without this information.`)
        }

        if (!refFolder) {
            throw new Error(`Please pass the refFolder parameter`)
        }


        this.whitelist = []

        this[path_symbol] = libPath.dirname(fileURLToPath(importURL))

        refFolder = libPath.resolve(this[path_symbol], refFolder)
        this[urlPath_symbol] = urlPath
        this[importURL_symbol] = importURL


        this[compatServer] = new CompatFileServer()

        const cacheObject = undefined



        //Then the server that'll serve the files needed


        http.route({
            path: urlPath,
            vPath: '/',
            callback: (req, res) => {
                //Decide where the file to be accessed by the user is stored
                const isIndex = req.url.split('?')[0].endsWith('/')
                let path = `${libPath.resolve(`${refFolder}${new URL(req.url, 'https://holycornsoftware.com').pathname}`)}${isIndex ? '/index.html' : ''}`

                //Now check if the user is trying to access unwanted resources
                if (!this.whitelist.some(aPublicFolder => path.startsWith(aPublicFolder))) {
                    //Then file not found
                    return res.endJSON(`error.http.not_found`, {}, 404)
                }

                if (cors) {
                    res.setHeader('Access-Control-Allow-Origin', '*')
                }

                if (CompatFileServer.fileIsJS(path)) {
                    this[compatServer].getCompatFile(path).then((compatPath) => {
                        HTTPServer.serveFile(compatPath, res, path, cacheObject)
                    })
                    return true;
                } else {
                    HTTPServer.serveFile(path, res, path, cacheObject)
                    return true
                }
            }
        })

    }


    /**
     * 
     * @param  {...string} paths A list of paths or files that clients will be able to access.
     */
    add(...paths) {
        for (const path of paths) {
            const resolvedpath = libPath.resolve(this[path_symbol], path);
            if (this.whitelist.findIndex(x => x === resolvedpath) !== -1) {
                continue
            }

            if (!fs.existsSync(resolvedpath)) {
                console.trace(`Warning!\nThe path '${resolvedpath}' added as '${path}' to the static file server operating at url '${this[urlPath_symbol]}' from the module '${this[importURL_symbol]}' based on the folder '${this[path_symbol]}' is not working.  `)
            }

            this.whitelist.push(resolvedpath)

            this[compatServer].watch(resolvedpath)

        }
    }

}


const importURL_symbol = Symbol(`StrictFileServer.prototype.importURL`)
const path_symbol = Symbol(`StrictFileServer.prototype.path_symbol`)
const urlPath_symbol = Symbol(`StrictFileServer.prototype.urlPath_symbol`)