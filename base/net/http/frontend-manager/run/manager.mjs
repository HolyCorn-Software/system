/**
 * Copyright 2023 HolyCorn Software
 * The soul system.
 * This module (run), provides features related to running scripts on the front-end, based on triggers (not automatically)
 */

import { BasePlatform } from "../../../../platform.mjs";
import libPath from 'node:path'


export default class RunManager {

    constructor() {

    }

    /**
     * This method returns scripts that are dedicated to a given scope
     * @param {string} scope 
     */
    getScripts(scope) {
        const frontendMan = BasePlatform.get().frontendManager
        const config = frontendMan.fileManager.frontendConfig
        const scripts = []
        for (const url in config) {
            scripts.push(...(config[url].run?.[scope]?.map(script => libPath.resolve(url, '../', script)) || []))
        }

        return new JSONRPC.MetaObject(scripts, { cache: { expiry: 1 * 60 * 60 * 1000 } })
    }

}