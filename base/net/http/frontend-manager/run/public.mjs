/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module allows clients over the public web to access features related to running scripts.
 */

import { BasePlatform } from "../../../../platform.mjs";



/**
 * @extends FunctionProxy.SkipArgOne<BasePlatform['frontendManager']['run']>
 */
export default class RunManagerPublicMethods extends FunctionProxy.SkipArgOne {

    constructor() {
        super(BasePlatform.get().frontendManager.run)
    }

}