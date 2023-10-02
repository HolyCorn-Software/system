/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module (manager) is part of the faculty management module, which is aimed at allowing the base platform to manage a faculty
 * This module resides in the faculty.
 */

import FacultyPluginManagementRemote from "../plugin/remote/internal.mjs"
import FacultySettingsRemote from "../settings/remote.mjs"


export default class FacultyManagementRemote {


    constructor() {

        this.plugin = new FacultyPluginManagementRemote()

        setImmediate(() => this.settings = new FacultySettingsRemote())
    }

}