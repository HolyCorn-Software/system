/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module allows the base platform access to change faculty settings
 */

import FacultySettings from "./settings.mjs"
import FunctionProxy from "../../../util/function-proxy.mjs"
import { FacultyPlatform } from "../platform.mjs"


/**
 * @extends FacultySettings
 */
export default class FacultySettingsRemote extends FunctionProxy {

    constructor() {
        super(FacultyPlatform.get().settings)
    }

}