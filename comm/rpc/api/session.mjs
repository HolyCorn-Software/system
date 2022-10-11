/**
 * Copyright 2022 HolyCorn Software
 * This module provides public methods all related to session management.
 * This module can be used both by the BasePlatform and FacultyPlatforms
 */

import { Session } from "../../../http/session/session.js";


export class PublicRPCSessionAPI {

    /**
     * This method is used by public clients to get indentified by their sessions.
     * This method will either start or resume a session.
     * @param {{
     * cookie: string
     * }} param0 
     * 
     * @returns {Promise<{cookieName:string, cookieValue:string, expires:number}>}
    */
    async sessionAuth(param0) {
        
        let client = arguments[0]

        let { cookie } = arguments[1]

        let session = await Session.getSessionFromCookieOrStartNew(cookie);
        client.meta.hcSessionId = session.id;
        
        return { cookieName: Session.cookieName, cookieValue: session.cookie, expires:await session.getExpiryTime() }
    }

    /**
     * This method is used to retrieve the name of the cookie that is used to store the session variables
     * @returns {string}
     */
    async getSessionCookieName() {
        return Session.cookieName
    }

}