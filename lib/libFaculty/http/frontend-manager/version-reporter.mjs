/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (version-reporter), is a special version-reporter sitting in a faculty,
 * responsible for reporting version changes to the base platform
 */

import VersionReporter from "../../../../http/frontend-manager/version-reporter.mjs";




export default class FacultyVersionReporter extends VersionReporter {


    constructor() {
        super(
            FacultyPlatform.get().base.channel.remote.bundlecache
        );
    }

}