/*
Copyright 2022 HolyCorn Software
The Soul System
The http module.
The session module.
This session module allows the system to keep track of important variables belonging to a client, a concept known as session managment

*/

import { Platform } from "../../platform.mjs"
import { BasePlatform } from "../../base/platform.mjs";
import { SessionStorage } from "../../base/net/http/session-storage/storage.mjs";
import EventEmitter from "node:events";

const renewTimeout = Symbol()

export class Session {

    constructor({ id, cookie } = {}) {

        /** @type {string} */ this.id
        /** @type {string} */ this.cookie

        if (!id) {
            console.trace(`id is `, id)
        }

        this.id = id;
        this.cookie = cookie;

        /** @type {import("./types.js").SessionObjectEvents} */
        this.events = new EventEmitter()

    }

    activateAutoRenew() {

        const schedule = async () => {
            clearTimeout(this[renewTimeout])
            const existing = await Session.sessionAPI.getSessionById(this.id)
            if (existing) {
                this[renewTimeout] = setTimeout(async () => {
                    try {
                        this.cookie = await Session.sessionAPI.regenerate(this.id)
                        this.events.emit('renew')
                    } catch (e) {
                        console.warn(`Failed to renew session ${this.id}\n`, e)
                    } finally {
                        schedule()
                    }
                }, (Session.defaultDuration / 100) - (Date.now() - (existing.lastUpdate || Date.now())))
            }
        }

    }

    stopAutoRenew() {
        clearInterval(this[renewTimeout])
    }


    async getVar(varname) {
        return await Session.sessionAPI.getVar({ sessionID: this.id, varname })
    }
    async setVar(varname, value) {
        return await Session.sessionAPI.setVar({ sessionID: this.id, varname, value })
    }
    async rmVar(varname) {
        return await Session.sessionAPI.rmVar(this.id, varname)
    }

    /**
     * This method is used to retrieve the time left for the session to expire.
     * The reason we have to call this method is because expiry time is not stored on the local session object.
     * Expiry time is not stored on the local session object because it can change anytime. It changes everytime the session is accessed.
     * @returns {Promise<number>}
     */
    async getExpiryTime() {
        return await Session.sessionAPI.getExpiry(this.id);
    }

    /**
     * Sends the session information as cookies to the client
     * @param {import('node:http').OutgoingMessage} resp 
     */
    async writeHTTP(resp) {
        resp.setHeader('set-cookie', `${Session.cookieName}=${this.cookie}; expires=${new Date(Session.defaultDuration + Date.now())}; path=${Session.cookiePath};`)

    }


    /**
     * This method is called to either resume a session from the given cookie or start a new one.
     * @param {string} cookie 
     * @returns {Promise<Session>}
     */
    static async getSessionFromCookieOrStartNew(cookie) {
        if (!cookie) {
            return await this.startNew()
        }

        try {
            return await this.getFromCookie(cookie);
        } catch (e) {
            //The only exception allowed at this point is session not found
            if (/not.*found/gi.test(e.code) || /session.*expired/.test(e.code)) {
                //So if that's the case, we create a new session
                return await this.startNew();
            } else {
                console.log(`Session error  `, e)
                throw e;

            }
        }
    }

    /**
     * This method resumes an already running session by looking up the session using the cookie value
     * @param {string} cookie The value of the session cookie
     */
    static async getFromCookie(cookie) {
        let id = await this.sessionAPI.getSessionID(cookie);
        return new this({ id, cookie })
    }

    static async startNew() {
        let data = await this.sessionAPI.generateSession()
        return new Session({ id: data.sessionID, cookie: data.cookie })
    }

    /**
     * Returns the SessionStorage api to use based on the platform we're currently running on.
     * Either one that's faster for the BasePlatform or one that's possible in the FacultyPlatform environment.
     * It's possible that we merge these two outcomes in a single method because the returned apis in both cases have methods with the exact same names.
     * @returns {import('../../base/net/http/session-storage/api.mjs').BaseSessionStorageAPI & import('../../base/net/http/session-storage/storage.mjs').SessionStorage }
     */
    static get sessionAPI() {
        const platform = Platform.get();
        if (platform instanceof BasePlatform) {
            return platform.http_manager.platform_http.sessionStorage
        }
        if (platform instanceof FacultyPlatform) {
            return platform.base.channel.remote.http.sessionAPI
        }
    }

    /**
     * How long it takes for a session to expire
     * @returns {number}
     */
    static get defaultDuration() {
        return SessionStorage.defaultDuration
    }

    static get cookiePath() {
        return '/'
    }

    static get cookieName() {
        return 'hcSession'
    }

}