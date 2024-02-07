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
            aggregation?: {
                /** 
                 * This is how long we ought to wait, to see if another call is coming.
                 * 
                 * If this is not set, then the {@link precallWait} property would be considered, or a default 500ms delay would be considered.
                 */
                timeout?: number
                /**
                 * This field tells us how to judge that two events of the same name are similar.
                 * 
                 * If true, then two events can only be similar, if they carry the same data, and event names.
                 */
                sameData?: boolean

                /**
                 * There are times when a task meets another, that's already on the way, without the possibility of cancelation.
                 * If that happens, do we continue with the current task? 
                 */
                allowDuplicate?: boolean
            }
            exclude?: string[]
            timeout?: number
            /**
             * This field determines how long the server should wait, if clients have not been found
             */
            precallWait?: number

            /**
             * This field tells us how many clients are expected to be reached. 
             * We'll wait untill we've had this number of clients, or the {@link precallWait} time has reached.
             */
            expectedClientLen?: number

            retries?: number
            retryDelay?: number

            /** If this is set, errors would be ignored */
            noError?: boolean
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