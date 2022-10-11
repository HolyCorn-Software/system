/**
 * Copyright 2022 HolyCorn Software
 * The Soul System
 * This module contains type definitions for its parent module (lang), which governs language on the system
 */

import { Collection } from "mongodb"


export interface LanguageConfig {
    label: string
    code: string
}


export interface LanguageStrings {
    lang: string
    strings: StringMap
}

export interface SummedLanguageStrings {
    [lang: string]: StringMap
}

export type StringMap = {
    [key: string]: string
}

export interface StringEnsureArgs {
    [key: string]: {
        [lang: string]: string
    }
}


export type LanguageConfigCollection = Collection<LanguageConfig>
export type LanguageStringsCollection = Collection<LanguageStrings>