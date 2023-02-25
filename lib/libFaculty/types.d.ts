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
    backend_dasbhoard: FacultyBackendDashboardSupport
}

export interface FacultyDescriptorPlus extends FacultyDescriptor {
    path: string
}


export type FacultyBackendDashboardSupport = {
    [dashboard: string]: (FacultyBackendDashboardAction & Omit<FacultyBackendDashboardGroup, "supergroup">)[]
}

export interface FacultyBackendDashboardAction extends FacultyBackendDashboardItem {
    view: string
    group: string
}

export interface FacultyBackendDashboardGroup extends FacultyBackendDashboardItem {
    items: (FacultyBackendDashboardGroup | FacultyBackendDashboardAction)[]
    supergroup: string
}

export interface FacultyBackendDashboardItem {
    name: string
    label: string
    icon: string
    meta: string
}