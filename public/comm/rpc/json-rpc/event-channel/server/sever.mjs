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
     */
    [getClients](ids) {
        /** @type {Set<JSONRPC>} */
        const clientList = new Set()
        // Extract all clients that will be informed
        for (const id of ids) {
            if (this[clients][id]) {
                for (const client of this[clients][id]) {
                    clientList.add(client)
                }
            }
        }
        return [...clientList]
    }

    /**
     * This method is used to inform various clients of an event
     * @param {string[]} ids 
     * @param {CustomEvent} event
     * @returns {Promise<void>}
     */
    async inform(ids, event) {
        const clientList = this[getClients](ids)
        clientList.forEach(x => {
            x.$rpc.events.dispatchEvent(
                new CustomEvent(event.type, { detail: event.detail })
            )
        })


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
     * @param {import("./types").ClientOptions} options Parameters controlling how the function call will be made
     * @returns {import("./types").MassCallInterface<ClientRemoteInterface>}
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
     * @param {import("./types").ClientOptions} options
     * @param {string[]}  ids
     * @param {EventChannelServer} server
     */
    constructor(path, options, ids, server) {

        return new Proxy(() => undefined, {
            get: (target, property, receiver) => {
                return new ClientsRemoteProxy(path ? `${path}.${property}` : property, options, ids, server)
            },
            /**
             * 
             * @param {any} target 
             * @param {any} thisArg 
             * @param {any[]} argArray 
             * @returns {import("./types").MassCallReturns<any>}
             */
            apply: async (target, thisArg, argArray) => {
                // Now, let's deal with client acquisition first

                const abortController = new AbortController()

                async function findClients(id) {
                    const start = Date.now()
                    let clients;
                    while ((clients = server[getClients]([id])).length == 0 && !abortController.signal.aborted) {
                        // Wait for the clients to be available
                        // To prevent constant checks every 100ms, we have also made 
                        // the server wait for at least, x milliseconds, 1/10th <= x <= 500
                        await new Promise(x => {
                            const cleanup = () => {
                                x()
                                clearTimeout(timeout)
                                abortController.signal.removeEventListener('abort', cleanup)
                            }
                            let timeout = setTimeout(cleanup, Math.floor(Math.min(Math.max(100, options.precallWait / 10), 500)))
                            abortController.signal.addEventListener('abort', cleanup, { once: true })
                        })
                        if (abortController.signal.aborted) {
                            throw new Error(`Operation aborted`)
                        }
                        if (Date.now() - start > options.precallWait) {
                            throw new Error(`No clients found for id ${id}`)
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
                        () => Reflect.apply(client.remote[path], thisArg, [...argArray,]),
                        {
                            label: path,
                            callInterval: options.retryDelay,
                            maxTries: options.retries,
                            timeout: options.timeout,
                        }
                    )
                }

                return Object.fromEntries(ids.map(id => {
                    return [
                        id,
                        (async () => {
                            return await (await findClients(id)).map(
                                client => new Promise((resolve, reject) => {
                                    const onAbort = () => {
                                        cleanup()
                                        reject(new Error(`Operation aborted.`))
                                    }
                                    const cleanup = () => {
                                        resolve()
                                        abortController.signal.removeEventListener('abort', cleanup)
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
                            )
                        })()
                    ]
                }))


            }
        })

    }

}
