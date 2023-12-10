/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module, contains type definitions necessary for the run manager
 */


import ''

global {
    namespace soul.http.frontendManager.runManager.ui.event_based_extender {
        interface Params<EventName extends (keyof EventDataMap), AutoRunScope extends fScopes> {
            eventName: EventName
            autoRunScope: AutoRunScope
        }

        interface FetchArgs<Input, Output> {
            data: Input
            callback: (result: Promise<Output>) => void
            timeout: number
        }

        interface EventDataMap {
            'example-event': {
                input: {
                    customField: string
                    someValue: number
                }
                output: {
                    external1: string
                    external2: number
                }
                scope: 'example-scope'
            }
        }

        type _GetScopes<T = EventDataMap> = {
            [K in keyof T]: T[K]['scope']
        }
        type fScopes = _GetScopes[keyof _GetScopes]

        interface ResponseInterface<Input = {}, Output = {}> {
            append: (input: Promise<Output> | Output) => void
            data: Input
        }

        type EventTarget = {
            [K in keyof EventDataMap as 'addEventListener' | 'removeEventListener']: (event: K, callback: (event: CustomEvent<ResponseInterface<EventDataMap[K]['input'], EventDataMap[K]['output']>>) => void, opts?: AddEventListenerOptions) => void
        }
    }


}