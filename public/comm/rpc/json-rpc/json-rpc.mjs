/*
Copyright 2023 HolyCorn Software
Adapted from the 2021 version, into this modular utility
This defines a simple JSON-RPC 3.0 Client (originally 2.0), that ensures that we don't have to explicitly register methods
At the time the method is being called, the stub object is checked to see the availability of the method.

*/

import { JSONRPCManager } from './manager/manager.mjs';
import JSONRPCRemote from './remote.mjs';
import JSONRPCDefaultStub from './stub.mjs';

import uuid from '../../uuid/uuid.mjs'
import CleanEventTarget from './clean-event-target.mjs';
import EventChannelServer from './event-channel/server/sever.mjs';
import EventChannelClient from './event-channel/client.mjs';

/**
 * Supports bi-directional JSON requests
 */


const defaultStubSymbol = Symbol()

export default class JSONRPC extends CleanEventTarget {

    constructor() {

        super();

        /**
         * This object is where the methods to be called will be lookep up.
         * You can set it to anything, as well as append methods to it using the ```register()``` method
         * @type {object}
        */
        this.stub = {}
        this.manager = new JSONRPCManager(this)

        /**
         * Use this object to call remote methods at the _other_ side
         * For example ```myRPC.remote.printRemote('Displayed this remotely!')```
         * @type {JSONRPCRemote}
         */
        let remote = new JSONRPCRemote(this.manager);

        /** @type {object} */ this.remote
        Reflect.defineProperty(this, 'remote', {
            get: () => {
                return remote;
            }
        })

        /** Store additional information here, so as to prevent interference with the JSON RPC module */
        this.meta = {}

        /**@type {(data: string) => void} Override this method to receive json data that will be transmitted */this.ondata

        this.flags = {
            //
            /**
             * For each method that is called locally, which objects should be inserted as the first argument ?
             */
            first_arguments: [this],
            /** 
             * When there's a call, or an error, should the stack traces 
             * be transmitted to the remote endpoint?
             * 
             */
            expose_stack_traces: true,
            /**
             * The maximum number of outbound calls allowed at a time
             */
            max_outbound_calls: 512,
            /** The maximum number of inbound calls at any given time */
            max_inbound_calls: 32,

            /**
             * This object contains deadlines for various operations of the module
             */
            timeouts: {
                /** The longest time an inbound/outbound call can last */
                inbound_call: 10_000,
                loop: 5 * 60 * 1000, // 5mins for a loop response
            },
            /** 
             * A function that will be called each time there's an error with an inbound
             * call. This function should transform the error, into something that
             * can be viewed by the remote party
             * @param {Error} error
             * @param {string} methodName
             * @param {any[]} params
             */
            error_transform: (error, methodName, params) => error
        }



        this[defaultStubSymbol] = new JSONRPCDefaultStub(this);

        this.id = uuid()

        /** @type {JSONRPCDefaultStub} */ this.$rpc
        Reflect.defineProperty(this, '$rpc', {
            get: () => this[defaultStubSymbol],
            configurable: true,
            enumerable: true
        })

        /** 
         * The destroy event is called when json-rpc is about to be cleaned from the memory
         * The 'reinit' is dispatched by any object that owns json-rpc, telling other listeners,
         * that json-rpc recovered from a stalled state, and is now processing requests
         * @type {(event: "destroy"|"reinit", cb: (event: CustomEvent)=> void, opts: AddEventListenerOptions )=> void} 
        */ this.addEventListener

        this.addEventListener('destroy', () => {
            // 1s after destroy, cleanup the event listener
            setTimeout(() => this.cleanup(), 1000)
<<<<<<< HEAD
            this.accept = () => undefined
            this.ondata = () => undefined
=======
>>>>>>> be8c14704d30e7745752bcb6df1d4cff8b6e4a59
        }, { once: true })
    }

    /** 
     * Defined so that JSON serializer may avoid it.
     * This object is usually a cause for cyclic property errors with JSON serialization, though unfortunately, it doesn't contain any valuable raw data
     *
    */
    toJSON() {
        return {}
    }

    destroy() {
        this.dispatchEvent(new CustomEvent('destroy'))
    }


