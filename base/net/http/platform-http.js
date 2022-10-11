/*
Copyright 2022 HolyCorn Software
The Soul System
The http module
This module (platform-http) defines a custom intermediate HTTPServer extension specifically to provide extra features such as session storage.
*/

import { HTTPServer } from "../../../http/server.js";
import { SessionStorage } from "./session-storage/storage.js";

export class PlatformHTTPServer extends HTTPServer {


    /**
     * Creates a new PlatformHTTPServer using a reference to the BasePlatform and the port number to run the HTTP server
     * @param {import('../../platform.mjs').BasePlatform} base 
     * @param {number} port 
     */
    constructor(base, port) {
        super(port);
        this.base = base;

        this.sessionStorage = new SessionStorage(this.base);
    }

    /**
     * 
     * @param {import('../../../lib/nodeHC/http/super-request.js').SuperRequest} req 
     * @param {import('../../../lib/nodeHC/http/super-response.js').SuperResponse} res 
     * @returns {Promise<void>}
     */
    async serve(req, res) {
        //Since we want better performance, we'll do the additional work asynchronous

        return super.serve(...arguments);
    }

}