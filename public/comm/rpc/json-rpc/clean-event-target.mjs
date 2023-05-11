/**
 * Copyright 2023 HolyCorn Software
 * The json-rpc module
 * This submodule (clean-event-target), provides an interface whereby
 * event listeners can be removed all at once
 */


const events = Symbol()

export default class CleanEventTarget extends EventTarget {

    constructor() {
        super()
        /** @type {({event: string, callback: ()=>void, cleanup: ()=>void})[]} */
        this[events] = [];
    }


    /**
     * 
     * @param {string} type 
     * @param {(event: Event)=>void} callback 
     * @param {AddEventListenerOptions & {cleanup : ()=> void}} options 
     */
    addEventListener(type, callback, options) {
        super.addEventListener(...arguments)
        this[events].push({ event: type, callback, cleanup: options?.cleanup })
    }

    cleanup() {
        this[events].forEach(entry => {
            this.removeEventListener(entry.event, entry.callback)
            try {
                entry.cleanup?.()
            } catch (e) {
                console.error(`Could not call cleanup function\n`, entry.cleanup, `\nBecause of \n`, e)
            }
        })

        this[events].length = 0
    }

}