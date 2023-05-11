/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * The json-rpc/event-channel module is responsible for maintaining persistent connection between
 * the client, and the server, so that the server can inform a wide set of clients
 * This module (server), is responsible for the server-side logic of this event-channel module.
 */

import JSONRPC from "../../json-rpc.mjs"
import EventChannelPublicMethods from "./public.mjs"


const clients = Symbol()
const publicMethods = Symbol()

export const internal = Symbol()
const internalInterface = Symbol()

/**
 * @template RegistrationData The format of data needed by the client to register
 */
export default class EventChannelServer {


    constructor() {

        /** @type {import("./types").ClientTable} */
        this[clients] = {}

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
     * This method is used to inform various clients of an event
     * @param {string[]} ids 
     * @param {CustomEvent} event
     * @returns {Promise<void>}
     */
    async inform(ids, event) {
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
            object: this,
            /**
             * This method is used internally, to add clients
             * @param {string[]} ids 
             * @param {JSONRPC} client 
             */
            addClient(ids, client) {
                let changed = false;

                for (const id of ids) {
                    const array = this.object[clients][id] ||= []
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
                        this.object[clients][id] = this.object[clients][id].filter(x => x !== client)// And remove redudancy

                        // Be memory efficient
                        if (this.object[clients][id].length == 0) {
                            delete this.object[clients][id]
                        }
                    }

                })
            }
        }

    }

}

