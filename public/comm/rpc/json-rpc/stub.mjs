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
        super.dispatchEvent(event)
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
    emit(rpc, type, ...data) {
        if (typeof rpc === 'string') { //If called locally
            type = arguments[0]
            data = Array.prototype.slice.call(arguments, 1)
            super.emit(type, ...data);
            this[json_rpc_symbol].remote.$rpc.events.emit(type, ...data);
        } else {
            super.dispatchEvent(new CustomEvent(`$remote-event`, { detail: { type, data } }))
        }
    }

}


