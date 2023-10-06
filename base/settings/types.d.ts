/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module contains type definitions for the module that manages faculty settings from the base
 */

import FacultySettings from "system/lib/libFaculty/settings/settings.mjs";


global {

    namespace faculty.managedsettings {

        type GetArgs<T> = T extends (...args: infer Args) => any ? Args : T

        type MapFacultyToBase<T = FacultySettings, Fac = keyof faculty.faculties> = T extends (arg0: infer Arg0Type) => infer ReturnType ? (faculty: Fac, ...arg0: GetArgs<T>) => Promise<Awaited<ReturnType>>
            : T extends object ? {
                [K in keyof T]: MapFacultyToBase<T[K], Fac>
            } : T

        declare var BaseRemote: {
            new(): MapFacultyToBase<FacultySettings>
        }
    }

}