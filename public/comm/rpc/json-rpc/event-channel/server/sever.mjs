/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * The json-rpc/event-channel module is responsible for maintaining persistent connection between
 * the client, and the server, so that the server can inform a wide set of clients
 * This module (server), is responsible for the server-side logic of this event-channel module.
 */

import CleanEventTarget from "../../clean-event-target.mjs"
import JSONRPC from "../../json-rpc.mjs"
import EventChannelPublicMethods from "./public.mjs"


const clients = Symbol()
const publicMethods = Symbol()

export const internal = Symbol()
const internalInterface = Symbol()
const getClients = Symbol()
const operations = Symbol()




/**
 * @template RegistrationData The format of data needed by the client to register
 * @template ClientRemoteInterface
 */
export default class EventChannelServer extends CleanEventTarget {


    constructor() {

        super();

        /** @type {import("./types").ClientTable} */
        this[clients] = {};

        /** @type {(event: "client-add"|"client-destroy", cb: (event: CustomEvent<{client: JSONRPC, ids: string[]}>)=> void )=> void} */ this.addEventListener

        /**
         * @type {({input: any[], abortable: boolean, abort: ()=> void, promise: Promise<void>})[]}
         */
        this[operations] = []

    }


    /**
     * @override
     * This method should be overridden, so that when a client registers, the client's
     * registration data is passed in. The method should return an array of ids, to be used
     * to identify the client with.
     * Subsequently, if events are dispatched for any of the ids, the client will receive it.
     * @param {object} param0
     * @param {RegistrationData} param0.data 
     * @param {JSONRPC} param0.client
     * @returns {Promise<string[]>}
     */
    async register({ data, client }) {
        throw new Error(`Please override this method`)
    }

    /**
     * @returns {EventChannelPublicMethods<RegistrationData>}
     * Use this interface to provide public methods through which clients
     * can register for events
     */
    get public() {
        return this[publicMethods] ||= new EventChannelPublicMethods(this)
    }


    /**
     * This method adds ids to the list of ids used to reach an id.
     * 
     * This means that each of the new ids could be used in place of the specified id,
     * to reach the client
     * @param {string} id 
     * @param {string[]} ids 
     * @returns {void}
     */
    async addIDs(id, ids) {
        const clientRpcs = this[clients][id];
        new Set(clientRpcs).forEach(client => this[internal].addClient(ids, client))
    }
    /**
     * This method is used to remove a single id. 
     * No user will be reachable via that id
     * @param {string} id 
     * @returns {void}
     */
    async removeID(id) {
        delete this[clients][id]
    }
    /**
     * This method gets a list of clients 
     * @param {string[]} ids 
     * @param {string[]} exclude
     */
    [getClients](ids, exclude) {
        /** @type {Set<JSONRPC>} */
        const clientList = new Set()
        // Extract all clients that will be informed
        for (const id of ids) {
            if (this[clients][id]) {
                for (const client of this[clients][id]) {
                    if ((exclude?.length ?? 0) == 0 || exclude.every(id => this[clients][id] != client)) {
                        clientList.add(client)
                    }
                }
            }
        }
        return [...clientList]
    }

    /**
     * This method is used to inform various clients of an event
     * @param {string[]} ids 
     * @param {CustomEvent} event
     * @param {soul.comm.rpc.event_channel.ClientOptions} options
     * @returns {Promise<void>}
     */
    async inform(ids, event, options) {
        this.clients(ids, { timeout: 5000, aggregation: { timeout: 2000 }, retryDelay: 250, retries: 3, expectedClientLen: 2, precallWait: 1000, noError: true, ...options }).$rpc.events.emit(
            event.type,
            event.detail
        )


    }

    /**
     * This method returns only the ids that have actively have events being channeled 
     * to them
     * @param {string[]} ids 
     * @returns {string[]}
     */
    filterByActive(ids) {

        return ids.filter(id => (typeof this[clients][id]) !== 'undefined')
    }

