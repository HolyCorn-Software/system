/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module contains type definitions needed by the json-rpc module
 */

import { Collection } from "mongodb"



interface JSONRPCMessage {
    /** A unique id representing the message */
    id: string
    /** Version of jsonrpc we are using */
    jsonrpc: '3.0'

    /** This field is set, if the message carries information of a function call  */
    call?: {
        /** The name of the method being called */
        method: string

        /** parameters to the function */
        params: any[]

        /** The call stack leading up to this function call */
        stack: string
    }

    /** This field is present if the message is a return message */
    return?: {
        /** The id of the message we are responding to  */
        message: string
        /** The type of data being returned. Is it actual data, or a remotely iterable loop? */
        type: "data" | "loop"
        /** The name of the method that this message is carrying return information about */
        method: string
        /** This field is present if the function call failed */
        error: {
            code?: string
            stack: string
            message: string
        }
        /** The actual data that is message is meant to carry */
        data: any

        /**
         * If this field is set, the client would cache the data, to reduce subsequent calls.
         */
        cache: JSONRPCMetaOptions['cache']
        /** If this field is set, items would be removed from cache. It contains patterns of tags of items to be removed from cache. */
        rmCache: JSONRPCMetaOptions['rmCache']

        events: JSONRPCMetaOptions['events']

    }

    /** This field is set when the data returned, or parameter passed, is an ActiveObject */
    activeObjectID: string
    /**
     * This field is present when the message received is a chunk of data from a loop
     * or, when the message is an outgoing packet requesting for items of a loop
     */
    loop: {

        output: {
            /** The id of message we are responding to */
            message: string
            data: any[]
            done: boolean
            /** This is set when system encountered an error within the loop */
            error: object
        }
        /** This field is set when requesting for items of a loop */
        request: {
            message: string
        }
    }
    /** 
     * This field is only set when the message is meant for acknowledging a return,
     * or acknowledging a function call
    */
    ack?: {
        /** The ids of the function calls that are being acknowledged */
        ids: string[]
    }

    /** The number of times we've tried to resend this message */
    resends?: number

}

interface JSONRPCMetaOptions {
    /** Directives to store the data in cache */
    cache?: {
        /** The time the object is expected to be considered unusable in the cache.  */
        expiry: number
        /** An optional string that uniquely identifies the item in cache, for easier deletion */
        tag?: string
    }
    /** An array of cache tag patterns, representing items, that should be deleted from the cache as result of this action. */
    rmCache?: string[]

    /**
     * This field allows us trigger certain events after a method is done executing.
     */
    events?: {
        type: string
        data: any
    }[]


}

interface ActiveObjectConfig {
    /** 
     * This specify the number of milliseconds since last access,
     * that the object is allowed to live
     * 
     */
    timeout: number
}

interface JSONRPCCache {
    set: (method: string, params: any[], value: any, expiry: number, tag?: string) => Promise<void>
    get: (method: string, params: any[]) => Promise<{ value: any, expiry: number }>
    erase: () => Promise<void>
    rm: (tags: (string | RegExp)[]) => Promise<void>
}


global {
    namespace soul.jsonrpc {
        declare var ActiveObjectSource: {
            new <T>(): {
                $0: T
            }
        }

        declare var ZeroWrapper: {
            new <T>(): {
                $0: T
            }
        }

    }
}