    /**
     * Accept JSON-formated data
     */
    accept(json_text) {
        //The reason the \n was added in the first place during transmission is to prevent collisions when two processes transmit json text which concatenates to something unelligible


        let chunks = json_text.split('\n');

        for (let chunk of chunks) {
            if (chunk === '') continue;
            try {
                let json = JSON.parse(chunk)
                this.manager.accept(json)
            } catch (e) {
                if (/unexpected token.*JSON/gi.test(e.message)) {
                    console.log('JSONRPC could not parse ', chunk, `. It is ${typeof chunk}`)
                } else {
                    console.log(`Error\n`, e, `\nFor input: '${chunk}'`)
                    console.log(`this.stub `, this.stub)
                }
            }
        }

    }


    /**
     * 
     * @param {string} name 
     * @param {function(JSONRPC,...any)} method 
     * Register a method that will be called remotely by the client.
     * 
     * Take note that when the method is called, the first argument will be reference to the JSONRPC object.
     * Which means
     * @example hello(name){
     *      
     * } 
     * //becomes
     * hello(rpc, name){
     *      
     * }
     */
    register(name, method) {
        Object.defineProperty(this.stub, name, {
            value: method,
            configurable: true,
            enumerable: true
        })
    }

    static get EventChannel() {
        return {
            Server: EventChannelServer,
            Client: EventChannelClient
        }
    }

    static {

        this.ActiveObject =
            /**
             * @template T
             * @extends soul.jsonrpc.ActiveObjectSource<T>
             */
            class ActiveObject extends CleanEventTarget {

                /**
                 * This initializes an object that can be used on the frontend, like it was there.
                 * A consumer can call any of the functions on the object
                 * @param {T} object 
                 * @param {ActiveObjectConfig} config 
                 */
                constructor(object, config = {}) {
                    super()
                    this[activeObjectConfig] = config
                    this[activeObjectID] = uuid()

                    // Let's make sure the active object lives only for a short short time
                    // for the sake of saving memory
                    let timeoutKey;
                    const setDestroy = () => {
                        clearTimeout(timeoutKey)
                        timeoutKey = setTimeout(() => {
                            this.dispatchEvent(new CustomEvent('destroy'))
                            this.cleanup()
                        }, config.timeout || 2 * 60 * 60 * 1000)
                    }

                    /** @type {(event: "destroy", cb: (event: CustomEvent)=> void, opts: AddEventListenerOptions )=> void} */ this.addEventListener


                    // Let's make sure every operation performed on the ActiveObject extends
                    // it's life
                    this[activeObjectData] = new Proxy(object, {
                        get: (target, property, receiver) => {
                            setDestroy()
                            return Reflect.get(target, property, receiver)
                        },
                        set: (target, property, value, receiver) => {
                            setDestroy()
                            return Reflect.set(target, property, value, receiver)
                        },
                        apply: (target, thisArg, argArray) => {
                            setDestroy()
                            return Reflect.apply(target, thisArg, argArray)
                        }
                    })

                }

                /**
                 * This method returns the data in an active object
                 * @param {JSONRPC.ActiveObject<T>} activeObject 
                 * @returns {T}
                 */
                static getData(activeObject) {
                    return activeObject[activeObjectData]
                }

                /**
                 * This method returns the configuration data in an active object
                 * @param {ActiveObject<T>} activeObject 
                 * @returns {T}
                 */
                static getConfig(activeObject) {
                    return activeObject[activeObjectConfig]
                }

                /**
                 * This method returns the id of an active object
                 * @param {ActiveObject<T>} activeObject 
                 * @returns {T}
                 */
                static getId(activeObject) {
                    return activeObject[activeObjectID]
                }


                /**
                 * This method returns the parts of an active object that do not change.
                 * 
                 * The parts that can be safely transmitted to the client
                 * @param {ActiveObject} object0 
                 * @returns {object}
                 */
                static getStaticData(object0) {
                    const object = object0 instanceof ActiveObject ? ActiveObject.getData(object0) : object0
                    function isSafe(item) {
                        const type = typeof item
                        return type !== 'function' && type !== 'bigint'
                    }
                    if (isSafe(object)) {
                        return object
                    }

                    if (typeof object == 'object') {
                        const safe = {}

                        for (const key of Reflect.ownKeys(object)) {
                            if (isSafe(object[key])) {
                                safe[key] = object[key]
                            }
                            if (typeof object[key] === 'object') {
                                safe[key] = this.computeActiveStatic(object[key])
                            }
                        }

                        return safe
                    }
                }
            }
    }


}

const activeObjectData = Symbol()
const activeObjectConfig = Symbol()
const activeObjectID = Symbol()