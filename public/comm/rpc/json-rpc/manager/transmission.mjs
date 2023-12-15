/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module was extracted from the grand json-rpc module in 2023, for better efficiency
 * 
 * This module (transmission), is responsible for managing pending calls, and acknowledgments
 */

import { JSONRPCManager } from "./manager.mjs";
import uuid from '../../../uuid/uuid.mjs'
import DelayedAction from "../../../../html-hc/lib/util/delayed-action/action.mjs";
import JSONRPC from '../json-rpc.mjs'

const ACK_QUEUE = Symbol(`ACK_QUEUE`)
const PENDING_CALLS = Symbol(`PENDING_CALLS`)
const ACK_TASK = Symbol(`ACK_TASK`)
const ACK_TIMEOUT = Symbol(`ACK_TIMEOUT`)
const ON_OUTPUT = Symbol()
const OUTBOUND_CALLS = Symbol()


export default class TransmissionManager {


    /**
     * @param {JSONRPCManager} manager
     */
    constructor(manager) {


        /** @type {import("./types.js").ACKTask} */ this[ACK_TASK];

        this.manager = manager;

        /** @type {string[]} a list of acknowledgements that need to be made */ this[ACK_QUEUE] = [];


        /** @type {string[]} Contains a list of id's of the last 512 function calls. This helps prevent double calling of a function, all in the name of transmission error */
        this[PENDING_CALLS] = new Proxy([], {

            set: (target, property, value) => {
                Reflect.set(target, property, value);
                if (target.length > 512) {
                    target.shift();
                }
                return true;
            }

        });

        /** @type {string[]} Calls that are going to the server */
        this[OUTBOUND_CALLS] = [];

        /** @type {function(JSONRPCMessage)} This method is used internally to prepare data and eventually send it*/ this[ON_OUTPUT]
        Object.defineProperty(this, ON_OUTPUT, {
            value: (d) => {
                let error = new Error();
                try {
                    if (!this.manager.json_rpc.ondata) {
                        return console.trace('JSON RPC did not respond to a request because this.ondata was not defined')
                    }
                    this.manager.json_rpc.ondata(JSON.stringify(d) + '\n') //This is to avoid conflicts (when two processes transmit at the same time and the JSON concatenates to something unwanted.)
                } catch (e) {

                    console.log(`JSONRPC Unexpected Error\n${e.stack || e.message || e}\nStack: ${error.stack}`, d)
                    throw e
                }
            }
        })
    }

    /**
     * This method is used to send acknowledgement of a function call, or a return
     * @param {string} callID 
     * @returns {void}
     */
    sendACK(callID) {

        this[ACK_QUEUE].push(callID)


        if (!this[ACK_TASK]) {

            this[ACK_TASK] = {
                time: {
                    created: Date.now(),
                    updated: Date.now()
                }
            }
        }

        //Now, if there's already a pending ACK task, cancel it (if at all we should cancel it)

        const shouldCancel = () => (Date.now() - (this[ACK_TASK]?.time?.created || 0)) < TransmissionManager.expectedMethodTimeLocal

        if (shouldCancel()) {
            clearTimeout(this[ACK_TIMEOUT])
            this[ACK_TASK].time.updated = Date.now()
            this[ACK_TIMEOUT] = setTimeout(() => {
                //Now, if we are finally here, it is time to send acknowledgements for real
                const ids = new Set(this[ACK_QUEUE])
                this.doOutput(
                    {
                        id: uuid(),
                        // jsonrpc: '3.0',
                        ack: {
                            ids: [...ids],
                        }
                    }
                );
                // Remove the processed ACKs
                this[ACK_QUEUE] = [... new Set(this[ACK_QUEUE].filter(x => !ids.has(x)))]
            }, 150)
        }
    }
    /**
     * This method cancels the intention to send a particular ACK
     * @param {string} id 
     */
    cancelACK(id) {
        this[ACK_QUEUE] = this[ACK_QUEUE].filter(x => x !== id)
    }



    /**
     * This method is called the JSONRPC receives data, and the TransmissionManager has to process it
     * 
     * This method limits the number of pending calls, ensures that ACKs are sent
     * 
     * The return of this method tells us if the manager should process this packet or not
     * @param {JSONRPCMessage} object 
     * @returns {boolean}
     */
    accept(object) {

        if ((typeof object.call !== 'undefined') || object.loop?.request) {
            if (this[PENDING_CALLS].some(x => x === object.id)) {
                this.sendACK(object.id)
                return
            } else {
                this[PENDING_CALLS].push(object.id);
            }
        }



        // So, if the incoming message was denoting the returns of a function
        if ((typeof object.return !== 'undefined') || (object.loop?.request)) {
            //Then we can send an ACK for the message return
            this.sendACK(object.id)
            //We don't need to try re-sending this ACK because if no RETURN_ACK is received by the server, then it will re-send the return, and we will re-send an ACK
        }


        //Now, if it is a function call,
        if (typeof object.call !== 'undefined') {

            let ack_timeout;
            const events = ['resolve', 'reject']
            //First thing, send an ACK if calling this method takes more than 2s (Transmissionmanager.expectedMethodTimeLocal)


            const cleanup = (...args) => {

                //Proper clean up
                clearTimeout(ack_timeout)

                for (const event of events) {
                    this.manager.removeEventListener(`${event}-${object.id}`, cleanup)
                }
                this[PENDING_CALLS] = this[PENDING_CALLS].filter(x => x !== object.id)

            }


            for (const event of events) {
                this.manager.addEventListener(`${event}-${object.id}`, cleanup, { once: true, cleanup })
            }


            ack_timeout = setTimeout(() => {
                this.sendACK(object.id)
            }, TransmissionManager.expectedMethodTimeLocal);

        }

        return true

    }

