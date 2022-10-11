/*
Copyright 2022 HolyCorn Software
The Soul System.
This module (standards.js) contains standard strings and resources which when faculties adhere to, will produce compliance in many areas especially with the front end
*/

import { FacultyPlatform } from "./platform.mjs"

export class Standards {

    constructor(){

    }
    get publicRPCPoint(){
        return `/$/rpc/${FacultyPlatform.get().descriptor.name}`
    }

    get httpPath(){
        return `/$/${FacultyPlatform.get().descriptor.name}/`
    }
    

}