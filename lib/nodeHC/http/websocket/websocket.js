/*
Copyright 2021 HolyCorn Software
This module provides the functionality of managing WebSockets

*/

import http from 'node:http'
import { Router } from '../router.js';
import { WebSocketOutboundClient } from './outbound-client.js';
import { WebSocketIncomingClient } from './incoming-client.js';

const callback = Symbol()

export class WebSocketServer extends Router {


    /**
     * 
     * @param {http.Server} http 
     */
    constructor(http) {

        super()

        this.clients = []
        this.http = http;
    }

    /**
     * Do everything so that incoming WebSockets can be accepted and processed accordingly
     */

    setupListeners() {
        this.http.on('upgrade', this[callback] = async (request, socket, headers) => {

            if (request.headers.upgrade?.toLowerCase() !== 'websocket') {
                return console.log(`A connection at ${request.url} was ignored because we don't support '${request.headers.upgrade}', only websocket.`)
            }

            let client = new WebSocketIncomingClient({ request, socket, headers, server: this })
            try {
                //As long as the server is halted, don't do handshakes
                if (this.isHalted) {
                    await new Promise(done => {
                        const interval_key = setInterval(() => {
                            if (!this.isHalted) {
                                done()
                                clearInterval(interval_key)
                            }
                        })
                    }, 100)
                }
                await client.doHandshake();
                this.doRoute(request, client);
            } catch (e) {
                console.log(`Error negotiating websocket `, e);
            }
        })

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
     * @param {function(http.IncomingMessage, WebSocketIncomingClient)} param0.callback 
     * @param {string} param0.host Specify this if you want routing to be done only for a particular sub-domain or Host
     */
    route({ regexp, path, host, point, vPath, callback } = {}) {
        super.route(...arguments)
    }



    /**
     * The method is called to forward particular requests to a given WebSocket URL endpoint
     * @param {object} param0
     * @param {RegExp} param0.regexp 
     * @param {string} param0.point
     * @param {string} param0.path
     * @param {string} param0.vPath
     * @param {function(http.IncomingMessage, WebSocketIncomingClient)} param0.callback 
     * @param {string} param0.host
     * @param {string} param0.remoteURL
    */
    course({ regexp, path, host, point, vPath, remoteURL } = {}) {

        remoteURL = remoteURL.replace(/\/{1,}$/, ''); //Remove any traily slashes
        this.route({
            ...arguments[0],
            async callback(request, client) {
                let final_url = remoteURL;

                if (path) {
                    final_url = `${remoteURL}/${request.url.replace(path, '')}`
                }
                let websocketClient = new WebSocketOutboundClient({
                    url: final_url
                })
                try {
                    let endpoint = await websocketClient.connect({
                        headers: request.headers,
                        method: request.method
                    });


                    //The two will handle it from here
                    endpoint.socket.pipe(client.socket)
                    client.socket.pipe(endpoint.socket);
                } catch (e) {
                    console.log(`Could not forward WebSocket to ${remoteURL} because `, e)
                }
            }
        })

    }

    destroy() {
        this.contracts = []
        this.http.off('upgrade', this[callback])
    }


}
