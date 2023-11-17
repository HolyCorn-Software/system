
/*
Copyright 2021 HolyCorn Software
This is part of node-hc library
This module provides a simple http server supporting servlets and routing

To use this module,
A server is instantiated
To handle a specific request, the server.routePath(path, callback) method is called
The path tells us the pattern of requests that will be handled by the callback
The callback is a function that will be called each time a request that matches the pattern is made
The server.routePath() can be called many times according to the different categories of requests that need to be handled

Note that, all these explain how requests that come are distributed to the various callbacks.
Now, how about how the request come in the first place ?

So therefore, to use a Server effectively, you channel requests from the orignal source, e.g by use of nodejs's
internal http.createServer() method.
Once the requests come, you call the Server.serve() method using the requests and response params

For example:
let test_server = new Server();
let node_http = http.createServer(function(request, response){
    test_server.serve(request, response) //The Server takes it from here
})

test_server.route({path:'/hello/', callback:function(request, response){
        response.end('Hiii')
    }
})

test_server.route({path:'/how/', callback:function(request, response){
        response.end('fine')
    }
})

test_server.route({path:'/', callback:function(request, response){
        response.end('Hey, didn\'t get you')
    }
})

The server supports middleware, which means some functions get to receive every request before the ones that have subscribed for it

To add a middleware simply push an object of this structure
{
    callback:function(req:SuperRequest, res:SuperResponse){}
}
into yourServer.middleware

*/

import http, { Server as HTTPServerClass } from 'http';
import fetch from 'node-fetch'
import { Router } from './router.js';

import { SuperRequest } from './super-request.js';
import { SuperResponse } from './super-response.js';
import { WebSocketServer } from './websocket/websocket.js';
import libPath from 'node:path'

const serveMethod = Symbol()
const sPort = Symbol()

export class Server extends Router {

    /**
     * 
     * @param {Number|number} port Optionally pass this if you want the HTTP to start listening for connections immediately.
     * @param {boolean} isHalted This optional argument tells us if we should start the server in a mode where it doesn't receive requests.
     */
    constructor(port, isHalted) {

        super(isHalted);

        this.server = http.createServer();

        if (port) {
            this.port = port
        }

        //Now setup the websockets
        this.websocketServer = new WebSocketServer(this.server);
        this.websocketServer.setupListeners();

    }

    /**
     * @returns {number}
     */
    get port() {
        return this.#httpServer?.address()?.port || this[sPort]
    }

