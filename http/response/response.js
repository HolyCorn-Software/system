/*
Copyright 2022 HolyCorn Software
The Soul System
The http module
This module defines a custom extension to the SuperRequest object for providing extra features such as session management
*/

import { SuperResponse } from "../../lib/nodeHC/http/super-response.js";
import { Session } from "../session/session.js";

export class XSuperResponse extends SuperResponse {

    /**
     * This method is used to extend a session for a defined period of time.
     * @param {number|undefined} duration How much additional time will be given to the session. If not specified, a default time of 3 days will be added
     */
    extendSession(duration = Session.defaultDuration) {
        // The rule is, we
        if (typeof duration !== 'number') {
            throw new Exception(`Please pass an number as the duration to be added to the session expiry time`, { code: 'error.system.unplanned' })
        }

        this.cookies.write(this, { expires: Date.now() + duration, path: Session.cookiePath })
    }

    /**
    * This method returns a handle to the user's session
    * @returns {Promise<import('../session/session.js').Session>}
    */
    async getSession() {
        // How do we store settings for the session cookie name ?
        let cookie = this.cookies.data[Session.cookieName]

        return await Session.getFromCookie(cookie);
    }

    /**
     * Get the session associated with the client's request or start a new one
     * @returns {Promise<Session>}
     */
    async getSessionOrStartNew() {
        let session = await Session.getSessionFromCookieOrStartNew(this.cookies.data[Session.cookieName])
        await session.writeHTTP(this);
        return session;
    }
}