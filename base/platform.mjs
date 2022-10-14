/*
Copyright 2021 HolyCorn Software

This module abstracts the functioning of the base platform
The platform object allows services and other scripts to find other faculties
*/


import { BasePlatformFacultiesAPI } from "./faculties.mjs";

import { BaseBaseRPCServer } from "../comm/rpc/base-base-rpc.mjs";
import { Platform } from "../platform.mjs";

import platform_credentials from '../secure/credentials.mjs'

import { BaseToFacultyRemoteMethods } from '../comm/rpc/faculty-base-remote-methods.mjs';
import quick from '../database/quick.mjs';
import { BasePlatformHTTPAPI } from "./net/http/api/api.js";
import util from 'util';
import { BasePlatformHTTPManager } from "./net/http/platform-http-manager.js";
import { BasePlatformErrorAPI } from "./errors.js";
import LanguageController from "./lang/controller.mjs";



export class BasePlatform extends Platform {


    /**
     * Don't call the constructor. Instead, call the method create()
     */

    constructor(rpc_server) {

        super();


        // If there's already a platform object, let's just use it
        // We wanna maintain a single instance
        if (Platform.get()) {
            return Platform.get();
        }

        if (rpc_server && !(rpc_server instanceof BaseBaseRPCServer)) {
            throw new Error(`BaseBaseRPCServer (first parameter) is invalid. Its preferable you call BasePlatform.init() after calling the constructor with no parameters`)
        }
        if (rpc_server) {
            /** @type {BaseBaseRPCServer} */
            this.rpc_server = rpc_server;
        }

        process.on('SIGINT', () => {
            this.exit()
        })
        process.on('SIGTERM', () => {
            this.exit()
        })

        process.on('uncaughtException', (e) => {
            console.log(`Uncaught exception in the BasePlatform\n`, e)
        })


    }

    /**
     * Initialize the BasePlatform
     * @param {object} param0 
     * @param {Number} param0.port The port on which the platform is going to communicate with Faculties, as well as others
     */
    async init({ port } = {}) {
        //Automatically initialize the platform by picking credentials from the secure settings

        for (let p of ['', 'S']) {
            if (!process.env[`HTTP${p}_PORT`]) {
                throw new Error(`Sorry, pass the environment variable ${`HTTP${p}_PORT`.cyan}, as a number`)
            }
        }

        const server_domains = {}

        for (let key of ['PLAINTEXT', 'SECURE']) {
            if (!process.env[`DOMAIN_${key}`]) {
                throw new Error(`Unfortunately, the environment variable ${`DOMAIN_${key}`.blue.blue} is missing. Please set it, so that server knows it's own address.`)
            }

            server_domains[key.toLowerCase()] = process.env[`DOMAIN_${key}`]

        }

        let returns = await this.init0({ port, key: platform_credentials.tls_key, cert: platform_credentials.tls_cert, database_credentials: platform_credentials.database_config, http_port: new Number(process.env.HTTP_PORT).valueOf(), https_port: new Number(process.env.HTTPS_PORT).valueOf(), server_domains })
        this.events.emit('booted')
        return returns;
    }


    /**
     * This method does the actual work of initializing the BasePlatform with credentials
     * @param {object} param0 
     * @param {database_params} param0.database_credentials
     * @param {number} param0.port The port the platform will bind to
     * @param {Buffer} param0.key The system TLS private key
     * @param {Buffer} param0.cert The system TLS certificate
     * @param {Buffer} param0.ca The system certificate authority
     * @param {number} param0.http_port
     * @param {number} param0.https_port
     * @param {object} param0.server_domains
     * @param {string} param0.server_domains.plaintext
     * @param {string} param0.server_domains.secure
     * 
     */
    async init0({ port, key, cert, ca, database_credentials, http_port, https_port, server_domains } = {}) {

        if (!port || !key || !cert) {
            throw new Error(`Please pass the following parameters: 'port', 'key', 'cert', and (optionally) 'ca'`)
        }

        /**
         * RPC server, to communicate with brother-platforms
         */
        this.rpc_server = await BaseBaseRPCServer.create({ port, key, cert, ca }, new BaseToFacultyRemoteMethods(this))

        this.port = port;
        this.descriptor = {
            key, cert, ca
        }

        let brooker;
        try {
            brooker = await quick(database_credentials)
        } catch (e) {
            throw new Error(
                util.formatWithOptions({ colors: true }, `Could not startup Base Platform because database credentials are either invalid, or the database is not running. Check credentials at ${'platform/secure/database.json'.blue} and ${'platform/secure/credentials.js'.blue}.\nThe current credentials:\n%o\nMore Info\n${e}`, database_credentials)
            )
        }

        this.database = {
            connection: brooker,
            credentials: platform_credentials.database_config
        }

        Reflect.defineProperty(this.database, 'brooker', {
            get: () => {
                console.trace(`BasePlatform.prototype.database.brooker is deprecated. Use BasePlatform.prototype.database.connection instead`)
                return this.database.connection
            }
        })

        this.errors = new BasePlatformErrorAPI(this);

        this.faculties = new BasePlatformFacultiesAPI(this);


        //Then the channel via which faculties can communicate back to the server
        this.faculty_remote_methods = new BaseToFacultyRemoteMethods(this)

        await this.startHTTP(http_port, https_port);
        /** This is an api available to faculties that provides features related to HTTP */
        this.faculty_http_api = new BasePlatformHTTPAPI(this);

        this.server_domains = server_domains

        super.init()


        this.lang = new LanguageController()
    }


    /**
     * This method is called during init to startup an HTTP server, which can then handle routing
     * @param {number|undefined} http_port
     * @param {number|undefined} https_port
     */
    async startHTTP(http_port = 4141, https_port = 4142) {
        let http_manager = new BasePlatformHTTPManager(this, { http_port, https_port })
        await http_manager.init()
        this.http_manager = http_manager;
    }

    /**
     * This is a map of which faculties have routed connections and which paths they have claimed
     */
    get urlMap() {
        //Clients need to know which faculty is located at which url endpoint
        //TODO: Also get url maps from Brother platforms and combine them
        return { ...this.urlMap0 }
    }

    get urlMap0() {
        return this.faculty_http_api.map
    }

    /**
     * @deprecated
     * Use `errors.map` instead.
     */
    get errorMap() {
        console.warn(`BasePlatform.prototype.errorMap is depreciated.\nUse BasePlatform.prototype.errors.map instead\n${new Error().stack.split('\n').slice(1).join('\n')}`)
        return this.errors.map
    }

    async exit() {
        console.log(`\nExiting\n`.red)
        //Close faculties
        for (var faculty of this.faculties?.members || []) {
            try {
                await faculty.process.kill()
                console.log(`Stopped ${faculty.descriptor.label.blue}`)
            } catch (e) {
                console.log(`Could not stop ${faculty.descriptor.label.blue} !\n`, e)
            }

        }
        console.log(`\nGoodbye !\n`.cyan)
        await new Promise(x => setTimeout(x, 500))
        super.exit()
    }
    get type() {
        return 'base'
    }



    /**
     * 
     * @param {string} ip 
     * This method is used to connect to a remote platform, for the purposes of reaching other faculties and enjoying their services
     */
    async connect(ip) {

    }

    /** @returns {BasePlatform} */ static get() {
        return super.get(...arguments);
    }



}