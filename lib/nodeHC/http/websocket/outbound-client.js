/*
Copyright 2021 HolyCorn Software
This module is part of the websocket larger module
It allows the server to make WebSocket connections to an end-point. This is particularly useful for forwarding WebSocket requests
*/

import net from 'node:net'
import tls from 'node:tls'
import { URL } from 'node:url'
import crypto from 'node:crypto'
import { EventEmitter } from 'node:events'
import { WebSocketChannel } from './websocket-channel.js'
import TranscoderStream from './transcoder-stream.mjs'



export class WebSocketOutboundClient extends EventEmitter {


    constructor({ url }) {
        super()

        Object.assign(this, arguments[0])

        /** @type {string} */ this.url


    }


    /**
     * Connect to a WebSocket end-point
     * @returns {WebSocketChannel}
     */

    async connect({ headers = {}, method = 'GET' } = {}) {

        let url = new URL(this.url)

        if (['ws:', 'wss:'].indexOf(url.protocol) == -1) {
            throw new Error(`URL protocol ${url.protocol} is not supported.`)
        }

        /** @type {net.Socket} */
        let socket = new net.Socket()



        if (url.protocol === 'wss:') {

            let secureSocket = tls.connect({
                host: url.hostname,
                port: url.port
            })

            await new Promise((resolve, reject) => {
                secureSocket.once('error', reject)
                secureSocket.once('secureConnect', resolve)
            })

        } else {

            await new Promise((done, rejected) => {

                socket.connect({
                    host: url.hostname,
                    port: url.port || 80
                });

                socket.once('connect', () => {
                    done()
                })

                socket.once('error', e => {
                    rejected(e)
                })
            })


        }

        socket.write(`GET ${url.pathname} HTTP/1.1\r\n`)
        socket.write(`Connection: Upgrade\r\n`)
        socket.write('Upgrade: websocket\r\n')

        for (let header in headers) {
            // Forward all headers, except the ones we will generate ourselves
            if (!['connection', 'upgrade', 'sec-websocket-key'].includes(header?.toString().toLowerCase())) {
                socket.write(`${header}: ${headers[header]}\r\n`)
            }
        }


        //Compute a random sec-websocket-key
        let websocket_key = crypto.randomBytes(16).toString('base64')
        socket.write(`sec-websocket-Key: ${websocket_key}\r\n`)

        socket.write('\r\n\r\n')


        await new Promise((complete, fail) => {


            let in_data_frames = []
            socket.on('data', (d) => {

                try {

                    in_data_frames.push(d)

                    let string = Buffer.concat(in_data_frames).toString()

                    //Now if we have read enough...
                    if (string.endsWith('\r\n\r\n')) {
                        let parts = string.split('\r\n');

                        let reg = /Sec-WebSocket-Accept *: *([^ ]+)$/i
                        for (let part of parts) {
                            if (reg.test(part)) {
                                let [, server_hash] = reg.exec(part);
                                this.validateServerHandShake(websocket_key, server_hash);
                                return complete()
                            }
                        }

                        //Now if, there was no WebSocket-Accept
                        throw new Error(`Endpoint ${url.hostname}/${url.pathname} doesn't support WebSockets`)

                    }

                } catch (e) {
                    fail(e)
                }

            })


        })

        return new WebSocketChannel(socket)


    }

    validateServerHandShake(websocket_key, server_hash) {
        let expected_hash = TranscoderStream.computeSecureAccept(websocket_key)
        if (expected_hash !== server_hash) {
            throw new Error(`Handshake failed because server sent '${server_hash}' instead of '${expected_hash}' `)
        }
        return true;
    }


}