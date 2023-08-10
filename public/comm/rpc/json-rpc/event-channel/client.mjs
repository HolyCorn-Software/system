/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (client), is part of the event-channel module, and allows a client
 * to receive events, in an organized way, from several remote sources
 */

import JSONRPC from "../json-rpc.mjs";


const jsonrpc = Symbol()
const init_fxn = Symbol()
const force = Symbol()
const init_done = Symbol()

export default class EventChannelClient {


    /**
     * 
     * @param {JSONRPC} json_rpc 
     * @param {()=>Promise<void>} init A method that will be called when the client initializes
     */
    constructor(json_rpc, init) {

        this[jsonrpc] = json_rpc
        this[init_fxn] = init


        this[jsonrpc].addEventListener('reinit', () => this.init(force).catch(e => console.error(e)))

    }
    get events() {
        return this[jsonrpc].$rpc.events
    }
    async init() {
        if (this[init_done] && arguments[0] !== force) {
            return
        }
        await this[init_fxn]()
        this[init_done] = true
        this.events.dispatchEvent(new CustomEvent('init'))
        return true
    }


}