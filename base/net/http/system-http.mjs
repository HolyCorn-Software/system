/*
Copyright 2021 HolyCorn Software
This module brings together all the features available to client
over http, that are directly associated with the base platform
*/

import VersionReporter from "../../../http/bundle-cache/client/version-reporter.mjs";
import { SocketPublicJSONRPC } from "../../../comm/rpc/socket-public-rpc.mjs";
import utils from "../../../comm/utils/utils.mjs";
import { SystemPublicMethods } from "../rpc/api.mjs";
import { BasePlatform } from "../../../base/platform.mjs";
import libPath from 'node:path'
import libUrl from 'node:url'



export default class SystemHTTP extends HTTPServer {


    /**
     * 
     * @param {number} port 
     * @param {import('./platform-http-manager.js').BasePlatformHTTPManager} manager 
     */
    constructor(port, manager) {
        super(port)

        this.system_path = '/$/system/'

        manager.platform_http.course({
            localPath: this.system_path,
            remoteURL: `http://0.0.0.0:${this.port}/`
        })

        this.route({
            point: '/maps/faculties', callback: (req, res) => {
                const map = {}
                manager.base.faculties.members.forEach(faculty => {
                    map[faculty.descriptor.name] = { ...faculty.descriptor }
                    /** @type {keyof import("system/lib/libFaculty/types.js").FacultyDescriptor} */
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
                res.endJSON({ error: "Not Supported" })
            }
        })

        const publicDir = '../../../public/';
        //Since ES6 is universal, we simply share necessary libraries to the client
        new StrictFileServer({
            http: manager.platform_http,
            urlPath: `/$/system/static/`,
            refFolder: publicDir,
            cache: true
        }, import.meta.url).add(
            publicDir,
        );

        BasePlatform.get().events.addListener('booted', () => {
            new VersionReporter(
                BasePlatform.get().bundlecache.base
            ).watch(
                libPath.normalize(`${this.system_path}/static`) + '/',
                libUrl.fileURLToPath(new URL(publicDir, import.meta.url).href)
            )
        })



        //Now setup the system's rpc, independent of the other faculties.
        //It provides useful functions such as error reporting, usage statistics
        this.system_rpc_point = `/rpc`


        let rpc_stub = new SystemPublicMethods()
        this.websocketServer.route({
            point: this.system_rpc_point,
            callback: (req, client) => {
                new SocketPublicJSONRPC(client, rpc_stub)
            }
        });


        //Channel the rpc requests meant for the system to the appropriate headquarters
        manager.platform_http.websocketServer.course({
            path: this.system_path,
            remoteURL: `ws://0.0.0.0:${this.port}/`
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