/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module contains type definitions for event-channel module
 */


import ''

global {
    namespace soul.comm.rpc.event_channel {
        interface StarredCustomEvent<T, E> extends Event {
            detail: {
                type: E
                detail: T
            }
        }
        type EventClientEventTarget<T = {}> = {
            [K in keyof T as 'addEventListener' | 'removeEventListener']: (
                (
                    (type: K, callback: (event: CustomEvent<T[K]>) => void, opts?: K extends 'removeEventListener' ? never : AddEventListenerOptions) => void
                )
                |
                (
                    (type: '*', callback: (event: StarredCustomEvent<T[K], K>) => void, opts?: K extends 'removeEventListener' ? never : AddEventListenerOptions) => void
                )
            )
        } & {
                [K in keyof T as 'addEventListener' | 'removeEventListener']: (

                    (type: 'init', callback: (event: CustomEvent<T[K]>) => void, opts?: K extends 'removeEventListener' ? never : AddEventListenerOptions) => void

                )
            } & EventTarget
    }
}