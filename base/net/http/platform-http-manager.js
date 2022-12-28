/*
Copyright 2021 HolyCorn Software
The Soul Platform
This module takes care of the general processing involved when a client makes a new socket to the server
This general processing involves aspects like handling websockets
*/

import { SystemHTTP } from './system-http.js';
import tls from 'node:tls'


import platform_credentials from '../../../secure/credentials.mjs'

import { PlatformHTTPServer } from './platform-http.js';

export class BasePlatformHTTPManager {

    /**
     * 
     * @param {import('../../platform.mjs').BasePlatform} base
     * @param {{http_port:number, https_port:number}} 
     */
    constructor(base, args) {
        /** @type {import('../../platform.mjs').BasePlatform} */
        this.base = base;
        Object.assign(this, args);
        /** @type {number} */ this.https_port
        /** @type {number} */ this.http_port
    }
    init = async () => {

        let port = this.http_port; //Heroku and other hosting platforms tell us which port to bind to

        //The default HTTP server that everthing goes through
        this.http_server = new PlatformHTTPServer(this.base, port);
        this.http_server.isHalted = true;

        //The TLS server that forwards all requests back to the default HTTP server
        await this.createTLSServer(this.https_port);


        //Now enforce SSL according to system policies
        this.enforceSSL();


        //An HTTP server responsible for things like errorMap
        this.system_http = await SystemHTTP.new(this)


        //Now Log
        console.log(`
        ${'HTTP server running on port '.cyan}${port.toString().blue}
        ${`${'HTTPS'.blue} server running on port `.cyan}${this.https_port.toString().blue}
        The server is not yet open to receiving requests
        `)

        console.log(`
        ${'System related features on SystemHTTP\n\tare running on port '.cyan}${this.system_http.port.toString().blue}, ${'routed to '.cyan}${this.system_http.system_path.green}
        `)

        setTimeout(() => {
            this.http_server.isHalted = false;
            console.log(`The server has started accepting HTTP requests`.cyan)
        }, 3000)
    }

    enforceSSL() {


        this.http_server.addMiddleWare({
            /**
             * 
             * @param {import('node:http').IncomingMessage} req 
             * @param {SuperResponse} res 
             */
            callback: async (req, res) => {
                //This middleware is used to enforce ssl
                if (process.env.HTTP_REQUIRESSL === 'true' && (req.socket.address().port !== this.https_port && req.headers['x-forwarded-proto'] !== 'https')) {
                    res.endJSON('Forwarding to more secure protocol', { 'Location': `https://${this.base.server_domains.secure}${req.url}` }, 301)
                    return true;
                }
            }
        });
    }

    async createTLSServer(port) {

        let tls_server = tls.createServer({
            cert: platform_credentials.tls_cert,
            ca: platform_credentials.tls_ca,
            key: platform_credentials.tls_key,
        })

        tls_server.listen(port);

        //Just forward the HTTPS connections to the HTTP server
        tls_server.on('secureConnection', (socket) => {
            this.http_server.server.emit('connection', socket)
        })

        tls_server.on('tlsClientError', (e) => {
            //Errors like these crashed the server before we ever came to know
            // console.log(`Catching a stubborn error `, e)
        })

    }


}