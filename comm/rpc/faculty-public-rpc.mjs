/*
Copyright 2021 HolyCorn Software
This module represents the link between a Faculty and a public client getting access to faculty via RPC on web sockets.
*/

import { SocketPublicJSONRPC } from './socket-public-rpc.mjs';



export class FacultyPublicJSONRPC extends SocketPublicJSONRPC {

    /**
     * @deprecated The faculty automatically manages connections. Just right to faculty.remote.public, to specify methods clients have access to
     * Provide methods to a public client by specifying the client and the stub (source of methods)
     * @param {import('../websockets/incomingClient.js').WSIncomingClient} client 
     * @param {Object|undefined} stub Ignore this and the function will use the default public stub remote methods (faculty.remote.public)
     */
    constructor(client, stub) {

        super(client, stub || FacultyPlatform.get().remote.public)
    }
}

const defaultRPCServer = Symbol()


/**
 * This creates an always on listening server, for incoming public connections to the Faculty, providing those connections with access to the public methods
 */
export class FacultyPublicRPCServer {

    /**
     * @param {HTTPServer} http The http server that'll listen to the incoming connections
     */
    constructor(http) {
        const faculty = FacultyPlatform.get();

        if (faculty[defaultRPCServer]) {
            throw new Exception(`Faculties may not create their own public rpc servers.\nThis feature is now automatically managed.\nSimply modify faculty.remote.public to define the interface which public clients will have access to.`)
        }

        this.http = http;

    }

    /**
     * This method is used to begin routing of websocket requests, so that clients may access the public methods
     */
    async claimRemotePoint() {
        const faculty = FacultyPlatform.get();


        await faculty.base.shortcutMethods.http.websocket.claim({
            base: {
                point: faculty.standard.publicRPCPoint
            },
            local: {
                path: '/'
            },
            http: this.http
        })

        this.http.websocketServer.route({
            path: '/',
            callback: (headers, client) => {
                new FacultyPublicJSONRPC(client)
            }
        });

        faculty[defaultRPCServer] = this;
    }

}