    /**
     * @param {number}
     */
    set port(port) {
        const stack = new Error().stack.split('\n').slice(2,).join('\n');
        (async () => {
            port = port instanceof Number ? port.valueOf() : port;

            if (typeof port === 'string') {
                console.trace(`This is odd, a string being passed as value of for port number. Value '${port}'`)
            }
            port = Number(port).valueOf();

            if (typeof port !== 'number' || port < 1 || port > 65535) {
                throw new Error(`'${port}' is not a valid port number. It is a ${typeof port}`);
            }

            this[sPort] = port;

            while (this.isHalted) {
                await new Promise(x => setTimeout(x, 1500))
            }

            if (this.#httpServer.listening) {

                this.#httpServer.close((errr) => {
                    if (errr) {
                        console.log(`Failed to switch port because of `, errr)
                    } else {
                        this.#httpServer.listen(port)
                    }
                });

            } else {
                this.#httpServer.listen(port);

            }

        })()
    }

    /** @type {HTTPServerClass} */
    #httpServer
    /** @param {http.Server} server */
    set server(server) {
        /** Each time the 'server' attribute is being set, we setup listeners */
        if (!(server instanceof HTTPServerClass)) {
            throw new Error(`Please pass an instance of an HTTPServer as the value for the 'server' attribute`)
        }
        this.#httpServer = server;
        server.on('request', this[serveMethod] = this.serve.bind(this));
    }
    get server() {
        return this.#httpServer
    }
    async destroy() {
        this.contracts = []
        this.#httpServer.removeAllListeners()
        if (this.server.listening) {
            await new Promise((done, error) => {
                this.server.close((close_err) => {
                    if (close_err) {
                        error(close_err)
                    } else {
                        done()
                    }
                })
            })
        }
        this.websocketServer.destroy()
    }

    /**
     * @param {SuperRequest} request
     * @param {SuperResponse} response
     */
    async serve0(request, response) { //This method is called by the default receiver of requests (it could be firebase)
        //And then find the appropriate handler the request

        try {
            if (await this.doRoute(request, response)) {
                //If the routing as performed by the super class worked
                //That is, if there was any contract
                return true;
            }

            //If no contract was found by the router, then respond with error 404
            (this.realClass.notFound || Server.notFound)(request, response)
        } catch (e) {

            //If there was any error from the routing, such as the ones cause by middleware,
            //We report it
            console.log(`error `, e)
            if (e.stack) {
                e = `error.system.unplanned`
            }
            try {
                response.endJSON(e.message || e, {}, 500);
            } catch (e) {
                console.log(`Could not report critical error with middleware \n`, e)
                response.endJSON('Server Error', {}, 500)
            }
            return;

        }

    }

    /**
     * 
     * @param {http.ClientRequest} req 
     * @param {http.ServerResponse} res
     * @returns {Promise<void>} 
     */
    async serve(req, res) {


        try {
            //In order to continue, we must fortify the request and response objects
            let request = req instanceof SuperRequest ? req : new SuperRequest(req, res);
            let response = res instanceof SuperResponse ? res : new SuperResponse(res, req);
            await this.serve0(request, response);
        } catch (e) {
            console.log(`Error while serving HTTP requests `, e)
            res.writeHead(500, 'Server Error')
            res.end('Server Error!')
        }
    }

    /**
     * This method is used to forward the server's http request for a specific path, to a given remote path
     * @param {object} param0 
     * @param {string} param0.localPath
     * @param {string} param0.remoteURL
     */
    course({ localPath, remoteURL, headers = {} } = {}) {

        try {

            if (!remoteURL) {
                throw new Error(`Please specify the 'remoteURL' parameter.`)
            }


            this.route({
                path: localPath,
                callback:

                    //So when a request comes in that matches
                    /**
                     * @param {SuperRequest} request 
                     * @param {SuperResponse} response 
                     */
                    async (request, response) => {

                        try {
                            const finUrl = libPath.normalize(`${remoteURL}${request.url.replace(localPath, '')}`);
                            const method = request.method.toUpperCase()
                            let data = await fetch(finUrl, {
                                method: method,
                                headers: { ...request.headers, ...headers, },
                                body: (method == 'GET' || method == 'HEAD') ? undefined : request,
                                redirect: 'follow'
                            })
                            //Once we get a response from our internal faculty http server... We continue to relay it
                            for (var header of data.headers.keys()) {
                                try {
                                    if (!response.closed && !response.headersSent) {
                                        response.setHeader(header, data.headers.get(header))
                                    }
                                } catch (e) {
                                    console.log(`coursing ${localPath.blue} to ${remoteURL.blue} created an error\n`, e)
                                }
                            }
                            data.body.pipe(response)
                            response.statusCode = data.status
                            response.statusMessage = data.statusText;
                        } catch (e) {
                            console.log(`Could not serve client at ${request.url} because\n${e.stack || e.message || e}`)
                            try {
                                response.writeHead(500)
                                response.end('Server Error')
                            } catch (e) {
                                console.log(`Could not respond with code 500 for request ${request.url} because\n${e}`)
                            }
                        }

                    }
            })

        } catch (e) {
            console.error(e.stack)
            throw e;
        }

    }


    /**
     * 
     * @param {http.ClientRequest} request 
     * @param {http.ServerResponse} response 
     */
    static notFound(request, response) {
        response.writeHead(404)
        response.end('Not Found')
    }



}