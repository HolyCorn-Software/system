/**
 * Copyright 2023 HolyCorn Software
 * The Soul System
 * The json-rpc module
 * This submodule (remote) deals with the details of making remote methods look present,
 * as well as providing methods that can be remotely invoked
 * 
 * It interacts with the TransmissionManager, to receive data about function calls,
 * execute them, and then respond to the manager about them
 */

import { JSONRPCManager } from "./manager/manager.mjs";

import uuid from './uuid.mjs'
import JSONRPC from "./json-rpc.mjs";

const callPromises = Symbol()



export default class JSONRPCRemote {

    /**
     * 
     * @param {JSONRPCManager} manager 
     * @returns {Proxy<JSONRPC>}
     */

    constructor(manager) {

        let getter_stack = /^ *(.+)/s.exec(new Error().stack.split('\n').slice(3,).join('\n'))[1]

        manager[callPromises] = {}


        return new Proxy({}, {

            /**
             * 
             * @param {JSONRPC} target 
             * @param {string} property 
             * @returns {Promise<function>}
             */
            get: (target, property) => {
                if (property === 'then') {
                    // console.trace('NO to await')
                    return undefined;
                }

                // Here, we are returning a function that when it gets called, the remote
                // object will receive the request to call the same function
                // The mechanism is to establish a message to be sent to the remote destination
                // Then keep a promise that will be fulfilled when the response comes back

                return new JSONRPCRemoteObject(property, manager, { stack: getter_stack })
            }
        })

    }

}


/**
 * This represents an object that's residing remotely
 * This class allows that we can have nested properties, without ever remotely querrying them
 * Instead of the simple model of someObject.remote.hello() we can have someObject.remote.greetings.english.hello()
 */

class JSONRPCRemoteObject {

    /**
     * 
     * @param {string} methodName The name of the method that will be called
     * @param {JSONRPCManager} manager The interface for communication
     * @returns 
     */
    constructor(methodName, manager) {

        /** @type {Function<Promise<any>> | Object<string, JSONRPCRemoteObject>} */
        let proxy = new Proxy(() => 1, {

            get: (target, property) => {
                if (property === 'then') return;
                return new JSONRPCRemoteObject(`${methodName}.${property}`, manager,)
            },
            set: (target, property, value) => {
                throw new Error(`For now, we cannot yet set a property on a remote object`)
            },

            apply: function (target, _this, args) {

                if (methodName === 'toJSON') {
                    console.trace(`Why this toJSON()?`)
                    return undefined
                }

                if (methodName.endsWith('.apply')) {
                    // To make this compatible with babeljs, which takes care of older browsers
                    methodName = methodName.split('.apply')[0]
                    args = args[1]
                }

                const stack =

                    //Then the stack trace from calling this method
                    new Error().stack.split('\n').slice(6,).join('\n')

                const timeoutError = new Error(`Timeout reaching server. Could not call ${methodName}`);
                timeoutError.accidental = true
                timeoutError.donotReport = true;

                return new Promise(async (resolve, reject) => {

                    /**
                     * 
                     * @returns {Promise<void>}
                     */
                    const freshExec = () => {


                        return new Promise((ok, failed) => {

                            let id = uuid();

                            manager.transmission.doOutput(
                                {
                                    // jsonrpc: '3.0',
                                    id,
                                    call: {
                                        method: methodName,
                                        params: args.length == 0 ? undefined : args,
                                        // stack: manager.json_rpc.flags.expose_stack_traces ? stack : undefined
                                    },
                                }
                            );


                            //What happens when the response has been given ?
                            const onResolve = function ({ detail: result }) {
                                cleanup()
                                ok(result)
                            }

                            manager.addEventListener(`resolve-${id}`, onResolve, { once: true })

                            // What happens if the response needs to be cached
                            /**
                             * 
                             * @param {CustomEvent<import("./types.js").JSONRPCMessage['return']>} param0 
                             */
                            const onCache = ({ detail: data }) => {
                                manager.json_rpc.flags.cache?.set(methodName, args, data.data, Date.now() + data.cache.expiry, data.cache.tag)
                            }

                            manager.addEventListener(`cache-${id}`, onCache, { once: true })



                            // And what happens if it has been rejected
                            const onReject = function ({ detail: error }) {
                                if (error) {
                                    cleanup()
                                    switch (error.code) {
                                        case -32601:
                                            {
                                                let exception = new Error(`The method ${methodName} is not available!`);
                                                exception.stack = `${exception.message}\n${stack}`;
                                                console.log(exception)
                                                failed(exception)
                                                break;
                                            }

                                        default:
                                            {

                                                let exception = new Error()
                                                exception.code = error.code
                                                exception.id = error.id
                                                exception.message = `${error.message}`
                                                exception.stack = `${error.stack || ''}\n${stack}`;
                                                exception.handled = error.handled
                                                failed(exception);
                                            }
                                    }
                                    return;
                                }
                                failed('unknown error')
                            }
                            manager.addEventListener(`reject-${id}`, onReject, { once: true });

                            const onACK = function () {
                                clearTimeout(timeout)
                            }

                            manager.addEventListener(`ACK-${id}`, onACK, { once: true })


                            function cleanup() {
                                clearTimeout(timeout)
                                manager.removeEventListener(`resolve-${id}`, onResolve)
                                manager.removeEventListener(`reject-${id}`, onReject)
                                manager.removeEventListener(`ACK-${id}`, onACK)
                                manager.removeEventListener(`cache-${id}`, onCache)
                            }

                            // TODO: Implement extra tolerance, for situations where the transmission is disconnected
                            // TODO: Implement transmission cache, in order to better handle disconnections, and reconnections, without loss of information.
                            let timeout = setTimeout(() => failed(timeoutError), 30_000)


                        })


                    }

                    // Whatever the case is, let's deal with one function call at a time.

                    const pending = (manager[callPromises][methodName])
                    if (pending) {
                        try {
                            await pending
                        } finally {
                            // This random wait, is to give time for any pending call to have been cached.
                            await new Promise(x => setTimeout(x, 1000 * Math.random()))
                        }

                    }



                    const makeCall = async () => {

                        if (manager.json_rpc.destroyed) {
                            throw new Error(`Connection closed!`)
                        }

                        // First things first, is our info found in the cache?
                        let cachedData;
                        try {
                            cachedData = await manager.json_rpc.flags.cache?.get(methodName, args)

                            if (!cachedData || cachedData.expiry < Date.now()) {
                                return freshExec().then(value => {
                                    resolve(value)
                                }).catch(e => {
                                    if (e.accidental && cachedData) {
                                        return resolve(cachedData.value)
                                    }
                                    reject(e)
                                })
                            }

                            // Now, if found in the cache, we return it.
                            resolve(cachedData.value)

                        } catch {
                            freshExec().then(resolve, (error) => {
                                if (error?.code == 'system' || error == timeoutError) {
                                    console.warn(`${timeoutError ? 'Time out' : 'System'} Error when calling ${methodName}, so we returned cached data`)
                                    resolve(cachedData.value)
                                }

                            })
                        }

                    }


                    try {
                        return await (manager[callPromises][methodName] = makeCall())
                    } finally {
                        delete manager[callPromises][methodName]
                    }


                });


            }
        })

        return proxy;

    }

}

