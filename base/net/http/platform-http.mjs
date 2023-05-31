/*
Copyright 2022 HolyCorn Software
The Soul System
The http module
This module (platform-http) defines a custom intermediate HTTPServer extension specifically to provide extra features such as session storage.
*/

import { SessionStorage } from "./session-storage/storage.mjs";

export default class PlatformHTTPServer extends HTTPServer {


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

}