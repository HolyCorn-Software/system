/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (api), creates APIs, for the use of the bundle-cache, in the BasePlatform
 */

import { BasePlatform } from "../../../../platform.mjs";
import FrontendManager from "../manager.mjs";
import BundleCacheServer from "./server.mjs";


const server = Symbol()
const frontendManager = Symbol()

export default class BaseBundleCacheAPI {

    /**
     * 
     * @param {FrontendManager} _frontendManager 
     */
    constructor(_frontendManager) {

        const base = BasePlatform.get();

        this[server] = new BundleCacheServer(base.http_manager.platform_http);

        this.remote = new Remote(this)

        this.base = this[server]

        this[frontendManager] = _frontendManager

    }

    setup() {
        this[server].setup()
    }




}

const parent = Symbol()

/**
 * This class provides methods for faculties who may add to the wealth of cache information
 */
class Remote {

    /**
     * 
     * @param {BaseBundleCacheAPI} cacheAPI 
     */
    constructor(cacheAPI) {
        this[parent] = cacheAPI

        return new FunctionProxy.SkipArgOne(this)
    }

    /**
     * @type {soul.http.frontendManager.fileManager.VersionReporterHooks['addURL']}
     */
    async addURL(url, path, size) {
        this[parent][frontendManager].fileManager.addURL(url, path, size)
    }
    /**
     * @type {soul.http.frontendManager.fileManager.VersionReporterHooks['removeURL']}
     */
    async removeURL(url) {
        this[parent][frontendManager].fileManager.removeURL(url)
    }
    /**
     * @type {soul.http.frontendManager.fileManager.VersionReporterHooks['updateVersion']}
     */
    async updateVersion(url, path, size) {
        this[parent][frontendManager].fileManager.updateVersion(url, path, size)
    }
}