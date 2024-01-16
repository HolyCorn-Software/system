/**
 * Copyright 2022 HolyCorn Software
 * This module contains type definitions for the decoder-stream module
 */


export declare interface WebSocketFrameHeader {
    fin: boolean
    rsv1: boolean
    rsv2: boolean
    rsv3: boolean
    mask: Buffer
    type: ('binary' | 'text' | 'continue' | 'close' | 'special')
    payloadLength: number
    buffer: Buffer

}