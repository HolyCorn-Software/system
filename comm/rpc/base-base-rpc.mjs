/*
Copyright 2021 HolyCorn Software
The aim of this module is to provide a simplification of the frequently used utility, rpc
It will allow clients to create an rpc connection by simply specifying details such as port, certs (optionally), endpoint ip
OR by specifying serverPort, certs (optionally)

*/

import tls from 'tls';
import { SocketCommInterface } from '../interface/socket-interface.mjs';
import fs from "fs";
import EventEmitter from 'events';

import credentials from '../../secure/credentials.mjs'

export class BaseBaseRPCClient {

    /**
     * 
     * @param {string} param0.host
     * @param {string} param0.port
     * @param {string} param0.key the path to the private key
     * @returns {SocketCommInterface}
     * 
     * Use this method to connect to an rpc server
     */
    static async connect({ host, port, key, cert } = {}) {



        let socket; //The outcome of connecting

        var { key, cert } = this.verifyKeys({ cert, key }); //Make sure the private and certificate keys are passed respectively. And then change them to buffers of the key data

        socket = tls.connect({
            port,
            host,
            key: key,
            cert: cert, //Wondering why ? For security, both clients and servers have to authenticate themselves
            ca: credentials.tls_ca
        })

        await new Promise(async (yes, no) => {
            socket.once('secureConnect', yes)
            socket.once('error', no)
        })


        //Now that the socket is established with the server, we return a JsonRpc object used for further communication
        return new SocketCommInterface(socket)

    }




    static verifyKeys({ cert, key }) {
        if (!key) {
            throw new Error(`As at now, we cannot create unsecured sockets ! Please pass the key, which is a the path of the private key`)
        }

        if (!cert) {
            throw new Error(`As at now, we cannot create unsecured sockets ! Please pass the cert, which is a the path of the certificate`)
        }
        return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) }
    }

}


/**
 * @property {object} default_methods An object with methods that can be called by all remote clients
 * @emits "connect"
**/
export class BaseBaseRPCServer extends EventEmitter {

    /**
     * 
     * @param {tls.Server} server_socket 
     * @param {object} default_methods an object containing methods that will be available to all newly connected clients
     * 
     * An RPCServer waits for connections on the socket, and for every connection made, this object fires a 'connect' event, with parameter SocketCommInterface
     */
    constructor(server_socket, default_methods = {}) {
        super()

        this.endpoints = []; //We need to keep a list of all connected clients (via SocketCommInterface), so that in later time, we can emit one event and all receive it
        this.default_methods = default_methods; //Remember that default_methods is an object with methods that will be available to all newly connected clients

        server_socket.on('secureConnection', (socket) => {
            let nw_endpoint = new SocketCommInterface(socket, this.default_methods);
            super.emit('connect', nw_endpoint)
            this.endpoints.push(nw_endpoint);
            nw_endpoint.rpc.$rpc.events.on('*', (type, ...data) => {
                super.emit(type, ...data)
            })
        })

        this.socket = server_socket;
    }

    /**
     * This method originally belongs to the EventEmitter class, but is overriden here, so that one event can be emitted, and all clients know about it
     */
    emit() {
        for (var endpoint of this.endpoints) {
            endpoint.rpc.$rpc.events.emit(...arguments);
        }
        super.emit(...arguments);
    }

    /**
     * 
     * @param {string} param0.port
     * @param {[string,string]} param0.keys : Private Key and Certificate
     * @param {string} param0.ca : Certificate authority for verifying clients
     * @param {object} default_methods: An object containing methods, that'll be available to each and every client that gets connected
     * @returns {Promise<BaseBaseRPCServer>}
     * 
     * Use this method to create an RPC server
     */
    static async create({ port, cert, key } = {}, default_methods = {}) {

        key = (typeof key == 'string') ? fs.readFileSync(key) : key
        cert = (typeof cert == 'string') ? fs.readFileSync(cert) : cert

        let server = tls.createServer({
            key,
            cert,
            ca: credentials.tls_ca
        })
        server.listen(port)

        let rpc = new BaseBaseRPCServer(server, default_methods);
        rpc.port = port
        return rpc;

    }


}
