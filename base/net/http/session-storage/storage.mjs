/*
Copyright 2021 HolyCorn Software
This module is used to persist session variables across multiple faculties, and managed by the BasePlatform
It allows that even in faculties, clients should be identified and variables pertaining to them retrieved.

*/

import shortuuid from 'short-uuid'

import collections from './collections.mjs'




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


        basePlatform.events.on('booted', async () => {

            try {
                const indices = await collections.sessionStorage.listIndexes().toArray()
                for (const index of indices) {
                    if (index.name === '_id_') continue;
                    await collections.sessionStorage.dropIndex(index.name)
                }
                collections.sessionStorage.createIndex(
                    { id: 1 },
                    { unique: true }
                )
                collections.sessionStorage.createIndex(
                    {
                        cookie: 1
                    },
                    { unique: true }
                );
                collections.sessionStorage.createIndex(
                    {
                        expires: 1
                    },
                    {
                        // TODO: Find a way to do calculations in seconds
                        expireAfterSeconds: 10,

                    }
                );

            } catch (e) {
                if (e.code == 26) { // code 26 means namespace not found. And that's okay, as it might be the first time the system is launched
                    return;
                }
                console.error(e)
            }


        });
    }

    /**
     * This method runs after sessions have been pulled from the database, in order
     * to filter invalid sessions, and make important changes.
     * @param {import("./types.js").SessionData[]} sessions 
     * @returns {Promise<import("./types.js").SessionData[]>}
     */
    async #checkSessions(sessions) {


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
        if (expired.length > 0) {
            await collections.sessionStorage.deleteMany({
                id: { $in: expired }
            })
        }

        return valid
    }

    /**
     * This method is owned and called at the BasePlatform in order to retrieve a session variable
     * @param {string} id The id of the session to be read
     * @param {string} key The key to be read from the session
     */
    async getVar(id, key) {
        let value = (await this.getSessionById(id)).store[key]
        collections.sessionStorage.updateOne({ id: { $eq: id } }, { $set: { expires: Date.now() + SessionStorage.defaultDuration } })
        return value;
    }
    /**
     * This method is called at the BasePlatform (and only possible at the BasePlatform). This method is called to set a session variable
     * @param {string} id The session id
     * @param {string} key The key to be set
     * @param {string} value The new value
     */
    async setVar(id, key, value) {
        let client = await this.getSessionById(id);
        client.store[key] = value
        client.expires = Date.now() + SessionStorage.defaultDuration //extend the session, since it was just used
        collections.sessionStorage.updateOne({ id: { $eq: id } }, { $set: client })

    }
    /**
     * This method is owned by the BasePlatform, and called from the BasePlatform in order to erase a session variable
     * @param {string} id The session to be altered
     * @param {string} key The key to be deleted
     */
    async rmVar(id, key) {
        delete (await this.getSessionById(id)).store[key]
        collections.sessionStorage.updateOne({ id: { $eq: id } }, { $unset: { key: true }, $set: { expires: Date.now() + SessionStorage.defaultDuration } })
    }

    /**
     * This method is created and employed in the BasePlatform in order to retrieve the expiry time of a given session
     * @param {string} id Session id
     */
    async getExpiry(id) {
        return (await this.getSessionById(id)).expires;
    }

    /**
     * Creates a new session.
     * Note that this method is not for Faculties Faculties call the api method `generateSession()`
     * @returns {Promise<import('./types.js').SessionPublicData>}
     */
    async generateSession() {
        let cookie = `${shortuuid.generate()}${shortuuid.generate()}`
        let id = `${shortuuid.generate()}`
        let session = {
            id,
            cookie,
            store: {},
            expires: Date.now() + SessionStorage.defaultDuration
        }
        await collections.sessionStorage.insertOne({ id, cookie, store: {}, expires: session.expires })
        return { sessionID: id, cookie, expires: session.expires }
    }

    /**
     * Gets a session id by using the cookie value
     * Note that is method is not intended for Faculties. Faculties have a similarly named method, that however resides on the SessionStorageAPI
     * @param {string} cookie 
     * @returns {Promise<string>}
     */
    async getSessionID(cookie) {

        let client = await (async () => {
            const single = await collections.sessionStorage.findOne({ cookie })
            if (!single) {
                return
            }
            if (single.expires < Date.now() + SessionStorage.defaultDuration) {
                single.expires = Date.now() + SessionStorage.defaultDuration
            }
            collections.sessionStorage.updateOne({ id: single.id }, { $set: { expires: Date.now() + SessionStorage.defaultDuration } })
            return (await this.#checkSessions([single]))[0]
        })()
        if (!client) {
            throw new Exception(`The client with cookie '${cookie}' was not found`, { code: `session_not_found` })
        }
        return client.id
    }

    /**
     * Get a session by id. This method is not at all accessible or intended for use by Faculties.
     * @param {string} id 
     * @returns {import("./types.js").SessionData}
     */
    async getSessionById(id) {
        let session = await collections.sessionStorage.findOne({ id })

        if (!session) {
            console.log(`id is `, id)
            throw new Exception(`The session with id '${id}' was not found`, { code: `${SessionStorage.#errorNamespace}.session_not_found("${id}")` })
        }
        //Now if the client's session has expired
        if (session.expires < Date.now()) {
            collections.sessionStorage.deleteOne({ id }).catch(e => console.warn(e))
            throw new Exception(`The session '${id}' has expired`, { code: `session_expired` })
        }

        return session;
    }

    /**
     * This method regenerates the session by generating a new cookie value for it.
     * 
     * This method returns the new cookie
     * @param {string} id 
     * @returns {Promise<string>}
     */
    async regenerate(id) {
        const cookie = `${shortuuid.generate()}${shortuuid.generate()}`
        const session = await collections.sessionStorage.findOne({ id })
        if (!session) {
            throw new Exception(`Session ${id} not found`)
        }
        // Prevent duplicate simultaneous updates, that could cause instability, when a client opens multiple windows.
        if (Date.now() - (session?.lastUpdate || 0) < 30_000) {
            return session.cookie
        }
        await collections.sessionStorage.updateOne({ id }, { $set: { cookie, expires: Date.now() + SessionStorage.defaultDuration, lastUpdate: Date.now() } })
        return cookie
    }


    static #errorNamespace = 'net.sessionStorage'

    /**
    * How long it takes for a session to expire
    * @returns {number}
    */
    static get defaultDuration() {
        return 72 * 60 * 60 * 1000
    }


}