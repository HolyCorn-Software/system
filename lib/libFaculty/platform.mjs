/*
Copyright 2021 HolyCorn Software
This defines the class of the objects to be passed into newly created faculties
*/

import { Platform } from "../../platform.mjs";
import { FacultyDescriptor } from "./faculty-descriptor.mjs";
import { FacultyPublicMethods } from '../../comm/rpc/faculty-public-methods.mjs'
import quickConnect from '../../database/quick.mjs'
import { Db } from 'mongodb'
import { FacultyBaseCommInterface } from "../../comm/interface/process-interface.mjs";
import { FacultyFacultyInterface, FacultyFacultyRemoteMethods } from "../../comm/rpc/faculty-faculty-rpc.mjs";
import { FacultyConnectionManager } from "./faculty-connection-manager.mjs";
import { HTTPServer } from "../../http/server.js";
import { Exception } from "../../errors/backend/exception.js";
import { Standards } from "./standards.mjs";
import PluginManager from "./plugins/manager.mjs";
import FacultyPluginManagementRemote from "./plugins/remote.mjs";
import FacultyManagementRemote from "./management/manager.mjs";


/**
 * 
 * @property {BaseBaseRPCServer} rpc
 * @property {FacultyDescriptor} descriptor
 * @property {{channel:CommInterface}} base_platform
 */
export class FacultyPlatform extends Platform {

    /**
     * Don't call the constructor when creating a seed platform
     * Rather, call the create() static method
     */
    constructor({ descriptor, database, base, connectionManager, server_domains } = {}) {
        super();

        //The faculty platform contains fields of relevance, such as IPC object, name
        Object.assign(this, arguments[0])

        //Now finish the initialization
        super.init()


        /** This interface defines a set of methods useful for managing access the BasePlatform's HTTP */
        this.base.http = {

            /**
             * This method is used to instruct the BasePlatform to forward requests at a particular path to this
             * @param {object} param0
             * @param {string} param0.remotePath
             * @param {string} param0.localPath
             * @param {Server} param0.http
             */
            claim: ({ remotePath, localPath, http } = {}) => {
                if (!http) {
                    throw new Error(`Please pass an object of type HTTPServer as the 'http' field in the argument`)
                }
                if (!remotePath || !localPath) {
                    throw new Error(`Please specify the ${!remotePath ? 'remotePath' : 'localPath'} field in the argument`)
                }
                return this.base.channel.remote.http.course({ serverPath: remotePath, clientPort: http.port, clientPath: localPath })
            },
            websocket: {

                claim: (param0) => {
                    let { base, local, http } = param0

                    if (typeof http == 'undefined') {
                        throw new Exception("'http' is not defined", { code: 'error.input.validation' })
                    }

                    checkArgs(param0, {
                        local: {
                            path: 'string'
                        }
                    })
                    if (!base?.path && !base?.point) {
                        throw new Exception("Specify either 'base.path' or 'base.point'", {
                            code: 'error.input.validation'
                        })
                    }
                    return this.base.channel.remote.http.webSocketAPI.course({
                        base,
                        faculty: {
                            path: local.path,
                            port: http.port
                        }
                    })
                }
            }
        }

        this.base.shortcutMethods = {
            http: this.base.http
        }

        this.base.exit = () => {
            return this.base.channel.remote.exit()
        }


        /**
         * This interface allows the Faculty to export methods and make them available to others,
         * as well as the Base Platform 
         */
        this.remote = this.base.channel.rpc.stub = {
            internal: new FacultyFacultyRemoteMethods(this),
            public: new FacultyPublicMethods(),
            management: new FacultyManagementRemote()
        }

        this.standard = new Standards();


        /**
         * Since we are depreciating the remoteMethods interface, we set up this error
         */
        let throwRemoteMethodsError = () => { throw Error(`This interface 'remoteMethods' is no longer supported. use remote.internal or remote.public`) }

        Object.defineProperty(this, 'remoteMethods', {
            set: () => throwRemoteMethodsError(),
            get: () => throwRemoteMethodsError()
        })

        //Used by the Connection Manager to determine when Faculties are allowed to make connections with each other
        this.start_time = Date.now();


        /**
         * This is just to help the IDE. Skip it altogether
        */

        /**
         * @type {base} */
        this.base;

        /** @type {FacultyDescriptor} */
        this.descriptor;

        /** @type {Db} */ this.database
        Reflect.defineProperty(this, 'brooker', {
            get: () => {
                console.trace(`FacultyPlatform.prototype.brooker is deprecated. Use FacultyPlatform.prototype.database instead`)
                return this.database
            }
        })

        /** @type {FacultyConnectionManager} */
        this.connectionManager = connectionManager
        Reflect.defineProperty(this, 'facultyConnectionManager', {
            get: () => {
                console.warn(`faculty.facultyConnectionManager is deprecated. Use faculty.connectionManager instead\n${new Error().stack.split('\n').slice(2).join('\n')}`)
                return this.connectionManager
            },
        })

        Reflect.defineProperty(this, 'mainSocketPath', {
            get: () => {

                console.warn(`faculty.mainSocketPath is deprecated. Use faculty.connectionManager.mainSocketPath instead\n${new Error().stack.split('\n').slice(2).join('\n')}`)
                return this.connectionManager.mainSocketPath
            },
            enumerable: true,
            configurable: true
        })

        /** @type {{secure: string, plaintext:string}} */
        this.server_domains = server_domains;

        this.pluginManager = new PluginManager()

    }

