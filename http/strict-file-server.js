/*
Copyright 2021 HolyCorn Software
This module is used to create a file server that exposes only specific files and folders
*/

import { HTTPServer } from "./server.js";
import { fileURLToPath } from 'url'
import libPath from 'path'
import node_static from 'node-static'
import fs from 'node:fs';
import { getCaller } from "../util/util.js";

export class StrictFileServer {

    /**
     * 
     * @param {{http:HTTPServer, urlPath:string, refFolder:string}} param0 
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
    constructor({ http, urlPath, refFolder }, importURL=getCaller()) {
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
        this[refFolder_symbol] = refFolder = libPath.resolve(this[path_symbol], refFolder)
        this[urlPath_symbol] = urlPath
        this[importURL_symbol] = importURL



        //Then the server that'll serve the files needed

        const static_server = new node_static.Server(refFolder)


        http.route({
            path: urlPath,
            vPath: '/',
            callback: (req, res) => {
                //Decide where the file to be accessed by the user is stored
                let path = libPath.resolve(`${refFolder}${req.url}`)

                //Now check if the user is trying to access unwanted resources
                if (!this.whitelist.some(aPublicFolder => path.startsWith(aPublicFolder))) {
                    //Then file not found
                    return res.endJSON(`error.http.not_found`, {}, 404)
                }

                //Else, all good
                static_server.serve(req, res)
            }
        })

    }

    /**
     * 
     * @param  {...string} paths A list of paths or files that clients will be able to access.
     */
    add(...paths) {
        for (var path of paths) {
            let resolvedpath = libPath.resolve(this[path_symbol], path);
            try{
                fs.statSync(resolvedpath)
            }catch(e){
                console.trace(`Warning!\nThe path '${resolvedpath}' added as '${path}' to the static file server operating at url '${this[urlPath_symbol]}' from the module '${this[importURL_symbol]}' based on the folder '${this[refFolder_symbol]}' is not working.  `)
            }
            this.whitelist.push(resolvedpath)
        }
    }


}


const importURL_symbol = Symbol(`StrictFileServer.prototype.importURL`)
const path_symbol = Symbol(`StrictFileServer.prototype.path_symbol`)
const refFolder_symbol = Symbol(`StrictFileServer.prototype.refFolder_symbol`)
const urlPath_symbol = Symbol(`StrictFileServer.prototype.urlPath_symbol`)