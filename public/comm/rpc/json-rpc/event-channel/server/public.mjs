/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (public), is part of the event-channel/server module, and is used to 
 * provide methods for clients on the public web
 */

import JSONRPC from "../../json-rpc.mjs";
import EventChannelServer, { internal } from "./sever.mjs";


const server = Symbol()


/**
 * @template RegistrationData
 */
export default class EventChannelPublicMethods {

    /**
     * 
     * @param {EventChannelServer<RegistrationData>} _server 
     */
    constructor(_server) {

        this[server] = _server

    }

    /**
     * This method is used to register oneself on the server for upcoming events
     * @param {import("./types.js").ExtractRegisterData<RegistrationData>} data 
     * @returns {Promise<void>}
     */
    async register(data) {
        /** @type {JSONRPC} */
        const client = arguments[0]

        const ids = await this[server].register({ data: arguments[1], client })

        if (!Array.isArray(ids)) {
            throw new Error(`The register() method, is supposed to return an array of strings, which are ids used to identify the client`)
        }


        this[server][internal].addClient(ids, client)

    }

}