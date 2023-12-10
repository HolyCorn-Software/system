/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (event-based-extender), is part of the run manager, and allows for easy extension of a system, by using an event-based mechanism, 
 * where an event is dispatched, and then other components respond to the event, with details that can be used
 * to extend the calling component.
 */

import runMan from "./lib.mjs";


const args = Symbol()

/**
 * @template {soul.http.frontendManager.runManager.ui.event_based_extender.EventDataMap[EventName]['output']} Output
 * @template {soul.http.frontendManager.runManager.ui.event_based_extender.EventDataMap[EventName]['input']} Input
 * @template {keyof (soul.http.frontendManager.runManager.ui.event_based_extender.EventDataMap)}EventName
 * @template {soul.http.frontendManager.runManager.ui.event_based_extender.fScopes} ScopeName
 */
export default class EventBasedExtender {


    /**
     * 
     * @param {soul.http.frontendManager.runManager.ui.event_based_extender.Params<EventName, ScopeName>} params 
     */
    constructor(params) {
        this[args] = params
    }

    /**
     * This method is called, so that other components are informed that their input is needed, so that when there's a contribution
     * from a component, the {@link params callback()} method is called, with a promise, that eventually resolves into the data.
     * @param {soul.http.frontendManager.runManager.ui.event_based_extender.FetchArgs<Input, Output>} params 
     * @returns {Promise<void>}
     */
    async fetch(params) {

        // Before we even start any preparations, let's make sure that the components that are to respond to this event are already there
        this[args].autoRunScope && await runMan.addScope(this[args].autoRunScope) && await new Promise(x => setTimeout(x, 100 * Math.random()))


        // These variables control the process, and making it last for a short-enough time period
        let timeoutKey;
        let resolve;
        let ended;
        const timeout = params.timeout || 1000
        const promise = new Promise((okay) => resolve = okay);
        let callbacksPromise = Promise.resolve()

        const scheduleEnd = () => {
            clearTimeout(timeoutKey)

            setTimeout(() => {
                // Now, only resolve this promise, if the callbacks are done (callbacks promise is done).
                callbacksPromise.finally(() => resolve())
                ended = true
            }, timeout)
        }

        // First, let's create the interface via which the components would respond.
        /** @type {soul.http.frontendManager.runManager.ui.event_based_extender.ResponseInterface<Input, Output>} */
        const io = {
            data: params.data,

            /**
             * Other components are going to call this method because they have something that could be added
             * @param {Output} update 
             */
            append: (update) => {

                // In case, this component is calling late...
                if (ended) {
                    throw new Error(`This component responded late to the '${this[args].eventName}' event. If there are long-running tasks, it is better to call the append() method immediately with a promise.`)
                }

                // Wrap this in a promise
                const dataPromise = update instanceof Promise ? update : Promise.resolve(update)

                params.callback(dataPromise)


                // Let's give the other components a little time, if another component has just responded.
                callbacksPromise = Promise.allSettled([dataPromise, callbacksPromise])

                scheduleEnd()
            }
        }


        // So, let's dispatch the event, and give time (1s), for the other components to respond.
        window.dispatchEvent(new CustomEvent(this[args].eventName, { detail: io, bubbles: true, cancelable: false }))

        scheduleEnd()

        // When this promise resolves, then it would mean, that we've given to the caller, all possible extensions that could be found.
        return await promise
    }

    /**
     * Use this interface to listen for events
     * @type {soul.http.frontendManager.runManager.ui.event_based_extender.EventTarget}
     */
    static get eventTarget() {
        return window
    }

}