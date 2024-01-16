/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module allows for shorter UUIDs to be generated, that are particularly for json-rpc
 */

import _uuid from "../../uuid/uuid.mjs";



export default function uuid() {
    return _uuid().substring(0, 6)
}
