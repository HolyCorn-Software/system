/*
Copyright 2022 HolyCorn Software
The Soul System.
This module (collections.js) provides and controls access to standard collections used by the session-storage grand module in order to store sessions and retrieve them from the database
*/

import { Collection as C } from "mongodb";
import { CollectionProxy } from "../../../../database/collection-proxy.js";


let namespace = `sessionStorage`

/**
 * @type {{
 * sessionStorage: C<import("./types.js").SessionData>
 * }}
 */
let collectionProxy = new CollectionProxy({
    sessionStorage: `${namespace}.storage`
})

export default collectionProxy