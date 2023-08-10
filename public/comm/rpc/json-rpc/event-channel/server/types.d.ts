/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * The json-rpc/event-channel/system module
 * This submodule (types), contains type definitions for the system module
 */

import JSONRPC from "../../json-rpc.mjs"
import EventChannelServer from "./sever.mjs"



export type ClientTable = {
    [id: string]: JSONRPC[]
}

export type ExtractRegisterData<T> = T extends EventChannelServer<infer RegistrationData> ? RegistrationData : undefined

interface ClientOptions {
    timeout?: number
    precallWait?: number
    retries?: number
    retryDelay?: number
}

type MassCallReturns<value> = Promise<{
    [id: string]: (Promise<Awaited<value>>)[]
}>

export type MassCallInterface<T> =
    T extends (...args: (infer input)[]) => infer value ? (...args: input[]) => MassCallReturns<value>
    :
    T extends string | number | boolean | symbol | undefined ? T
    :
    {
        [K in keyof T]: MassCallInterface<T[K]>
    }