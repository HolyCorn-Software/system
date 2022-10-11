/*
Copyright 2021 HolyCorn Software
This is an extension of the nodeHC/http/websocket module, allowing additional functionalities related to managing public clients over websockets.

One particular feature is session management
*/

import { WebSocketIncomingClient } from "../../lib/nodeHC/http/websocket/incoming-client.js";

export class WSIncomingClient extends WebSocketIncomingClient {


    /**
     * 
     * @param {{
     * request: import('http').IncomingMessage,
     * socket:import('stream').Duplex
     * headers:Buffer,
     * server: import('./websocket.js').WebSocketServer
     * }} param0 
    */
    constructor() {
        super(...arguments);

        console.log(this.socket);
    }

}