    /**
     * Call this method to create a new faculty platform
     * @param {object} param0
     * @param {FacultyDescriptor} param0.descriptor
     * @param {object} param0.server_domains
     * @param {string} param0.server_domains.plaintext
     * @param {string} param0.server_domains.secure
     * @returns {FacultyPlatform}
     */
    static async create({ descriptor, server_domains } = {}) {


        if (!descriptor) {
            throw new Error(`Faculty descriptor missing. Cannot create faculty platform.`)
        }

        let base_faculty_rpc = new FacultyBaseCommInterface()


        base_faculty_rpc.rpc.register('facultyHello', function () {
            console.log(`facultyHello!`)
            return 'Hi';
        });


        try {
            await base_faculty_rpc.remote.serverHello();
        } catch (e) {
            console.log(`Server rejected registration !!!!`.red)
            throw new Error(e);
        }



        //Now, if the BasePlatform has a database, connect to it
        let credentials = await base_faculty_rpc.remote.getDatabaseCredentials()
        let brooker;

        try {
            if (credentials) {
                brooker = await quickConnect(credentials)
            }
        } catch (e) {
            throw new Error(`Could not connect to platform database server. This issue is resulting from the base`)
        }



        const platform = new FacultyPlatform({
            descriptor,
            base: {
                channel: base_faculty_rpc
            },
            database: brooker,
            server_domains
        })
        platform.connectionManager = await FacultyConnectionManager.new(platform)

        return platform;

    }


    /**
    * 
    * @returns {FacultyPlatform}
    */
    static get() {
        return super.get()
    }



}

let checkArgs;

(import('../../util/util.js')).then(x => checkArgs = x.checkArgs);


/**
 *
 * @typedef {{
 * channel: import('../../comm/interface/process-interface.mjs').FacultyBaseCommInterface,
 * shortcutMethods: {http: BaseHTTPAPI}
 * }} base
 * 
 * 
 * 
 * 
 *
 *
 */


/**
 * @typedef {{
 * claim:function({remotePath:string, localPath:string, http:HTTPServer}),
 * websocket:{
 * claim: function({base:{path:string, point:string, regexp:RegExp}, local:{path:string}, http:HTTPServer})
 * }
 * }} BaseHTTPAPI
 * 
 */