    /**
     * This method is called internally when the JSONRPCManager wants to send some data for transmission
     * @param {import("../types.js").JSONRPCMessage} object 
     * @param {boolean} watchACK If set to true, the transmission manager will expect an ACK, and if none is sent, it will resent
     */
    async doOutput(object, watchACK) {

        let startTime = Date.now();

        // First things first, let's not overwhelm the remote party with too many function calls
        if ((typeof object.call !== 'undefined') && (this[OUTBOUND_CALLS].length > 32)) { //Let's not have too many concurrent calls
            await new Promise((done, failed) => {
                let interval = setInterval(() => {
                    if (this[OUTBOUND_CALLS].length < (this.manager.json_rpc.flags?.max_outbound_calls ?? Infinity)) {
                        done();
                        clearInterval(interval);
                    }
                    setTimeout(() => {
                        failed(new Error(`Timeout reaching server. We waited for the previous outbound calls to complete, but they didn't`))
                        clearInterval(interval)
                    }, 2000)
                }, 2)
            })
        }


        //Then, transmit the data, before we continue
        try {
            this[ON_OUTPUT](object);
        } catch (e) {
            const error = new Error(`Please, check your internet connection.`)
            error.cause = e
            error.accidental = true
            throw error
        }


        //Now, if what we just sent was a function call, we should be receiving an ACK, a resolve, or a reject in less than 5s
        if (watchACK || (typeof object.call !== 'undefined') || (typeof object.return !== 'undefined')) {
            const isCall = (typeof object.call !== 'undefined')
            if (object.call) {
                this[OUTBOUND_CALLS].push(object.id)
            }

            new Promise((resolve, reject) => {

                // We may not require an ACK if the message is a function call
                // In that case, if a resolve, or a reject comes, we'll accept it
                const events = ['ACK', ... (isCall ? ['resolve', 'reject',] : [])]

                const cleanup = (...args) => {

                    let endTime = Date.now();

                    resolve(...args);

                    //Proper clean up

                    //Stop waiting for the events we've been watching for
                    for (const event of events) {
                        this.manager.removeEventListener(`${event}-${object.id}`, cleanup)
                    }
                    if (isCall) {
                        this[OUTBOUND_CALLS] = this[OUTBOUND_CALLS].filter(x => x !== object.id);
                    }

                    //Done with cleanup

                    //Now, just some vital information on how long the method took
                    let duration = endTime - startTime;
                    if (isCall) {
                        if (duration > 25) {
                            // console.log(`${object.call.method} took ${endTime - startTime}ms`)
                        }
                    }
                }

                for (const event of events) {
                    this.manager.addEventListener(`${event}-${object.id}`, cleanup, { once: true, cleanup })
                }
                setTimeout(reject, TransmissionManager.expectedMethodTimeRemote)

            }).catch(() => {
                //Now that no ACK was received, and we have neither a resolve or a reject, then well, the server didn't see the message
                resend()
            })
        }

        // And if we are sending data about the returns of a function call
        // Then we keep our eyes open for acknowledgement of the returns

        const resend = () => {
            //Resend, but have a limit to the resending
            object.resends ??= 0
            if ((object.resends++) > 3) {
                return;
            }
            this[ON_OUTPUT](object);
        }

    }

