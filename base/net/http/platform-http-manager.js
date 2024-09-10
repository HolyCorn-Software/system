/*
Copyright 2021 HolyCorn Software
The Soul Platform
This module takes care of the general processing involved when a client makes a new socket to the server
This general processing involves aspects like handling websockets
*/

import tls from 'node:tls'
import libPath from 'node:path'


import platform_credentials from '../../../secure/credentials.mjs'


export class BasePlatformHTTPManager {

    /**
     * 
     * @param {import('../../platform.mjs').BasePlatform} base
     * @param {{http_port:number, https_port:number}} 
     */
    constructor(base, args = {}) {
        /** @type {import('../../platform.mjs').BasePlatform} */
        this.base = base;
        Object.assign(this, args);
        /** @type {number} */ this.https_port
        /** @type {number} */ this.http_port
    }
    init = async () => {

        let port = this.base.ports.gateway ? this.base.ports.gateway : this.base.ports.http;

        //The default HTTP server that everthing goes through
        this.platform_http = new (await import('./platform-http.mjs')).default(this.base, port);


        //The TLS server that forwards all requests back to the default HTTP server
        if (!this.base.ports.gateway) {
            this.createTLSServer(this.base.ports.https).catch(e => console.error(e));
        }


        //Now enforce SSL according to system policies
        this.enforceSSL();


        //An HTTP server responsible for things like errorMap
        this.system_http = await (await import('./system-http.mjs')).default.new(this)

        const httpShutdown = () => {
            this.platform_http.destroy().catch(e => console.error(e))
        }

        global.process.addListener('SIGINT', httpShutdown)
        global.process.addListener('SIGTERM', httpShutdown)

        //Now Log
        console.log(`
        ${'HTTP server running on port '.cyan}${port.toString().blue}
        ${`${this.base.ports.gateway ? '' : `${`${'HTTPS'.blue} server running on port `.cyan}${this.base.ports.http.toString().blue}`}
        The server is not yet open to receiving requests
        `}`)

        console.log(`
        ${'System related features on SystemHTTP\n\tare running on port '.cyan}${this.system_http.port.toString().blue}, ${'routed to '.cyan}${this.system_http.system_path.green}
            `)
    }

    enforceSSL() {


        this.platform_http.addMiddleWare({
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

        while (this.platform_http.isHalted) {
            await new Promise(x => setTimeout(x, 500))
        }

        tls_server.listen(port);

        //Just forward the HTTPS connections to the HTTP server
        tls_server.on('secureConnection', (socket) => {
            this.platform_http.server.emit('connection', socket)
        })

        tls_server.on('tlsClientError', (e) => {
            //Errors like these crashed the server before we ever came to know
            // console.log(`Catching a stubborn error `, e)
        })

    }


}