/*
Copyright 2021 HolyCorn Software
This module is used to persist session variables across multiple faculties, and managed by the BasePlatform
It allows that even in faculties, clients should be identified and variables pertaining to them retrieved.

*/

import { Exception } from "../../../../errors/backend/exception.js";
import shortuuid from 'short-uuid'
import collections from './collections.js'




/**
 * This class is responsible for storing all session variables
 * 
 * Every client is identified by a unique id generated using the UUID algorithm
 * 
 */


export class SessionStorage {

    /**
     * 
     * @param {import('../../../platform.mjs').BasePlatform} basePlatform 
     */
    constructor(basePlatform) {

        this.#sessions = []
        this.#base = basePlatform
        this.#setErrorsOnBase();

        basePlatform.events.on('booted', () => {
            console.log(`Now restoring sessions from database`)
            this.restoreFromDatabase();
        })
    }
    /** @type {[import("./types.js").SessionData]} */
    #sessions
    #base

    /**
     * This method resides on the BasePlatform and is used internally during startup to pull sessions from the database
     * @returns {Promise<void>}
     */
    async restoreFromDatabase() {
        let sessions = await (collections.sessionStorage.find()).toArray();
        //Filter the expired sessions first
        let expired = []; //The ids of expired sessions
        let valid = []

        for (let session of sessions) {
            if (session.expires < Date.now()) {
                expired.push(session.id)
            } else {
                valid.push(session)
            }
        }

        //Now delete all the expired sessions from the database
        await collections.sessionStorage.deleteMany({
            id: { $in: expired }
        })

        this.#sessions.push(...valid);

    }

    /**
     * This method is owned and called at the BasePlatform in order to retrieve a session variable
     * @param {string} id The id of the session to be read
     * @param {string} key The key to be read from the session
     * @returns {string}
     */
    getVar(id, key) {
        let value = this.getSessionById(id).store[key]
        collections.sessionStorage.updateOne({ id: { $eq: id } }, { $set: { expires: Date.now() + SessionStorage.defaultDuration } })
        return value;
    }
    /**
     * This method is called at the BasePlatform (and only possible at the BasePlatform). This method is called to set a session variable
     * @param {string} id The session id
     * @param {string} key The key to be set
     * @param {string} value The new value
     */
    setVar(id, key, value) {
        let client = this.getSessionById(id);
        client.store[key] = value
        client.expires = Date.now() + SessionStorage.defaultDuration //extend the session, since it was just used
        collections.sessionStorage.updateOne({ id: { $eq: id } }, { $set: client })

    }
    /**
     * This method is owned by the BasePlatform, and called from the BasePlatform in order to erase a session variable
     * @param {string} id The session to be altered
     * @param {string} key The key to be deleted
     */
    rmVar(id, key) {
        delete this.getSessionById(id).store[key]
        collections.sessionStorage.updateOne({ id: { $eq: id } }, { $unset: key, $set: { expires: Date.now() + SessionStorage.defaultDuration } })
    }

    /**
     * This method is created and employed in the BasePlatform in order to retrieve the expiry time of a given session
     * @param {string} id Session id
     */
    getExpiry(id) {
        return this.getSessionById(id).expires;
    }

    /**
     * Creates a new session.
     * Note that this method is not for Faculties Faculties call the api method `generateSession()`
     * @returns {Promise<{cookie:string, sessionID:string}>}
     */
    async generateSession() {
        let cookie = `${shortuuid.generate()}${shortuuid.generate()}`
        let id = `${shortuuid.generate()}`
        let client = {
            id,
            cookie,
            store: {},
            expires: Date.now() + SessionStorage.defaultDuration
        }
        this.#sessions.push(client);
        collections.sessionStorage.insertOne({ id, cookie, store: {} })
        return { sessionID: id, cookie }
    }

    /**
     * Gets a session id by using the cookie value
     * Note that is method is not intended for Faculties. Faculties have a similarly named method, that however resides on the SessionStorageAPI
     * @param {string} cookie 
     * @returns {string}
     */
    getSessionID(cookie) {

        let client = this.#sessions.filter(x => x.cookie === cookie)[0]
        if (!client) {
            throw new Exception(`The client with cookie '${cookie}' was not found`, { code: `${SessionStorage.#errorNamespace}.session_not_found("${cookie}")` })
        }
        return client.id
    }

    /**
     * Get a session by id. This method is not at all accessible or intended for use by Faculties.
     * @param {string} id 
     * @returns {import("./types.js").SessionData}
     */
    getSessionById(id) {
        let client = this.#sessions.filter(x => x.id === id)?.[0]
        if (!client) {
            throw new Exception(`The session with id '${id}' was not found`, { code: `${SessionStorage.#errorNamespace}.session_not_found("${id}")` })
        }
        //Now if the client's session has expired
        if (client.expires < Date.now()) {
            throw new Exception(`The session '${id}' has expired`, { code: `${SessionStorage.#errorNamespace}.session_expired` })
        }
        return client;
    }

    /**
     * 
     * This method is called in order to append errors contributed by this module (SessionStorage)
     * This method is owned and available from the BasePlatform only
     * 
     */
    #setErrorsOnBase() {
        //Check if custom errors have been previously set before
        //How do we do that? We take the first error from our set of custom errors and check if it exists
        let error0 = Reflect.ownKeys(SessionStorage.customErrors)[0]
        if (!error0) {
            //Then this module doesn't have any custom errors to contribute in the first place
            return;
        }
        if (this.#base.errors.custom[error0]) {
            return; //Then our custom errors have already been applied
        }

        this.#base.errors.setCustomErrors(SessionStorage.customErrors);
    }
    static #errorNamespace = 'net.sessionStorage'
    /**
     * Custom errors that are contributed by the SessionStorage module
     */
    static get customErrors() {

        let errors = {
            'session_not_found': `The session with id '$0' was not found`,
            'session_expired': `The session with id '$0' has expired.`

        }
        /** @type {import("../../../../errors/handler.mjs").ErrorMapV2} */
        let final = {}

        for (let error in errors) {
            final[`${this.#errorNamespace}.${error}`] = {
                backend: errors[error].backend || {
                    message: errors[error],
                    httpCode: 500
                },
                frontend: errors[error].frontend || {
                    message: errors[error]
                }
            }
        }

        return final;
    }

    /**
    * How long it takes for a session to expire
    * @returns {number}
    */
    static get defaultDuration() {
        return 72 * 60 * 60 * 1000
    }


}