    /**
     * This method starts listening to queries for items in the loop, and responding to them
     * 
     * @param {AsyncGenerator} result 
     * @param {JSONRPCMessage} packet 
     * 
     */
    startLoopReply(result, packet) {


        const id = uuid();

        // Loop being returned
        this.doOutput(
            {
                // jsonrpc: '3.0',
                id: id,
                return: {
                    type: 'loop',
                    // method: packet.call.method,
                    message: packet.id
                }
            }
        );

        /**
         * In case a request timed out waiting for a previous iteration to complete.
         * This variable maintains a single instance of the generator, such that any subsequent iteration would be serialized.
         * Therefore, data won't be lost.
         */
        let lastIterationPromise;

        // Now, since we have told the client that the data is a loop, let's wait for when he requests data
        // Also, the loop should be destroyed after 24 hours, or when we've reached it's end
        /**
         * This method is called each time the client requests for more loop data
         * @param {CustomEvent<import("../types.js").JSONRPCMessage>} event 
         */
        const respondLoop = async (event) => {
            try {

                const buffer = []
                let done;

                while (!done) {

                    // Wait till there's sufficient data for transmission, for a maximum of 500ms

                    const timeoutSymbol = Symbol()

                    const valuePromise = lastIterationPromise || result.next();
                    let next = await Promise.race([
                        valuePromise,
                        new Promise(resolve => {
                            setTimeout(() => resolve(timeoutSymbol), 500)
                            lastIterationPromise = valuePromise
                        })
                    ])

                    if (next === timeoutSymbol) {
                        break;
                    }

                    lastIterationPromise = undefined

                    if (!(done = next.done)) {
                        buffer.push(next.value)
                    }
                    //Now, we can interrupt the looping, if the buffer is too large (>20KB)
                    if (JSON.stringify(buffer).length > (20 * 1024)) {
                        break;
                    }
                }


                this.doOutput(
                    {
                        id: uuid(),
                        // jsonrpc: '3.0',
                        loop: {
                            output: {
                                data: buffer,
                                done,
                                message: event.detail.id
                            }
                        }
                    },
                    true
                );

                if (done) {
                    destroy()
                }

            } catch (e) {
                const err = this.manager.json_rpc.flags.error_transform(e, packet.call.method, packet.call.params);
                this.doOutput(
                    {
                        id: uuid(),
                        // jsonrpc: '3.0',
                        loop: {
                            output: {
                                error: { ...err, stack: err.stack, message: err.message, name: err.name },
                                done: true,
                                message: event.detail.id
                            }
                        }
                    }
                )
            }


        }


        let destroyed;
        const destroy = () => {
            if (destroyed) {
                return;
            }
            destroyed = true
            clearTimeout(autoDestroyTimeout)
            result.return()
            this.manager.removeEventListener(`loop-request-${id}`, respondLoop)
            /**
             * This method is called for each additional request after the loop has been destroyed
             * @param {CustomEvent<JSONRPCMessage>} event 
             */
            const afterDestroy = (event) => {

                const packet = event.detail
                //Let's simply reply, saying that the loop is over
                this.doOutput(
                    {
                        // jsonrpc: '3.0',
                        id: uuid(),
                        loop: {
                            output: {
                                data: undefined,
                                done: true,
                                message: packet.id
                            }
                        }
                    }
                )
            }


            this.manager.addEventListener(`loop-request-${id}`, afterDestroy)
            //Keep the destroy response only for 60s
            setTimeout(() => this.manager.removeEventListener(`loop-request-${id}`, afterDestroy), 60_000)

            // And after destroy, cancel any auto-destroy plans
            clearTimeout(autoDestroyTimeout)

            // Also, cleanup properly
            this.manager.json_rpc.removeEventListener('destroy', destroy)
        }

        this.manager.addEventListener(`loop-request-${id}`, respondLoop)

        // auto-destroy after 24 hours
        let autoDestroyTimeout = setTimeout(destroy, 24 * 60 * 60 * 1000)

        this.manager.json_rpc.addEventListener('destroy', destroy)


    }

    /**
     * This method replies to a message, with the output of a function call
     * @param {any} result 
     * @param {JSONRPCMessage} packet 
     */
    dataReply(result, packet) {

        let data = result
        let additional

        if (JSONRPC.MetaObject.isMetaObject(result)) {
            const options = JSONRPC.MetaObject.getOptions(result)
            additional = {
                cache: options.cache,
                rmCache: options.rmCache
            }
        }


        //Normal data being returned
        this.doOutput(
            {
                // jsonrpc: '3.0',
                id: uuid(),
                return: {
                    data: data,
                    // method: packet.call.method,
                    type: 'data',
                    message: packet.id,
                    ...additional
                },
            }
        );
    }

    /**
     * 
     * @param {soul['jsonrpc']['ActiveObjectSource']} result 
     * @param {import("../types.js").JSONRPCMessage} object 
     */
    activeObjectReply(result, object) {
        this.doOutput(
            {
                // jsonrpc: '3.0',
                id: uuid(),
                return: {
                    data: JSONRPC.ActiveObject.getStaticData(result),
                    type: 'data',
                    message: object.id,
                    method: object.call.method
                },
                activeObjectID: JSONRPC.ActiveObject.getId(result),
            }
        )
    }

    /**
     * This method replies to a client with information about the error from a function call
     * @param {Error} error 
     * @param {JSONRPCMessage} packet 
     */
    sendError(error, packet) {
        this.doOutput({
            // jsonrpc: '3.0',
            id: uuid(),
            return: {
                message: packet.id,
                error: {
                    ...error, stack: error.stack, message: error.message
                },
                type: 'data'
            }
        }, true);

    }

    static get expectedMethodTimeLocal() {
        return 1500;
    }

    static get expectedMethodTimeRemote() {
        return 7500;
    }

}

