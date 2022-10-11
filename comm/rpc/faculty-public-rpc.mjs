/*
Copyright 2021 HolyCorn Software
This module represents the link between a Faculty and a public client getting access to faculty via RPC on web sockets.
*/

import { HTTPServer } from '../../http/server.js';
import { FacultyPlatform } from '../../lib/libFaculty/platform.mjs';
import { SocketPublicJSONRPC } from './socket-public-rpc.mjs';



export class FacultyPublicJSONRPC extends SocketPublicJSONRPC {

    /**
     * Provide methods to a public client by specifying the client and the stub (source of methods)
     * @param {import('../websockets/incomingClient.js').WSIncomingClient} socket 
     * @param {Object|undefined} stub Ignore this and the function will use the default public stub remote methods (faculty.remote.public)
     */
    constructor(client, stub) {

        super(client, stub || FacultyPlatform.get().remote.public)
    }
}



/**
 * This creates an always on listening server, for incoming public connections to the Faculty, providing those connections with access to the public methods
 */
export class FacultyPublicRPCServer {

    /**
     * @param {object} stub The source of remote methods. Ommit this parameter to default to faculty.remote.public interface
     * @param {HTTPServer} http The http server that'll listen to the incoming connections
     * @param {object} options Extra options if neccessary, to control how the public methods will be available (e.g with path)
     * @param {string} options.path The path the client will have to connect to, to access the public methods. Leave blank in order that the client can access it at any path
     * @param {function(import('http').IncomingMessage, import('../websockets/incomingClient.js').WSIncomingClient)} options.callback
     * @param {string} options.remotePoint If this is specified, the remote path will be claimed and channeled to the faculty for the purpose of providing those methods
     */
    constructor(stub, http, options) {
        const faculty = FacultyPlatform.get();

        http.websocketServer.route({
            path: options?.path || '/',
            callback: options?.callback || ((headers, client) => {
                new FacultyPublicJSONRPC(client, stub ||= faculty.remote.public)
            })
        })

        this.http = http;
        this.options = options;

        if (typeof options?.remotePoint !== 'undefined') {
            this.claimRemotePoint(options.remotePoint, options?.path || '/')
        }
    }

    /**
     * Call this method so that a particular path from the BasePlatform will be forwarded to this Faculty
     * @param {string} remotePoint The end point that will be forwarded to this http server. Leave this blank to use the standard point naming (e.g /$/rpc/<faculty.descriptor.name>)
     * @param {string} localPath If you specify this, remote connections will be forwarded to this path. Leave this blank so that connections will be forwarded to /
     */
    async claimRemotePoint(remotePoint = faculty.standard.publicRPCPoint, localPath = '/') {
        const faculty = FacultyPlatform.get();

        faculty.base.shortcutMethods.http.websocket.claim({
            base: {
                point: remotePoint
            },
            local: {
                path: localPath
            },
            http: this.http
        })
    }

}