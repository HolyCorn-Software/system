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
    meta: FacultyMetadata
}

export interface FacultyDescriptorPlus extends FacultyDescriptor {
    path: string
}

export interface FacultyMetadata {
    backend_dashboard: FacultyBackendDashboardSupport
    engTerminal: FacultyEngTerminalSupport
    settings: faculty.managedsettings.SettingsDefinition
}

export type FacultyBackendDashboardSupport = {
    [dashboard: string]: (FacultyBackendDashboardAction & Omit<FacultyBackendDashboardGroup, "supergroup">)[]
}
interface FacultyEngTerminalSupport {

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