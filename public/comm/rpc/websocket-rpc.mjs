/*
Copyright 2021 HolyCorn Software
The Soul System
This module is publicly available to the client (Browser) to provide it with the ability to connect to the server for RPC over WebSockets

Updated 2023, by refractoring code to suit modern standards
*/

import GrowRetry from "../../html-hc/lib/retry/retry.mjs";
import uuid from "../uuid/uuid.mjs";
import JSONRPC from "./json-rpc/json-rpc.mjs";

const reconnect_promise = Symbol()

const abort = Symbol()

export default class ClientJSONRPC extends JSONRPC {



    /**
     * 
     * @param {WebSocket} ws
     */
    constructor(ws) {
        super();

        this.socket = ws;

        /** @type {(event: "destroy"|"reinit"|"reconnect", cb: (event: CustomEvent)=> void )=> void} */ this.addEventListener

    }
    set socket(socket) {
        socket.uniqueID = uuid();


        let buffer = []
        let socket_on_message = (input) => {
            if (!input || !input.data) {
                return console.trace(`Invalid socket data\n`, input)
            }
            let { data } = input
            let string = data.toString()
            buffer.push(string);

            if (string.indexOf('\n') !== -1) {
                const full_string = buffer.join('')
                const [active, residue] = full_string.split('\n')
                this.accept(active)
                buffer = [residue]
            }
        }
        this[abort] = new AbortController()

        socket.addEventListener('message', (event) => {
            if (socket !== this.socket) {
                if (!this.socket) {
                    return
                }
                this.socket.dispatchEvent(new CustomEvent(event.type, { detail: event.detail, bubbles: event.bubbles, cancelable: event.cancelable, composed: event.composed }));
                console.trace(`data came from  the wrong source !!`)
                return socket.removeEventListener('message', socket_on_message)
            }
            socket_on_message(event)
        }, { signal: this[abort].signal })


        this.ondata = async d => {
            //Avoid collisions that might result in hangs

            //In case the last disconnected...
            //Wait till we have a new one
            if (typeof this.socket === 'undefined') {
                await new Promise(x => {
                    setInterval(() => {
                        if (typeof this.socket !== 'undefined') {
                            x();
                        }
                    }, 100)
                });
            }

            this.socket.send(d);

        }


        socket.addEventListener('close', () => {
            //Reconnect if and only if the socket is still our socket
            socket.removeEventListener('message', socket_on_message)
            if (this.socket === socket) {
                this.reconnect()
            }
        }, { once: true, signal: this[abort].signal })
        this.__socket__ = socket;
    }

    detachSocket() {
        const { socket } = this;
        delete this.__socket__
        this[abort].abort()

        return socket
    }

    reconnect() {

        if (this[reconnect_promise]) {
            return this[reconnect_promise]
        }


        //But, before reconnecting, intercept the messages from the old socket, so that once the new socket becomes created, the messages will be sent over
        let old_socket = this.socket


        old_socket.onmessage = (ev) => {
            new GrowRetry(() => {
                if (old_socket === this.socket) {
                    //If the same socket via which the data was sent (ev.target) is the same as the current socket (this.socket), 
                    //then we have not yet reconnected 
                    console.warn(`Not yet connected`)
                } else {
                    //Else, the reconnection has already happened, so we can forward the data
                    if (this.socket) {
                        this.socket.send(ev.data)
                    }
                    console.warn(`This message `, ev.data, ` might be lost forever`)
                }
            }, {
                maxTime: 10_000,
                startTime: 100,
                factor: 5
            })
        }


        delete this.__socket__;



        //Reconnect exponentially
        return this[reconnect_promise] = new GrowRetry(async () => {

            //Fortunately, when this.socket is assigned, the whole setup process (setting this.ondata, this.onclose, this.onmessage) will happen again
            this.socket = await ClientJSONRPC.socketConnect(old_socket.url)
            console.log(`Reconnection successful!! ${this.socket.url}`)
            this.dispatchEvent(new CustomEvent('reconnect'))
            delete this[reconnect_promise]
        }).execute()
    }
    /** @returns {WebSocket} */
    get socket() {
        return this.__socket__
    }

    /**
     * 
     * @param {string} url A fully qualified url or a relative path
     * @param {import("./json-rpc/types.js").JSONRPCCache} cache
     * @returns {Promise<ClientJSONRPC>}
     */
    static async connect(url, cache) {
        try {
            const client = new ClientJSONRPC(await this.socketConnect(url))
            client.flags.cache = cache
            return client
        } catch (e) {
            e.accidental = true
            throw e
        }
    }


    /**
     * Connects to a websocket endpoint and returns a Websocket
     * @param {string} url 
     * @returns {Promise<WebSocket>}
     */
    static socketConnect(url) {
        return new Promise((resolve, reject) => {
            try {
                let path;
                //If is relative url
                if (!/^[a-zA-Z]+:\/\//.test(url)) {
                    if (!url.startsWith('/')) {
                        //This is the url path of the page, ending in /
                        let pageLocationPath = /(^.*\/)(?:[^/]*$)/.exec(window.location.pathname)?.[1]
                        path = `${pageLocationPath}${url}`
                    } else {
                        path = url
                    }
                    //ws://page.com/somepath/someplace if HTTP
                    //wss://page.com/somepath/someplace if HTTPS
                    url = `ws${window.location.protocol === 'https:' ? 's' : ''}://${window.location.host}${path}`

                }
                let socket = new WebSocket(url)
                socket.onopen = () => {
                    resolve(socket)
                }
                socket.onerror = (e) => {
                    reject(e)
                }

            } catch (e) {
                reject(e)
            }
        })
    }

}