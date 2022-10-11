/*
Copyright 2021 HolyCorn Software
The Soul System
This module is publicly available to the client (Browser) to provide it with the ability to connect to the server for RPC over WebSockets
*/

import GrowRetry from "../html-hc/lib/retry/retry.mjs";
import { JSONRPC } from "./json-rpc.js";
import * as uuidAll from './uuid/index.js'
const uuid = uuidAll.v4


export class ClientJSONRPC extends JSONRPC {



    /**
     * 
     * @param {WebSocket} ws
     */
    constructor(ws) {
        super();

        this.socket = ws;

        /** @type {function(('reconnect'), function(CustomEvent), AddEventListenerOptions)} */ this.addEventListener


    }
    set socket(socket) {
        socket.uniqueID = uuid();


        let buffer = []
        let socket_on_message = ({ data }) => {
            let string = data.toString()
            buffer.push(string);

            if (string.indexOf('\n') !== -1) {
                const full_string = buffer.join('')
                const [active, residue] = full_string.split('\n')
                this.accept(active)
                buffer = [residue]
            }
        }
        socket.addEventListener('message', (event) => {
            if (socket !== this.socket) {
                this.socket.dispatchEvent('message', event);
                console.log(`data came from  the wrong source !!`)
                return socket.removeEventListener('message', socket_on_message)
            }
            socket_on_message(event)
        })


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


        socket.onclose = () => {
            //Reconnect if and only if the socket is still our socket
            if (this.socket === socket) {
                this.reconnect()
                this.socket.onclose = undefined; //Prevent this recovery method from happening again
            }
        }
        this.__socket__ = socket;
    }

    reconnect() {

        if (1) {
            return console.log(`reconnection disabled!`)
        }

        //Reconnect exponentially
        return new GrowRetry(async () => {
            //Fortunately, when this.socket is assigned, the whole setup process (setting this.ondata, this.onclose, this.onmessage) will happen again

            //But, before reconnecting, intercept the messages from the old socket, so that once the new socket becomes created, the messages will be sent over
            let old_socket = this.socket
            let old_socket_buffer = []
            delete this.__socket__;

            old_socket.onmessage = (ev) => {
                new GrowRetry(() => {
                    if (old_socket === this.socket) {
                        //If the same socket via which the data was sent (ev.target) is the same as the current socket (this.socket), 
                        //then we have not yet reconnected 
                        console.warn(`Not yet connected`)
                        old_socket_buffer.push(ev.data)
                    } else {
                        //Else, the reconnection has already happened, so we can forward the data
                        // this.socket.send(ev.data)
                        console.warn(`This message `, ev.data, ` might be lost forever`)
                    }
                }, {
                    maxTime: 30_000,
                    startTime: 100,
                    factor: 5
                })
            }
            this.socket = await ClientJSONRPC.socketConnect(old_socket.url)
            console.log(`Reconnection successful!! ${this.socket.url}`)
            this.dispatchEvent(new CustomEvent('reconnect'))
        }).execute()
    }
    /** @returns {WebSocket} */
    get socket() {
        return this.__socket__
    }

    /**
     * 
     * @param {string} url A fully qualified url or a relative path
     * @returns {Promise<ClientJSONRPC>}
     */
    static async connect(url) {
        return new ClientJSONRPC(await this.socketConnect(url))
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

const locked = Symbol('object Lock!')

class Locker {

    constructor(object) {
        this.object = object
        if (!object) {
            return console.trace(`How can object be null ?`)
        }
    }
    async acquireLock() {


        await new Promise(x => {
            const interval = setInterval(() => {
                if (!this.object) {
                    return clearInterval(interval)
                }
                if (this.object[locked] !== true) {
                    this.object[locked] = true;
                    clearInterval(interval);
                    x();
                }
            }, 1)
        })



        this.object[locked] = true

        return {
            release: () => {
                this.object[locked] = false;
            }
        }
    }

    static async lock(object) {
        return new Locker(object).acquireLock()
    }
    static forceRelease(object) {
        object[locked] = false;
    }

}


