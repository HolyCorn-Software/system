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

/**
 * @template T
 */
export default class EventChannelClient {


    /**
     * 
     * @param {JSONRPC} json_rpc 
     * @param {(this: EventChannelClient)=>Promise<void>} init A method that will be called when the client initializes
     */
    constructor(json_rpc, init) {

        this[jsonrpc] = json_rpc
        this[init_fxn] = init


        this[jsonrpc].addEventListener('reinit', () => this.forceInit().catch(e => console.error(e)))

        this[jsonrpc].addEventListener('destroy', () => {
            this.events.dispatchEvent('disconnect')
        })

    }
    /** 
     * @returns {soul.comm.rpc.event_channel.EventClientEventTarget<T>}
     */
    get events() {
        return this[jsonrpc].$rpc.events
    }
    async init() {
        if (this[init_done] && arguments[0] !== force) {
            return
        }
        await this[init_fxn]()
        this[init_done] = true
        EventTarget.prototype.dispatchEvent.apply(this.events, [new CustomEvent('init')])
        return true
    }

    /**
     * Call this method forcefully re-initialize the event-channel client.
     */
    forceInit() {
        return this.init(force)
    }


}