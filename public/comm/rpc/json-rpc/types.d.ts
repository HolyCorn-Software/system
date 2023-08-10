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
    resends: number

}

interface ActiveObjectConfig {
    /** 
     * This specify the number of milliseconds since last access,
     * that the object is allowed to live
     * 
     */
    timeout: number
}


global {
    namespace soul.jsonrpc {
        declare var ActiveObjectSource: {
            new <T>(): {
                $0: T
            }
        }

    }
}