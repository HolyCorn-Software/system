/*
Copyright 2022 HolyCorn Software
The Soul System
This module allows faculties to access the websockets api from the BasePlatform
*/

const platform = Symbol()

export class WebSocketsAPI {


    /**
     * 
     * @param {import('../../../platform.mjs').BasePlatform} _platform 
     */
    constructor(_platform) {
        /** @type {import('../../../platform.mjs').BasePlatform} */
        this[platform] = _platform
        this.map = {
            system: [
                { point: `${this[platform].http_manager.system_http.system_path.substring(0, this[platform].http_manager.system_http.system_path.length - 1)}${this[platform].http_manager.system_http.system_rpc_point}` }
            ]
        }
    }
    /**
     * 
     * @param {{
     * base:{
     * path:string,
     * point: string,
     * regexp: RegeExp,
     * },
     * faculty:{
     * path:string,
     * port:string
     * }
     * }} params
     */
    async course(params) {
        let [facultyInterface, { base, faculty }] = arguments

        if (!base?.path && !base?.point && !base?.regexp) {
            throw new Error(`Invalid parameters. The 'base' attribute is missing or is missing a 'path', 'point' or 'regexp' property`)
        }

        if (!faculty?.path) {
            throw new Error(`Please specify the faculty.path parameter`)
        }

        await this[platform].http_manager.platform_http.websocketServer.course({
            ...base,
            remoteURL: `ws://127.0.0.1:${faculty.port}${faculty.path}`
        });

        this.map[facultyInterface.descriptor.name] ||= []
        this.map[facultyInterface.descriptor.name].push({ point: base.point });

        //Prevent the system's rpc point from being overridden
        this.map['system'] = [
            { point: `${this[platform].http_manager.system_http.system_path.substring(0, this[platform].http_manager.system_http.system_path.length - 1)}${this[platform].http_manager.system_http.system_rpc_point}` }
        ]

        console.log(`WebSocket requests via ${(base.path ? `path ${base.path}` : base.point ? `endpoint ${base.point}` : '<Error>').blue} are forwarded to ${faculty.path.blue} on an http server in ${facultyInterface.descriptor.label.blue} running on port ${faculty?.port?.toString().blue} `)

    }

}