/**
 * Copyright 2022 HolyCorn Software
 * This module allows the BasePlatform to provide public methods related to error management
 */


import { BasePlatform } from "../../platform.mjs";
import { SocketPublicJSONRPC } from "../../../comm/rpc/socket-public-rpc.mjs";


export class BasePublicErrorAPI {

    constructor() {

    }

    /**
     * The client calls this to report errors to the server
     */
    async report(...errors) {
        let [, ...errordata] = arguments;
        /** @type {SocketPublicJSONRPC} */
        let client = arguments[0]
        // TODO: Remove special characters like \x1Bc from the client's input, at a deep level, to prevent log poisoining.
        // Image a client clears the log, and then adds a misleading input, like a false report, that causes the engineer to do something rather harmful to the platform.
        console.error(`${'Client Error'.bold.red}\n\n`, ...errordata, `\n${'.'.repeat(process.stdout.columns * 0.75)}\n\t\tAddress: ${client.socketClient.socket.address().address?.blue?.bold}\n\tTime: ${new Date()}`)

        // In case a faculty has a way of reaching an Engineer to tell him of the error, let it do so.
        BasePlatform.get().faculties.events.dispatchEvent(
            new CustomEvent(
                'client-error',
                {
                    detail: errordata
                }
            )
        )
    }

}