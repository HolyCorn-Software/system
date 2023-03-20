/*
Copyright 2022 HolyCorn Software
The Soul System.
This module (standards.js) contains standard strings and resources which when faculties adhere to, will produce compliance in many areas especially with the front end
*/

import { FacultyPlatform } from "./platform.mjs"

export class Standards {

    constructor() {

    }
    get publicRPCPoint() {
        return Standards.publicRPCPoint(FacultyPlatform.get().descriptor.name)
    }

    get httpPath() {
        return Standards.httpPath(FacultyPlatform.get().descriptor.name)
    }


    static publicRPCPoint(name) {
        return `/$/rpc/${name}`
    }

    static httpPath(name) {
        return `/$/${name}/`
    }


}