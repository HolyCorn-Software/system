/**
 * Copyright 2022 HolyCorn Software
 * The module contains type definitions useful to the components involved with managing faculties
 */

import { PluginSupportDefinition } from "./plugin/types"


export interface FacultyDescriptor {
    name: string
    label: string
    init: string
    plugin: PluginSupportDefinition
    http: FacultyDescriptorHTTPOptions
}

export interface FacultyDescriptorPlus extends FacultyDescriptor{
    path: string
}