/**
 * Copyright 2022 HolyCorn Software
 * The Soul System
 * 
 * This module contains type definitions for it's parent module (rpc)
 */


import JSONRPC from './json-rpc/json-rpc.mjs'
import ClientJSONRPC from './websocket-rpc.mjs'

export type Connection = { remote: GeneralPublicRPC } & ClientJSONRPC

export type GeneralPublicRPC = import('system/comm/rpc/faculty-public-methods.mjs').FacultyPublicMethods

type AggregateRPCTransform<T> = {
    [K in keyof T]: {
        $jsonrpc: ClientJSONRPC
    } & Merge$0<Promisify<T[K]>>
}



type Primitive = string | number | boolean | symbol | undefined | AsyncGenerator

/**
 * This type ensures that all functions in the input parameter return a promise
 */
type Promisify<T> =
    T extends (...args: infer Input) => Promise ? T :

    T extends Primitive ? T
    :
    T extends (...args: infer Input) => infer Ret ? (...args: Input) => Promise<Promisify<Ret>>
    :
    {
        [K in keyof T]: Promisify<T[K]>
    }

/**
 * This interface takes away the $0 parameter from an object, by replacing the object with the value of $0
 * $0 is often used as workaround in situations, where we want to return custom data from
 * a typescript constructor
 * For example, this is not possible
 * ```ts
 * declare var ActiveObjectSource: {
 *      new <T>():  T
 * }
 * 
 * ```
 * 
 * So, we do this
 * ```
 * declare var ActiveObjectSource: {
 *      new <T>(): {
 *          $0: T
 *      }
 * }
 * ```
 * 
 * And now, we want a way to get rid of the $0.
 * 
 * That's where the Merge$0 comes in
 * 
 */
type Merge$0<T> = T extends ZeroType<infer ZerT> ? Merge$0<ZerT>
    :
    T extends Primitive ? T
    :
    T extends (...args: infer Input) => infer Ret ? (...args: Input) => MaintainPromise<Ret>
    : {
        [K in keyof T]: Merge$0<T[K]>
    }


interface ZeroType<T = {}> {
    $0: T
}
type MaintainPromise<T> = T extends Promise<infer Dat> ? Promise<Awaited<Merge$0<Dat>>> : Merge$0<T>



global {
    namespace rpc {
        type hcRPC = AggregateRPCTransform<rpc.Public>

        declare var HcAggregateRPC: {
            new(): hcRPC
        }


    }

    namespace soul.comm.rpc {

        type AggregateRPCTransform<T> = {
            [K in keyof T]: {
                $jsonrpc: ClientJSONRPC
            } & Promisify<Merge$0<T[K]>>
        }

    }


}


type LocalStorageJSONRPCCacheStorage = {
    [method: string]: { params: any[], value: any, expiry: number, tag?: string }[]
}