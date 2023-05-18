/*
Copyright 2021 HolyCorn Software

This aim of this module is to provide a universal way, of communicating errors with system components, and with users.
It gives a way of templating errors, so that only shorter, specific strings may be passed around.

The reason for this is simple. Faculties can't share classes over RPC. Therefore, instead of throwing object-based errors, it is better to throw strings that will be resolved into the actual error, when need be

*/
import { Platform } from '../platform.mjs'
import { ErrorEngine } from '../public/errors/engine.mjs'

/**
 */

/**
 * @typedef {{code:Number, message:string}} ErrorMapError
 * @typedef {Object<string, ErrorMapError>} ErrorMap
 * @typedef {{
 * backend:{
 * httpCode:number,
 * message: string
 * },
 * frontend:{
 * message:string
 * }
 * }} ErrorV2
 * 
 * @typedef {Object<string, ErrorV2>} ErrorMapV2
 * 
 * @typedef {ErrorV2 & {
 * id: string
 * }} ResolvedErrorV2
 */

/**
 * This class allows responding appropriately to errors at the backend.
 * Note that, in no way do we expect these server errors to be user-friendly. Instead, its more about figuring out which response code to send.
 * The front-end handler may take charge of creating user-friendly errors.
 * 
 */

// TODO: Make errors to synchronize when changed
export class BackendHandler {

    constructor() {


        /** @type {ErrorMap} */ this.map
    }

    /**
     * This method is needed to initialize the error handler, by retrieving the list of errors from the base
     */
    init() {

        /** @type {import('../platform.mjs').Platform}*/
        let platform = Platform.get()
        let map = {}


        //Since this might be called before the Platform, whether Base or Faculty, is initialized,
        //We make a continous function that'll initialize the error handler once the platform is ready

        return new Promise((resolve, reject) => {


            let error_engine_init_key = setInterval(async () => {

                try {
                    if ((platform = Platform.get())) {

                        if (platform.type === 'faculty') { //If FacultyPlatform
                            map = await platform.base.channel.remote.errors.getMap()
                        } else {
                            if (!(map = platform.errors?.map)) {
                                return
                            }
                        }

                        this.map = map

                        this.engine = new ErrorEngine(this.map)
                        clearInterval(error_engine_init_key);
                        resolve()
                    } else { }
                } catch (e) {
                    console.error(e)
                    clearInterval(error_engine_init_key)
                }
            }, 50)

        })
    }

    resolve(message) {
        if (!this.engine) {
            console.trace(`Could not resolve error \n${message.stack || message}\n since error engine is not yet initialzed`)
            return message;
        }
        return this.engine.resolve(message)
    }


}