/**
 * Copyright 2023 HolyCorn Software
 * The Soul System
 * This module (types), is part of the settings module, which allows faculties to have managed settings.
 * This module contains type definitions to facilitate that process
 */

import { Collection } from "mongodb"



type ManagedFacultySettings = {

    [key: string]: ManagedFacultySettings

    /**
     * This method returns the value of a named setting
     */
    get: (key: string) => Promise<any>

    /** This method is used to update the value of a setting, or create it. */
    set: (key: string, value: infer ValType) => Promise<ValType>

    default: (key: string, value: infer ValueType) => Promise<ValueType>


}



type FacultySettingsCollection = Collection<{ value: any, key: any }>