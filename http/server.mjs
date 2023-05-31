/*
Copyright 2021 HolyCorn Software
This module allows faculty platforms to create HTTP Servers

*/

import { Server } from "../lib/nodeHC/http/server.js";
import utils from "../comm/utils/utils.mjs";
import { BackendHandler } from '../errors/handler.mjs'

import fs from 'node:fs'
import node_static from 'node-static'
import { SuperRequest } from "../lib/nodeHC/http/super-request.js";
import { SuperResponse } from "../lib/nodeHC/http/super-response.js";
import FileCache from "./file-cache/cache.mjs";
import libStream from 'node:stream'



export class HTTPServer extends Server {


    /**
     * @returns {Promise<HTTPServer>}
     */
    static async new() {
        let server = new this(await utils.findOpenPort())
        //Initialize the error handler
        server.errorHandler = new BackendHandler()
        try {
            await server.errorHandler.init()
        } catch (e) {
            console.log(`Throwing \n${e}.`)
            throw e
        }
        return server;
    }

    /**
     * Channel requests via a specific path to a given endpoint
     * You are free to specify one or more of these parameters.
     * During runtime, any incoming request that matches any of the creteria will be routed.
     * @param {object} param0
     * @param {RegExp} param0.regexp This refers to the pattern every url must match before being accepted. 
     * @param {string} param0.path The path to be matched
     * @param {string} param0.point For a specific request e.g /user/neba
     * @param {string} param0.vPath The virtual path the requests will be mapped to. (Optional)
     * @param {function(import('node:http').IncomingMessage & SuperRequest, import('node:http').ServerResponse & SuperResponse)} param0.callback 
     * @param {string} param0.host Specify this if you want routing to be done only for a particular sub-domain or Host
     */
    route = (param0) => {
        return this.sugar_coat(super.route, param0)
    }

    /**
     * @param {{
     * localPath:string,
     * remoteURL:string
     * }} param0
     */
    course(param0) {
        return this.sugar_coat(super.course, param0);
    }


    /**
     * This method is used to call an existing method, while providing error handling for the 'callback' parameter that was passed into the method
     * function callback (){} becomes function(){try{callback()}catch(e){}}
     * @param {function} method The method in this object that should be called safely
     * @param {object} params Parameters for the method
     */
    sugar_coat = (method, params) => {
        let { callback } = params;
        params.callback = this.sugar_coat_function(callback);
        return method.apply(this, [params]);
    }


    /**
     * Take any method and make it error-resilient, by catching errors that originated from the method and sending appropriate HTTP messages
     * @param {function(SuperRequest, SuperResponse)} callback 
     * @returns 
     */
    sugar_coat_function = (callback) => {
        /** 
         * @param {SuperRequest} req
         * @param {SuperResponse} res
         */
        return async (req, res) => {
            try {
                return await callback(req, res)
            } catch (e) {

                if (typeof e === 'string') {
                    e = new Exception(e, { code: e })
                }

                if (e instanceof Exception) {
                    //Well planned v2 error
                    if (e.code === 'error.system.unplanned') {
                        console.error(e);
                    }
                    return res.endJSON(e.userObject, {}, e.userObject.httpCode) || true
                }

                console.warn(`\n\nInstead of throwing an Error object, throw an Exception with a specific code name, as defined in the faculty.json. For example user.error.authError`)
                let exception = new Exception(`Unhandled Error during HTTP serving\n${e.stack}`, { code: 'error.system.unplanned' });
                console.error(exception)
                return res.endJSON(exception.userObject, {}, exception.userObject.httpCode) || true

            }
        }
    }

    /**
     * 
     * @param {object} param0 
     * @param {function(import('node:http').IncomingMessage, import('node:http').ServerResponse<import('node:http').IncomingMessage>)} param0.callback
     */
    addMiddleWare({ callback }) {
        let args = arguments[0]
        this.middleware.push({
            ...args,
            callback: this.sugar_coat_function(callback)
        })
    }

    /**
     * This method accepts request and response, objects from NodeJS as they usually are
     * @param {import('node:http').IncomingMessage} req 
     * @param {import('node:http').OutgoingMessage} res 
     * @returns 
     */
    serve(req, res) {
        return super.serve(new SuperRequest(req, res), new SuperResponse(res, req))
    }


    static notFound(request, response) {
        response.writeHead(404)
        response.end(JSON.stringify(new Exception(`Resource not found`, { code: 'error.http.not_found' }).userObject))
    }


    /**
     * This method serves a single file
     * @param {string|fs.ReadStream} path  If path is passed, it would be read
     * If a stream is passed, it too would be used
     * @param {import('http').ServerResponse} res 
     * @param {string} originalPath
     * @param {FileCache} cache
     * We will just use the provided stream
     * @returns {Promise<void>}
     */
    static serveFile(path, res, originalPath, cache) {

        return new Promise(async (resolve, reject) => {


            /** @type {fs.Stats} */
            let stat
            if (typeof path === 'string' && (!fs.existsSync(path) || (!(stat = fs.statSync(path)).isFile()))) {
                res.statusCode = 404
                res.statusMessage = "NOT FOUND"
                return res.end(`Not Found (${path})`)
            }

            const stream = typeof path === 'string' ? (cache ? await cache.readAsStream(path) : fs.createReadStream(path, { autoClose: true })) : path
            res.statusCode = 200
            res.setHeader(`Content-Type`, node_static.mime.lookup(originalPath || (typeof path === 'string' ? path : '.mjs')))
            res.setHeader(`Content-Length`, stat?.size || stream.readableLength)
            stream.pipe(res)
            stream.addListener('end', () => {
                res.end()
                resolve()
            })


        }).catch(e => {
            console.error(e)
            try {
                res.statusCode = 500
                res.end(`System Error`)
            } catch { }
        })
    }


}
