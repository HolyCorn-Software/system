/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * The json-rpc module
 * This submodule (stub), provides an interface for remote clients to invoke methods
 */

import JSONRPC from "./json-rpc.mjs";



export default class JSONRPCDefaultStub {

    constructor(json_rpc) {
        this.events = new JSONRPCEventsStub(json_rpc)
    }

}


class WildcardEventEmitter extends EventTarget {
    constructor() {
        super()
    }


    /**
     * 
     * @param {CustomEvent} event 
     */
    dispatchEvent(event) {
        super.dispatchEvent(new CustomEvent('*', { detail: { type: event.type, data: event.detail } }))
        super.dispatchEvent(new CustomEvent(event.type, { detail: event.detail }))
    }
}


const json_rpc_symbol = Symbol(`JSONRPCEventsStub.json_rpc`)

class JSONRPCEventsStub extends WildcardEventEmitter {

    /**
     * 
     * @param {JSONRPC} json_rpc 
     */
    constructor(json_rpc) {
        super();
        /** @type {JSONRPC} */
        this[json_rpc_symbol] = json_rpc

    }
    /**
     * Please, don't call this method locally.
     * Use the dispatchEvent() method
     * 
     */
    emit(rpc, type, data) {
        if (typeof rpc === 'string') { //If called locally
            throw new Error(`This method is not supposed to be called locally.\nJust use the regular dispatchEvent() method.`)
        } else {
            super.dispatchEvent(new CustomEvent(`$remote-event`, { detail: { type, data } }))
            super.dispatchEvent(new CustomEvent(type, { detail: data }))
        }
    }
    /**
     * Dispatching an event, will also cause the event to be dispatched remotely
     * @param {CustomEvent} event 
     * @returns {void}
     */
    dispatchEvent(event) {
        if (!(event instanceof Event)) {
            throw new Error(`This is NOT a remote method.`)
        }
        super.dispatchEvent(event)
        this[json_rpc_symbol].remote.$rpc.events.emit(event.type, event.detail);
    }

}


