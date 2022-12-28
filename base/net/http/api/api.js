/*
Copyright 2021 HolyCorn Software
This class provides standard methods related to HTTP for components that interact with the BasePlatform
*/

import { BaseSessionStorageAPI } from '../session-storage/api.js'
import { WebSocketsAPI } from './websockets.js'


export class BasePlatformHTTPAPI {

    /**
     * 
     * @param {import('../../../platform.mjs').BasePlatform} platform 
     */
    constructor(platform) {
        this.#platform = platform
        this.map = {} //Which faculties are at which url ?
        this.websocketMap = {}
        Reflect.defineProperty(this, `websocketMap`, {
            get: () => {
                console.trace(`http_api.websocketMap is deprecated. Use http_api.webSocketAPI.map `)
                return this.webSocketAPI.map
            },
            configurable: true,
            enumerable: true
        })
        this.webSocketAPI = new WebSocketsAPI(platform);
        this.sessionAPI = new BaseSessionStorageAPI()
    }
    #platform

    /**
     * This method is used to forward some of the platform (BasePlatform)'s HTTP requests to a remote destination
     * This remote destination is intended to be a faculty, reason why rpcPort is a parameter
    */
    course = (function (faculty, { serverPath, clientPort, clientPath }) {
        console.log(`Routing ${serverPath.blue} to ${clientPath} on an http server in ${faculty.descriptor.label.blue} running on port ${clientPort.toString().blue} `)
        this.#platform.http_manager.http_server.course({ localPath: serverPath, remoteURL: `http://127.0.0.1:${clientPort}${clientPath}` });

        this.map = {
            ...this.map,
            [faculty.descriptor.name]: serverPath
        }
    }).bind(this)


    /**
     * This method is used to cancel a routing decision
     * @param {object} param0 
     * @param {string} param0.path
     * @return {Promise<void>}
     */
    async deRoute(param0) {

        param0 = arguments[1]

        /** @type {import('system/lib/libFaculty/faculty.mjs').Faculty} */
        const faculty = arguments[0]

        if (this.map[faculty.descriptor.name]?.serverPath !== param0.path) {
            throw new Error(`Only the faculty that claimed the path '${param0.point}' may deroute it.`)
        }

        this.#platform.http_manager.http_server.deRoute({ path: param0.path })



    }



}
