/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (frontend-manager), contains utilities for manipulating the client's experience on the front-end.
 */

import BaseBundleCacheAPI from "./bundle-cache/api.mjs";
import FileManager from "./file-manager/manager.mjs";
import collections from './collections.mjs'
import AutoRunManager from "./auto-run/manager.mjs";
import RunManager from "./run/manager.mjs";


export default class FrontendManager {

    constructor() {

        this.fileManager = new FileManager(collections.versionInfo)
        this.autorun = new AutoRunManager()
        this.bundlecache = new BaseBundleCacheAPI(this)
        this.run = new RunManager()
    }

    setup() {
        return Promise.all(
            [
                this.autorun.setup(),
                this.bundlecache.setup()
            ]
        )
    }

}