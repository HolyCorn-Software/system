/**
 * Copyright 2023 HolyCorn Software
 * The soul system.
 * This module allows frontend components to make use of features related to running scripts
 */

import hcRpc from "../comm/rpc/aggregate-rpc.mjs"


const scripts = Symbol()

class RunManager {

    constructor() {
        /** @type {Set<string>} */
        this[scripts] = new Set()
    }

    /**
     * This method adds a current run scope to the page.
     * 
     * This means, scripts dedicated to that scope get to run.
     * @param {string} scope 
     * @returns {Promise<void>}
     */
    async addScope(scope) {
        const nwScripts = (await hcRpc.system.frontendManager.run.getScripts(scope)).filter(x => !this[scripts].has(x))
        await Promise.allSettled(
            nwScripts.map(
                async script => {
                    try {
                        await import(script)
                        this[scripts].add(script)
                    } catch (e) {
                        console.warn(`Could not import script ${script} for scope ${scope}`, e)
                    }
                }
            )
        )
    }

}


export class MyEventTarget {

    /**
     * @template {keyof soul.http.frontendManager.runManager.ui.event_based_extender.EventDataMap} K
     * @param {K} event 
     * @param {(event: CustomEvent<soul.http.frontendManager.runManager.ui.event_based_extender.ResponseInterface<soul.http.frontendManager.runManager.ui.event_based_extender.EventDataMap[K]['input'], soul.http.frontendManager.runManager.ui.event_based_extender.EventDataMap[K]['output']>>) => void} callback 
     * @param {AddEventListenerOptions} opts 
     */
    addEventListener(event, callback, opts) {

    }
}


const runMan = new RunManager()

export default runMan


