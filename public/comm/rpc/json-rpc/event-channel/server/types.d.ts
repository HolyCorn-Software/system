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

type ExtractRegisterData<T> = T extends EventChannelServer<infer RegistrationData> ? RegistrationData : undefined