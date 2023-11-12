/**
 * Copyright 2023 HolyCorn Software
 * The soul system.
 * This module allows frontend components to make use of features related to running scripts
 */

import hcRpc from "../comm/rpc/aggregate-rpc.mjs"


const scopes = Symbol()

class RunManager {

    constructor() {
        /** @type {Set<string>} */
        this[scopes] = new Set()
    }

    /**
     * This method adds a current run scope to the page.
     * 
     * This means, scripts dedicated to that scope get to run.
     * @param {string} scope 
     * @returns {Promise<void>}
     */
    async addScope(scope) {
        const scripts = await hcRpc.system.frontendManager.run.getScripts(scope)
        await Promise.allSettled(
            scripts.map(script => import(script).catch(e => console.warn(`Could not import script ${script} for scope ${scope}`)))
        )
    }

}


const runMan = new RunManager()

export default runMan


