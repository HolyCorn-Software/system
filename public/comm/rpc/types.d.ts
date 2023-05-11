/**
 * Copyright 2022 HolyCorn Software
 * The Soul System
 * 
 * This module contains type definitions for it's parent module (rpc)
 */


import JSONRPC from './json-rpc/json-rpc.mjs'
import { ClientJSONRPC } from './websocket-rpc.mjs'

export type Connection = { remote: GeneralPublicRPC } & ClientJSONRPC

export type GeneralPublicRPC = import('system/comm/rpc/faculty-public-methods.mjs').FacultyPublicMethods

type AggregateRPCTransform<T> = {
    [K in keyof T]: {
        $jsonrpc: JSONRPC
    } & T[K]
}