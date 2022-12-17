/**
 * Copyright 2022 HolyCorn Software
 * This module contains type definitions for modules in the util directory of the soul system
 */


type DirectoryDefinition = {
    [key: string]: string & {
        [key: string]: string & DirectoryDefinition
    }
} & string[]