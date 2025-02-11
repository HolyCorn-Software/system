/**
 * Copyright 2023 HolyCorn Software
 * This module was created in 2021, and revised in 2023 
 * to have a standardized mode of operation for both client, and server
 */

import shortUUID from "short-uuid"
import _JSONRPC from "../../public/comm/rpc/json-rpc/json-rpc.mjs"
import nodeUtil from 'node:util'

class JSONRPC extends _JSONRPC {

    constructor() {
        super()
        this.flags.error_transform = (e, methodName, params) => e instanceof Exception ? (() => {
            e.handled = true
            return e
        })() : (() => {
            const id = shortUUID.generate()
            console.error(`Unexpected error\nid: ${id}\nWhen calling ${methodName}\n`, e, `\n\nwith parameters `, nodeUtil.inspect(params, { colors: true, depth: null }))
            const exception = new Exception(`System Error\nid: ${id}`)
            exception.code = e.code || 'system'
            exception.id = id
            exception.handled = true

            return exception
        })()
    }
}

export default JSONRPC 
