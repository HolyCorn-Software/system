
/**
 * Copyright 2021 HolyCorn Software
 * This module is a representation of an incoming client to a WebSocket Server
 */

import crypto from 'node:crypto'
import TranscoderStream from './transcoder-stream.mjs';
import { WebSocketChannel } from './websocket-channel.js';



export class WebSocketIncomingClient extends WebSocketChannel {


    /**
     * 
     * @param {{
     * request: import('http').IncomingMessage,
     * socket:import('stream').Duplex
     * headers:Buffer,
     * server: import('./websocket.js').WebSocketServer
     * }} param0 
     */
    constructor({ request, socket, headers, server }) {
        super(socket);

        Object.assign(this, arguments[0])
        /** @type {string} */
        this.id = crypto.randomUUID()

        /** @type { import('http').IncomingMessage} **/ this.request
        /** @type {Buffer} **/ this.headers
        /** @type {import('./websocket.js').WebSocketServer} */ this.server


    }

    doHandshake() {

        let known_protocols = [
            'wamp',
            'json'
        ]

        return new Promise((resolve, reject) => {

            try {

                let protocols = this.request.headers['sec-websocket-protocol']?.split(/ |,/)

                this.socket.write(`HTTP/1.1 101 Switching to WebSockets\r\n`)

                if (protocols) {
                    let [common_protocol] = protocols.filter(x => known_protocols.includes(x))

                    if (!common_protocol) {
                        console.log(`Client supprised us `)
                    }

                    this.socket.write(`Sec-WebSocket-Protocol: ${common_protocol}\r\n`)
                }

                this.socket.write(`Connection: Upgrade\r\n`);
                this.socket.write(`Upgrade: WebSocket\r\n`);

                this.socket.write(`Sec-WebSocket-Accept: ${TranscoderStream.computeSecureAccept(this.request.headers['sec-websocket-key'])}\r\n`)

                this.socket.write('\r\n')

                resolve()
            } catch (e) {
                console.warn(e)
                reject(e);
            }
        })
    }


}