    get [internal]() {
        if (this[internalInterface]) {
            return this[internalInterface]
        }
        return this[internalInterface] = {
            /**
             * This method is used internally, to add clients
             * @param {string[]} ids 
             * @param {JSONRPC} client 
             */
            addClient: (ids, client) => {
                let changed = false;

                for (const id of ids) {
                    const array = this[clients][id] ||= []
                    if (array.findIndex(cl => cl == client) == -1) {
                        array.push(client)
                        changed = true
                    }
                }
                if (!changed) {
                    return;
                }

                client.addEventListener('destroy', () => {
                    // Remove all ids associated with this client
                    for (const id of ids) {
                        this[clients][id] = this[clients][id].filter(x => x !== client)// And remove redudancy

                        // Be memory efficient
                        if (this[clients][id].length == 0) {
                            delete this[clients][id]
                        }
                    }

                    this.dispatchEvent(new CustomEvent('client-add', { detail: { client, ids } }))

                });

                this.dispatchEvent(new CustomEvent('client-add', { detail: { client, ids } }))
            }
        }

    }


    /**
     * This method gets a handle to client with some given parameters
     * @param {string[]} ids ID of the client to be reached
     * @param {soul.comm.rpc.event_channel.ClientOptions} options Parameters controlling how the function call will be made
     * @returns {soul.comm.rpc.event_channel.MassCallInterface<ClientRemoteInterface>}
     */
    clients(ids, options) {
        return new ClientsRemoteProxy(undefined, options, ids, this)
    }


    static get PublicMethods() {
        return EventChannelPublicMethods
    }

}


class ClientsRemoteProxy {

