/**
Copyright 2021 HolyCorn Software

This defines a special class called platform
It is a store of multiple objects, that simplify the work of faculties

*/

import { EventEmitter } from 'node:events'

/**
 * @typedef {function(('booted'|'exit'), function)} PlatformEventListenerFunction
 * 
 * @typedef {{on: PlatformEventListenerFunction, emit:PlatformEventListenerFunction} & EventEmitter} PlatformEvents
 */

export class Platform {

    constructor() {

        /** @type {PlatformEvents} */ this.events
        this.events = new EventEmitter();

        /** @type {{plaintext: string, secure:string}} */ this.server_domains

    }


    /**
     * This method is called by sub-classes to completely initialize themselves
     */

    init() {


        global.platform = this;

        //console.log(`Platform init done`)
    }

    /**
     * Refers to the type of platform. Whether FacultyPlatform or BasePlatform
     * @returns {('faculty'|'base')}
     */
    get type(){
        return 'faculty'
    }

    /**
     * 
     * @returns {Platform}
     */
    static get() {
        return global.platform
    }

    exit() {
        process.exit()
    }


}
