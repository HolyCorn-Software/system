/**
Copyright 2021 HolyCorn Software

This defines a special class called platform
It is a store of multiple objects, that simplify the work of faculties

*/

import { EventEmitter } from 'node:events'
const preInitPromise = Symbol()

/**
 * @typedef {function(('booted'|'exit'), function)} PlatformEventListenerFunction
 * 
 * @typedef {{on: PlatformEventListenerFunction, emit:PlatformEventListenerFunction} & EventEmitter} PlatformEvents
 */

export class Platform {

    constructor() {

        /** @type {PlatformEvents} */ this.events = new EventEmitter()

        /** @type {{plaintext: string, secure:string}} */ this.server_domains

        this[preInitPromise] = this.preinit()

    }
    async waitForPreInit() {
        await this[preInitPromise]
    }

    async preinit() {

        await import('./util/util.js').then(x => {
            global.soulUtils = x.default
        })

        global.JSONRPC = (await import('./comm/rpc/json-rpc.mjs')).default
    }


    /**
     * This method is called by sub-classes to completely initialize themselves
     */

    async init() {


        global.platform = this;

        //console.log(`Platform init done`)

        //Now, make some classes global
        global.HTTPServer = (await import('./http/server.mjs')).HTTPServer;

        import('./errors/backend/exception.mjs').then(x => {
            global.Exception = x.Exception
        });
        import('./lib/libFaculty/platform.mjs').then(x => {
            global.FacultyPlatform = x.FacultyPlatform
        })
        import('./comm/rpc/faculty-public-rpc.mjs').then(x => {
            global.FacultyPublicJSONRPC = x.FacultyPublicJSONRPC
            global.FacultyPublicRPCServer = x.FacultyPublicRPCServer
        })
        import('./comm/rpc/faculty-public-methods.mjs').then(x => {
            global.FacultyPublicMethods = x.FacultyPublicMethods
        });
        import('./comm/rpc/faculty-faculty-rpc.mjs').then(x => {
            global.FacultyFacultyRemoteMethods = x.FacultyFacultyRemoteMethods
        })

        import('./http/strict-file-server.js').then(x => {
            global.StrictFileServer = x.StrictFileServer
        })

        import('./util/function-proxy.mjs').then(x => {
            global.FunctionProxy = x.default
        });

        import('./util/simple-cache.mjs').then(x => {
            global.SimpleCache = x.default
        });

        import('./util/files-check.mjs').then(x => {
            global.FilesCheck = x.default
        })

        import('./util/fsUtils.mjs').then(x => {
            global.fsUtils = x.default
        });


        this.bootTasks = new soulUtils.WaitList()


    }

    /**
     * Refers to the type of platform. Whether FacultyPlatform or BasePlatform
     * @returns {('faculty'|'base')}
     */
    get type() {
        return 'faculty'
    }

    /**
     * @returns {'production'|'development'}
     */
    get environment() {
        return process.env.environment?.toLowerCase() === 'production' ? 'production' : 'development'
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