    /**
     * 
     * @param {object} path 
     * @param {soul.comm.rpc.event_channel.ClientOptions} options
     * @param {string[]}  ids
     * @param {EventChannelServer} server
     */
    constructor(path, options, ids, server) {

        return new Proxy(() => undefined, {
            get: (_target, property, receiver) => {
                return new ClientsRemoteProxy(path ? `${path}.${property}` : property, options, ids, server)
            },
            /**
             * 
             * @param {any} target 
             * @param {any} thisArg 
             * @param {any[]} argArray 
             * @returns {soul.comm.rpc.event_channel.MassCallReturns<any>}
             */
            apply: async (_target, thisArg, argArray) => {

                const stack = new Error().stack.split('\n').slice(2).join('\n')

                const abortController = new AbortController()
                let internallyAborted = false;

                const callStatus = {
                    abortable: true,
                    abort: () => {
                        internallyAborted = true
                        abortController.abort({ internalAbort: true })
                    },
                    input: argArray,
                    promise: undefined
                }



                /**
                 * This function returns a similar operation, which is already ongoing, which can be done in exchange for this one.
                 */
                function getSimilarOperation() {
                    function equal(a, b) {
                        if ((a instanceof Event) && (b instanceof Event)) {
                            if (a.type == b.type) {
                                return ((!options.aggregation.sameData) || equal(a.detail, b.detail))
                            }
                            return false
                        }

                        return (a == b) || (JSON.stringify(a) == JSON.stringify(b))
                    }
                    return server[operations].find(x => equal(x.input, argArray))
                }

                if (options?.aggregation) {
                    // If there's already another call in the pipeline, abort it (if it's abortable)


                    const currentOperation = getSimilarOperation()
                    if (currentOperation) {
                        // If there's another similar operation, which is not abortable, then let's take it's results to be ours
                        if (!currentOperation.abortable) {
                            if (!(options.aggregation?.allowDuplicate ?? true)) {
                                return currentOperation.promise
                            }
                        } else {
                            console.trace(`Calling an abort() somehow internally.`)
                            currentOperation.abort()
                        }
                    }

                    // Now, wait for any other similar operation to abort this
                    const localAbort = new AbortController()
                    await new Promise((resolve) => {
                        setTimeout(() => localAbort.abort(), options.aggregation?.timeout || 500)
                        localAbort.signal.addEventListener('abort', resolve, { once: true })
                        abortController.signal.addEventListener('abort', () => localAbort.abort(), { once: true, signal: localAbort.signal })
                    })

                    if (abortController.signal.aborted) {
                        return // During our aggregation, some other operation canceled this one.
                    }
                }


                const destroy = () => {
                    server[operations] = server[operations].filter(x => x != callStatus)
                    abortController.signal.removeEventListener('abort', destroy)
                }


                // Put this in the list of current server operations, so that it can be canceled
                server[operations].push(callStatus)

                abortController.signal.addEventListener('abort', destroy, { once: true })

                try {
                    return await makeCall()
                } catch (e) {
                    if (e.internallyAborted) {
                        console.log(`The operation was aborted internally`)
                        return {}
                    }
                    throw e
                }


                async function makeCall() {

                    // Now, let's deal with client acquisition first
                    async function findClients(id) {
                        const start = Date.now()
                        let clients;
                        const timeoutDuration = options.precallWait || 500
                        while ((clients = server[getClients]([id], options.exclude || [])).length < (options.expectedClientLen || 2) && !abortController.signal.aborted) {
                            // Wait for the clients to be available
                            // To prevent constant checks every 100ms, we have also made 
                            // the server wait for at least, x milliseconds, 1/10th <= x <= 500
                            await new Promise(x => {
                                const cleanup = () => {
                                    x()
                                    clearTimeout(timeoutKey)
                                }
                                let timeoutKey = setTimeout(cleanup, Math.floor(Math.min(Math.max(100, timeoutDuration / 10), 500)))
                            })
                            if (abortController.signal.aborted) {
                                const error = new Error(`Operation ${path}(), aborted\n${stack}\nStack:\n`)
                                error.internallyAborted = internallyAborted
                                error.ignore = true;
                                throw error
                            }
                            if (Date.now() - start > timeoutDuration) {
                                break
                            }
                        }
                        return clients
                    }

                    /**
                     * This method calls the function on a single client
                     * @param {JSONRPC} client 
                     * @returns {Promise<void>}
                     */
                    function callClient(client) {
                        return soulUtils.callWithRetries(
                            // TODO: Find a way to pass the abort signal, so that a call operation
                            // may be aborted right at the level of JSONRPC
                            async () => {
                                try {
                                    return await Reflect.apply(client.remote[path], thisArg, [...argArray,])
                                } catch (e) {
                                    throw e
                                }
                            },
                            {
                                label: `${path}\nWith args ${JSON.stringify(argArray)}`,
                                callInterval: options.retryDelay,
                                maxTries: options.retries,
                                timeout: options.timeout,
                            }
                        )
                    }

                    /** @type {Promise[]} */
                    const adultPromises = []

                    /**
                     * @type {([string, Promise])[]}
                     */
                    const results = Object.fromEntries(ids.map(id => {
                        return [
                            id,
                            (async () => {

                                try {
                                    const theClients = await findClients(id)
                                    if (abortController.signal.aborted) {
                                        return;
                                    }
                                    callStatus.abortable = false
                                    return theClients.map(
                                        client => {
                                            const promise = new Promise((resolve, reject) => {
                                                const onAbort = () => {
                                                    cleanup()
                                                    reject(new Error(`Operation aborted.`))
                                                }
                                                const cleanup = () => {
                                                    resolve()
                                                }
                                                abortController.signal.addEventListener('abort', onAbort, { once: true })

                                                callClient(client).then((value) => {
                                                    resolve(value)
                                                    cleanup()
                                                }).catch(e => {
                                                    reject(e)
                                                    cleanup()
                                                })
                                            })

                                            adultPromises.push(promise)
                                            if (options.noError) {
                                                promise.catch(() => undefined)
                                            }
                                            promise.finally(() => {
                                                promise.done = true

                                                if (findPhaseDone && adultPromises.every(prom => prom.done)) {
                                                    callStatus.abort()
                                                }

                                            })
                                            return promise
                                        }
                                    )

                                } catch (e) {
                                    if (e.internallyAborted && findPhaseDone) {
                                        // No need to throw this error, because our main goal of throwing "internallyAborted" errors, is so that the higher logic knows when it's time to stop
                                        // Apparently, by  now, it should have stopped

                                        return;
                                    }

                                    console.log(`e.internallyAborted `, e.internallyAborted)

                                    throw e
                                }

                            })()
                        ]
                    }))


                    /* This promise tracks whether the phase where we simply look for clients, is done.*/
                    const findPhasePromise = Promise.all(Object.entries(results).map(x => x[1][1]))
                    let findPhaseDone = false
                    findPhasePromise.finally(() => findPhaseDone = true)


                    callStatus.promise = (async () => {

                        // We need to manage this task's promise in such a way that interrupting the task would simply make the task
                        // wait for another similar task

                        const catchInterrupted = async () => {


                            try {
                                // After this phase, we can tell if the operation was internally aborted at any level.
                                await findPhasePromise
                            } catch (e) {
                                if (e.internallyAborted) {
                                    // And if so, then return the data coming from the overriding task
                                    return await getSimilarOperation().promise
                                } else {
                                    throw e
                                }

                            }

                        }


                        // Well, if the first whole promise completes without an error
                        await catchInterrupted()

                        // Then we can go ahead to return things as they should

                        return results

                    })();



                    return callStatus.promise
                }
            }
        })

    }

}
