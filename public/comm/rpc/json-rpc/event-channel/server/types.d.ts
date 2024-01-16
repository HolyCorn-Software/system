/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * The json-rpc/event-channel/system module
 * This submodule (types), contains type definitions for the system module
 */

import JSONRPC from "../../json-rpc.mjs"
import JSONRPCDefaultStub from "../../stub.mjs"
import EventChannelServer from "./sever.mjs"



export type ClientTable = {
    [id: string]: JSONRPC[]
}

export type ExtractRegisterData<T> = T extends EventChannelServer<infer RegistrationData> ? RegistrationData : undefined

global {
    namespace soul.comm.rpc.event_channel {

        interface ClientOptions {
            /**
             * This field controls a special feature, meant to improve the efficiency of events.
             * 
             * Aggregation is the situation where only one event is fired when multiple events arrive almost at the same time.
             */
            aggregation: {
                /** 
                 * This is how long we ought to wait, to see if another event is coming.
                 */
                timeout: number
                /**
                 * This field tells us how to judge that two events of the same name are similar.
                 * 
                 * If true, then two events can only be similar, if they carry the same data, and event names.
                 */
                sameData?: boolean
            }
            exclude: string[]
            timeout?: number
            precallWait?: number
            retries?: number
            retryDelay?: number
        }

        type MassCallReturns<value> = Promise<{
            [id: string]: (Promise<Awaited<value>>)[]
        }>

        export type MassCallInterface<T = {}> =
            T extends (...args: (infer input)[]) => infer value ? (...args: input[]) => MassCallReturns<value>
            :
            T extends string | number | boolean | symbol | undefined ? T
            :
            {
                [K in keyof T]: MassCallInterface<T[K]>
            } & { $rpc: MassCallInterface<JSONRPCDefaultStub> }

    }

}