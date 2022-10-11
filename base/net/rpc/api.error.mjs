/**
 * Copyright 2022 HolyCorn Software
 * This module allows the BasePlatform to provide public methods related to error management
 */


import { SocketPublicJSONRPC } from "../../../comm/rpc/socket-public-rpc.mjs";


export class BasePublicErrorAPI {

    constructor(){

    }

    /**
     * The client calls this to report errors to the server
     */
    async report(...errors){
        let [, ...errordata] = arguments;
        /** @type {SocketPublicJSONRPC} */
        let client = arguments[0]
        console.warn(`${'Client Error'.bold.red}\n\n`, ...errordata, `\n${'.'.repeat(process.stdout.columns*0.75)}\n\t\tAddress: ${client.socketClient.socket.address().address?.blue?.bold}`)
    }
    
}