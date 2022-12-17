/*
Copyright 2021 HolyCorn Software
This module brings together all the features available to client
over http, that are directly associated with the base platform
*/

import { FacultyDescriptor } from "../../../lib/libFaculty/faculty-descriptor.mjs";
import { SocketPublicJSONRPC } from "../../../comm/rpc/socket-public-rpc.mjs";
import utils from "../../../comm/utils/utils.mjs";
import { HTTPServer } from "../../../http/server.js";
import { StrictFileServer } from "../../../http/strict-file-server.js";
import { SystemPublicMethods } from "../rpc/api.mjs";



export class SystemHTTP extends HTTPServer {


    /**
     * 
     * @param {number} port 
     * @param {import('./platform-http-manager.js').BasePlatformHTTPManager} manager 
     */
    constructor(port, manager) {
        super(port)

        this.system_path = '/$/system/'

        manager.http_server.course({
            localPath: this.system_path,
            remoteURL: `http://127.0.0.1:${this.port}/`
        })

        this.route({
            point: '/maps/faculties', callback: (req, res) => {
                const map = {}
                manager.base.faculties.members.forEach(faculty => {
                    map[faculty.descriptor.name] = { ...faculty.descriptor }
                    /** @type {keyof FacultyDescriptor} */
                    const restricted = ['path', 'set_properties', 'init', 'errors', 'errorsV2', 'plugin', 'name']
                    for (let property of restricted) {
                        delete map[faculty.descriptor.name][property]
                    }
                })
                res.endJSON(map)
            }
        })
        this.route({
            point: '/maps/websockets',
            callback: (req, res) => {
                res.endJSON(manager.base.faculty_http_api.webSocketAPI.map)
            }
        })

        this.route({
            point: '/maps/errors',
            callback: (req, res) => {
                res.endJSON(manager.base.errors.map)
            }
        })

        //Since ES6 is universal, we simply share necessary libraries to the client
        new StrictFileServer({
            http: this,
            urlPath: `/static/`,
            refFolder: '../../../public/'
        }, import.meta.url).add(
            '../../../public/',
        );


        //Now setup the system's rpc, independent of the other faculties.
        //It provides useful functions such as error reporting, usage statistics
        this.system_rpc_point = `/rpc`


        let rpc_stub = new SystemPublicMethods()
        this.websocketServer.route({
            // point: this.system_rpc_point,
            point: '/rpc',
            callback: (req, client) => {
                new SocketPublicJSONRPC(client, rpc_stub)
            }
        });


        //Channel the rpc requests meant for the system to the appropriate headquarters
        manager.http_server.websocketServer.course({
            path: this.system_path,
            remoteURL: `ws://127.0.0.1:${this.port}/`
        })


    }


    /**
     * 
     * @param {import('./platform-http-manager.js').BasePlatformHTTPManager} manager 
     * @returns {Promise<SystemHTTP>}
     */
    static async new(manager) {
        return new this(await utils.findOpenPort(), manager)
    }


}