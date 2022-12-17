/**
 * Copyright 2022 HolyCorn Software
 * This module allows both faculties and the Base Platform to serve clients via rpc over websockets
 */

import { Session } from '../../http/session/session.js';
import { JSONRPC } from './json-rpc.mjs';




export class SocketPublicJSONRPC extends JSONRPC {

    /**
     * Provide methods to a public client by specifying the client and the stub (source of methods)
     * @param {import('../websockets/incomingClient.js').WSIncomingClient} socket 
     * @param {Object|undefined} stub Ignore this and the function will use the default public stub remote methods (faculty.remote.public)
     */
    constructor(client, stub) {

        super();
        this.socketClient = client;

        this.stub = stub

        this.ondata = d => {
            try {
                this.socketClient.send(d, 'text')
            } catch (e) {
                console.error(e);
            }
        }

        this.socketClient.on('data', (d) => {
            if (d.type === 'text') {
                this.accept(d.data.toString())
            }
        })


        this.flags.expose_stack_traces = false;
        this.flags.stripColors = true;

        /** @type {import('./types.js').FacultyPublicJSONRPCMeta} */ this.meta

        /** @type {import('../websockets/incomingClient.js').WSIncomingClient} */ this.socketClient
    }

    /**
     * It is used to resume a client's session.
     * Thess
     * @returns {Promise<Session>}
     */
    async resumeSessionFromMeta() {
        try {
            let session = new Session({ id: this.meta.hcSessionId })
            await session.checkValidity()
            return session;
        } catch (e) {
            console.log(`because of \n`, e, '\nWe\'re creating a new session')
            let session = await Session.startNew()
            return session;
        }
    }

}