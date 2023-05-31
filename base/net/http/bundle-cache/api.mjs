/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (api), creates APIs, for the use of the bundle-cache, in the BasePlatform
 */

import BundleCacheServer from "../../../../http/bundle-cache/server/server.mjs";
import { BasePlatform } from "../../../platform.mjs";
import collections from "./collections.mjs";


const server = Symbol()

export default class BaseBundleCacheAPI {

    constructor() {

        const base = BasePlatform.get();

        this[server] = new BundleCacheServer(
            base.http_manager.platform_http,
            [
                base.server_domains.plaintext,
                base.server_domains.secure
            ],
            collections.requestMap
        );

        this.remote = new Remote(this)
        this.base = this[server].map

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
     * @type {soul.http.bundlecache.VersionReporterHooks['addURL']}
     */
    async addURL(url) {
        this[parent][server].map.addURL(url)
    }
    /**
     * @type {soul.http.bundlecache.VersionReporterHooks['removeURL']}
     */
    async removeURL(url) {
        this[parent][server].map.removeURL(url)
    }
    /**
     * @type {soul.http.bundlecache.VersionReporterHooks['updateVersion']}
     */
    async updateVersion(url) {
        this[parent][server].map.updateVersion(url)
    }
}