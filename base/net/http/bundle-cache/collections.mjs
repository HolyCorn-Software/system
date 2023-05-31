/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (collections), contains collections needed by the bundle-cache, at
 * the base level
 */

import { CollectionProxy } from "../../../../database/collection-proxy.js";


/**
 * @type {{requestMap: soul.http.bundlecache.RequestMapCollection}}
 */
const collections = new CollectionProxy(
    {
        'requestMap': 'bundlecache.requestMap'
    }
)

export default collections