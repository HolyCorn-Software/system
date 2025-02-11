/**
 * Copyright 2022 HolyCorn Software
 * This module just makes it easier for the client-side to access system-provided public methods
 */


import hcRpc from './aggregate-rpc.mjs';

/**
 * @deprecated
 * Just use hcRpc directly
 * @type {{system: import('system/base/net/rpc/api.mjs').SystemPublicMethods}}
 */
let systemRpc = hcRpc

export default systemRpc

console.warn(`This module is deprecated.\nImport hcRpc directly.`)