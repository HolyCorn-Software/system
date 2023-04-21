/**
 * Copyright 2023 HolyCorn Software
 * The Soul System
 * The json-rpc module
 * This module is part of the json-rpc module, and is the heart of every JSONRPC object
 */

import JSONRPC from "../json-rpc.mjs";
import TransmissionManager from "./transmission.mjs";
import uuid from '../../../uuid/v4.js'


export class JSONRPCManager extends EventTarget {


    /**
     * 
     * @param {JSONRPC} json_rpc 
     */
    constructor(json_rpc) {
        super();

        this.json_rpc = json_rpc

        this.transmission = new TransmissionManager(this)
    }


    /**
     * This method is called when data comes into the manager.
     * @param {JSONRPCMessage} object 
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


            for (let i = 0; i < parts.length; i++) {
                method = method?.[parts[i]]
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
                if (this.json_rpc.flags.first_arguments) {
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
                if (object.return.type === 'data') {  //Straightforward
                    this.dispatchEvent(new CustomEvent(`resolve-${object.return.message}`, { detail: object.return.data }))
                }
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

                                //Let's wait for reply to this packet
                                manager.addEventListener(`loop-result-${id}`,
                                    onLoopResult,
                                    { once: true }
                                );

                                let timeout = setTimeout(() => {
                                    reject(new Error(`Timeout in loop`))
                                    cleanup()
                                }, manager.json_rpc.flags.timeouts.loop)

                                const cleanup = () => {
                                    clearTimeout(timeout)
                                    manager.removeEventListener(`loop-result-${id}`, onLoopResult)
                                }

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
