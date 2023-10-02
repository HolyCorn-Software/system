/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (collections), contains collections needed by the bundle-cache, at
 * the base level
 */

import { CollectionProxy } from "../../../../database/collection-proxy.js";


/**
 * @type {{versionInfo: soul.http.frontendManager.fileManager.VersionInfoCollection}}
 */
const collections = new CollectionProxy(
    {
        'versionInfo': 'frontendManager.versionInfo'
    }
)

export default collections