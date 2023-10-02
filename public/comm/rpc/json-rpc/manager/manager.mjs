/**
 * Copyright 2023 HolyCorn Software
 * The Soul System
 * The json-rpc module
 * This module is part of the json-rpc module, and is the heart of every JSONRPC object
 */

import JSONRPC from "../json-rpc.mjs";
import TransmissionManager from "./transmission.mjs";
import uuid from '../../../uuid/uuid.mjs'
import CleanEventTarget from "../clean-event-target.mjs";


export class JSONRPCManager extends CleanEventTarget {


    /**
     * 
     * @param {JSONRPC} json_rpc 
     */
    constructor(json_rpc) {
        super();

        this.json_rpc = json_rpc

        this.transmission = new TransmissionManager(this)

        this.json_rpc.addEventListener('destroy', () => {
            this.cleanup()
        })
    }


    /**
     * This method is called when data comes into the manager.
     * @param {import("../types").JSONRPCMessage} object 
     */
    async accept(object) {

        if (!this.transmission.accept(object)) {
            return
        }

        //Determining if this is a return message, or a request
        if (typeof object.call !== 'undefined') {
            //Then its a call

            //Now, since we are dealing with nested properties, let's go down object by object
            let parts = object.call.method.split(/\./);
            let method = this.json_rpc.stub;
            let lastPart = this.json_rpc.stub;


            let isInternal;

            for (let i = 0; i < parts.length; i++) {
                if (i == 0 && parts[i] === '$rpc') {
                    method = this.json_rpc.$rpc
                    lastPart = this.json_rpc
                    isInternal = true;
                } else {
                    method = method?.[parts[i]]
                }

                if (i < parts.length - 1) {
                    lastPart = lastPart?.[parts[i]]
                }
            }

            // First see if the method that is to be called even exists
            if (typeof method === 'undefined') {
                //If not, then its an error
                this.transmission.sendError(
                    {
                        stack: `The method ${object.call.method} was not found.`,
                        message: `The method ${object.call.method} was not found.`,
                    },
                    object
                )

                return
            }
            try {
                let args = []
                // Exclude the first argument of all function calls, from the internal function calls.
                if (this.json_rpc.flags.first_arguments && !isInternal) {
                    args.push(...this.json_rpc.flags.first_arguments)
                }
                args.push(...object.call.params)
                if (typeof method !== 'function') {
                    throw { stack: `${object.call.method} is not a function.` }
                }

                let promise = method?.apply(lastPart, args)

                //Now, wait for when

                /** @type {AsyncGenerator} */
                const result = await promise ?? null;

                //If the method is a loop, let's provide a way to loop
                const AsyncGenerator = Reflect.getPrototypeOf((async function* () { })()).constructor
                const Generator = Reflect.getPrototypeOf((function* () { })()).constructor
                const ResultPrototypeConstructor = (typeof result === 'object') && result !== null ? Reflect.getPrototypeOf(result)?.constructor : undefined

                if ((ResultPrototypeConstructor === Generator) || (ResultPrototypeConstructor === AsyncGenerator)) {
                    this.transmission.startLoopReply(result, object)
                } else if (result instanceof JSONRPC.ActiveObject) {
                    this.transmission.activeObjectReply(result, object)
                    const id = JSONRPC.ActiveObject.getId(result);
                    this.json_rpc.$rpc.activeObject[id] = JSONRPC.ActiveObject.getData(result)
                    const abort = new AbortController()
                    const ondestroy = () => {
                        delete this.json_rpc.$rpc.activeObject[id]
                        abort.abort()
                    }
                    result.addEventListener('destroy', ondestroy, { once: true, signal: abort.signal })
                    this.json_rpc.addEventListener('destroy', ondestroy, { once: true, signal: abort.signal })
                } else {
                    this.transmission.dataReply(result, object)
                }

                // Let's inform our internal guys, that everything is good, so no need for a resend
                this.dispatchEvent(new CustomEvent(`resolve-${object.id}`, { detail: result }))

            } catch (e0) {

                //Let's inform our internal listeners, that the method failed, so no need to resend responses
                this.dispatchEvent(new CustomEvent(`reject-${object.id}`))

                e0.stack = !e0.stack ? e0.stack : `${e0.stack}\n\n\t${'Remote Call stack'.magenta}\n${object.call.stack || ''}`
                let e = e0.handled ? e0 : this.json_rpc.flags.error_transform(e0, object.call.method, object.call.params)
                e.handled = true

                if (!this.json_rpc.flags.expose_stack_traces) {
                    e.stack = '';
                }

                this.transmission.sendError(e, object)
            }

            return;
        }


        //Well, but if its the returns of a method that was called

        if (typeof object.return?.error != 'undefined') {
            this.dispatchEvent(new CustomEvent(`reject-${object.return.message}`, { detail: object.return.error }))
        } else {
            if (typeof object.return != 'undefined') {

                if (object.return.type === 'loop') {
                    //Now, let's fabricate a generator, that continuously fetches the data remotely
                    const manager = this
                    const gen = async function* () {
                        while (true) {
                            const id = uuid();
                            // Send a packet requesting for loop data
                            manager.transmission.doOutput(
                                {
                                    jsonrpc: '3.0',
                                    id,
                                    loop: {
                                        request: {
                                            message: object.id,
                                        },
                                    },
                                }
                            );

                            let done;

                            const chunk = await new Promise((resolve, reject) => {
                                /**
                                 * This function is called when the results are available
                                 * @param {CustomEvent<JSONRPCMessage>} event 
                                 */
                                const onLoopResult = (event) => {
                                    if (event.detail.loop.output.error) {
                                        reject(event.detail.loop.output.error)
                                        done = true
                                    } else {
                                        done = event.detail.loop.output.done;
                                        resolve(event.detail.loop.output.data)
                                    }
                                    cleanup()
                                };

                                let timeout = setTimeout(() => {
                                    reject(new Error(`Timeout in loop`))
                                    cleanup()
                                }, manager.json_rpc.flags.timeouts.loop)

                                const cleanup = () => {
                                    clearTimeout(timeout)
                                    manager.removeEventListener(`loop-result-${id}`, onLoopResult)
                                }

                                //Let's wait for reply to this packet
                                manager.addEventListener(`loop-result-${id}`,
                                    onLoopResult,
                                    { once: true, cleanup }
                                );


                            })

                            for (const item of chunk || []) {
                                yield item
                            }
                            if (done) {
                                return;
                            }
                        }
                    }

                    this.dispatchEvent(new CustomEvent(`resolve-${object.return.message}`, { detail: gen() }))
                }
                if (object.return.type === 'data') {

                    if (object.activeObjectID) {
                        // When the object returned is an ActiveObject 
                        // An active object can be contain methods which can be invoked remotely
                        this.dispatchEvent(
                            new CustomEvent(`resolve-${object.return.message}`, {
                                detail: new ActiveObjectConsumer(
                                    object.return.data,
                                    object.activeObjectID,
                                    this.json_rpc
                                )
                            })
                        )
                    } else {


                        // Okay, so if the data is something to be cached, let's do as expected
                        if (object.return.cache) {
                            this.dispatchEvent(new CustomEvent(`cache-${object.return.message}`, { detail: object.return }))
                        }

                        //Straightforward
                        this.dispatchEvent(new CustomEvent(`resolve-${object.return.message}`, { detail: object.return.data }))

                    }
                }

            }
        }

        if (object.loop?.output) {
            this.dispatchEvent(
                new CustomEvent(`loop-result-${object.loop.output.message}`, { detail: object })
            );
        }

        if (object.loop?.request?.message) {
            this.dispatchEvent(
                new CustomEvent(`loop-request-${object.loop.request.message}`, { detail: object })
            );
        }

        // If it is the acknowledgment of a function call, or a 
        if (typeof object.ack !== 'undefined') {

            (object.ack.ids || []).forEach(
                id => {
                    this.dispatchEvent(new CustomEvent(`ACK-${id}`))
                }
            )
        }
    }


}


class ActiveObjectConsumer {

    /**
     * This is the representation of an ActiveObject on the receiving end
     * @param {object} data 
     * @param {string} path
     * @param {JSONRPC} jsonrpc
     */
    constructor(data, path, jsonrpc) {

        return new Proxy(() => undefined, {
            get: (target, property, receiver) => {
                if (property in data) {
                    return Reflect.get(data, property, receiver)
                }
                if (typeof property === 'symbol' || property === 'then') {
                    return undefined
                }
                return new ActiveObjectConsumer(data, `${path}.${property}`, jsonrpc)
            },
            apply: (target, thisArg, argArray) => {
                return Reflect.apply(jsonrpc.remote.$rpc.activeObject[path], thisArg, argArray)
            },
            set: (target, property, value, receiver) => {
                throw new Error(`Sorry, it's not possible to set anything on an ActiveObject`)
            }
        })

    }

}