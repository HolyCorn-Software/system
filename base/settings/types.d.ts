/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module contains type definitions for the module that manages faculty settings from the base
 */

import FacultySettings from "system/lib/libFaculty/settings/settings.mjs";


global {

    namespace faculty.managedsettings {

        type MapFacultyToBase<T = FacultySettings> = T extends (arg0: infer Arg0Type) => infer ReturnType ? (faculty: keyof faculty.faculties, arg0: Arg0Type) => Promise<Awaited<ReturnType>>
            : T extends object ? {
                [K in keyof T]: MapFacultyToBase<T[K]>
            } : T

        declare var BaseRemote: {
            new(): MapFacultyToBase<FacultySettings>
        }
    }

}