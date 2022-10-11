/**
 * Copyright 2022 HolyCorn Software
 * The Soul System.
 * This module provides simpler access to collections used by the BasePlatform in relation to language
 */

import { CollectionProxy } from "../../database/collection-proxy.js";



const namespace = `lang`


/**
 * @type {{
 *      config: import("./types.js").LanguageConfigCollection,
 *      strings: import("./types.js").LanguageStringsCollection
 * }}
 */
const langCollections = new CollectionProxy(
    {
        config: `${namespace}.config`,
        strings: `${namespace}.strings`
    }
)
export default langCollections;