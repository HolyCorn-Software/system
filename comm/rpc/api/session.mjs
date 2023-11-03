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

        /** @type {FacultyPublicJSONRPC} */
        let client = arguments[0]

        let { cookie } = arguments[1]

        let session = await Session.getSessionFromCookieOrStartNew(cookie);
        client.meta.hcSessionId = session.id;


        if (!(FacultyPlatform.get() instanceof FacultyPlatform)) {

            session.activateAutoRenew()

            session.events.addListener('renew', () => {
                if (!client.socketClient.socket || client.socketClient.socket.closed) {
                    return client.destroy()
                }
                client.remote.sessionRenew(session.cookie, Date.now() + Session.defaultDuration - 1000).catch(e => {
                    console.warn(`Failed to renew session ${session.id.yellow}, with cookie ${session.cookie.yellow} on the client-side\n`, e)

                });
            })

            client.addEventListener('destroy', () => {
                session.stopAutoRenew()
                session.events.removeAllListeners()
                session = null
            })

        }


        return { cookieName: Session.cookieName, cookieValue: session.cookie, expires: await session.getExpiryTime() }
    }

    /**
     * This method is used to retrieve the name of the cookie that is used to store the session variables
     * @returns {string}
     */
    async getSessionCookieName() {
        return Session.cookieName
    }

}