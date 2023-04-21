/*
Copyright 2022 HolyCorn Software
The Soul System
This contains type definitions for the rpc module
*/

import { SystemPublicMethods } from "system/base/net/rpc/api.mjs"

export interface FacultyPublicJSONRPCMeta {
    hcSessionId: string

}



global {

    namespace rpc{
        type Public<T extends faculty.faculties = faculty.faculties> = {
            [K in keyof T]: T[K]['remote']['public']
        } & {
            system: SystemPublicMethods
        }
    }
}