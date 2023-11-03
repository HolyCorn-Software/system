/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module contains public methods called by the server on clients, for very important reasons
 */

import CookieManager from "../../html-hc/lib/cookies/manager.mjs"


export const SESSION_COOKIE_NAME = 'hcSession'

/**
 * @extends rpc.ClientPublicMethods
 */
export default class ClientPublicMethods extends Object{

    constructor() {
        super()
    }

    async sessionRenew(cookie, expires) {
        new CookieManager().setCookie(
            SESSION_COOKIE_NAME,
            cookie,
            {
                expires,
                path: '/'
            }
        )
    }

}