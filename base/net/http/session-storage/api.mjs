/*
Copyright 2022 HolyCorn Software
The Soul System
The http module
The session-storage module
The api module
This api module defines the publicly available methods for faculties, useful in managing client sessions.

Because this is a remote interface, the first parameter to every method will be a handle to the calling client.
Therefore, method description signatures will differ from the actual method signatures.
*/

import { Exception } from "../../../../errors/backend/exception.js"
import { Platform } from "../../../../platform.mjs"
import { BasePlatform } from "../../../platform.mjs"

export class BaseSessionStorageAPI {

    constructor() {
        //BaseSessionStorageAPI.ensureBasePlatform();
    }

    /**
     * This retrieves the session id given the cookie value
     * @param {string} cookie cookie value
     * @returns {Promise<string>}
     */
    async getSessionID(cookie) {
        cookie = arguments[1]
        return await BaseSessionStorageAPI.#getAPI().getSessionID(cookie);
    }


    /**
     * This method returns the value of a variable, getting it from a client's session data
     * @param {object} param0
     * @param {string} param0.sessionID
     * @param {string} param0.varname
     * @returns {Promise<any>}
     */
    async getVar(param0) {

        //arguments[1] because the first automatically passed argument is the handle to the remote calling faculty
        var { sessionID, varname } = arguments[1]

        return BaseSessionStorageAPI.#getAPI().getVar(sessionID, varname);
    }

    /**
     * This method is called when a remote faculty wishes to write a session variable
     * @param {object} param0  
     * @param {string} param0.sessionID
     * @param {string} param0.varname
     * @param {string} param0.value
     * 
     * @returns {Promise<void>}
     */
    async setVar(param0) {
        let { sessionID, varname, value } = arguments[1];
        return BaseSessionStorageAPI.#getAPI().setVar(sessionID, varname, value)
    }

    /**
     * This method is called when a faculty wishes to delete a session variable (not setting it to null)
     * @param {string} varname
     * @returns {Promise<void>}
     */
    async rmVar(sessionID, varname) {
        // Remote methods usually have the attribute that their first arguments are always a handle to the calling client, therefore all other arguments are shifted by one place. Reason why signature is different from implementation
        sessionID = arguments[1]
        varname = arguments[2]
        BaseSessionStorageAPI.#getAPI().rmVar(sessionID, varname);
    }

    /**
     * This method will retrieve the expiry time of a session.
     * @param {string} sessionID 
     * @returns {Promise<number>}
     */
    async getExpiry(sessionID) {
        sessionID = arguments[1];
        return BaseSessionStorageAPI.#getAPI().getExpiry(sessionID)
    }

    /**
     * This method generates a new session and returns it's id and cookie value
     * @returns {Promise<{cookie:string, sessionID:string}>}
     */
    async generateSession() {
        return await BaseSessionStorageAPI.#getAPI().generateSession();
    }

    /**
     * This method checks whether we are running from the BasePlatform, then returns the SessionStorage instance
     * @returns {import('./storage.mjs').SessionStorage}
     */
    static #getAPI() {
        if (!(Platform.get() instanceof BasePlatform)) {
            throw new Exception(`There's a misconfiguration that caused the BaseSessionStorageAPI to be found running in an environment other than the BasePlatform`, { code: 'error.system.unplanned' })
        }
        return BasePlatform.get().http_manager.http_server.sessionStorage
    }

}