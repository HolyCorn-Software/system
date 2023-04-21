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

import { v4 as uuid } from '../../uuid/index.js'



export default class JSONRPCRemote {

    /**
     * 
     * @param {JSONRPCManager} manager 
     * @returns {Proxy<JSONRPC>}
     */

    constructor(manager) {

        let getter_stack = /^ *(.+)/s.exec(new Error().stack.split('\n').slice(3,).join('\n'))[1]


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

                const stack =

                    //Then the stack trace from calling this method
                    new Error().stack.split('\n').slice(6,).join('\n')

                return new Promise(async (ok, failed) => {
                    let id = uuid();

                    manager.transmission.doOutput(
                        {
                            jsonrpc: '3.0',
                            id,
                            call: {
                                method: methodName,
                                params: args,
                                stack: manager.json_rpc.flags.expose_stack_traces ? stack : undefined
                            },
                        }
                    );


                    //What happens when the response has been given ?
                    manager.addEventListener(`resolve-${id}`, function ({ detail: result }) {
                        ok(result)
                    }, { once: true })


                    // And what happens if it has been rejected
                    manager.addEventListener(`reject-${id}`, function ({ detail: error }) {
                        if (error) {
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

                                        let exception = {}
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
                    }, { once: true });

                    setTimeout(() => failed(new Error(`Timeout reaching server`)), 300_000)
                });
            }
        })

        return proxy;

    }

}

