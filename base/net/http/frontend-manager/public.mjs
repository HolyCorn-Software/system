/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module provides functionality to clients on the public web, related to the frontend-manager.
 */

import RunManagerPublicMethods from "./run/public.mjs";


export default class FrontendManagerPublicMethods {

    constructor() {

        this.run = new RunManagerPublicMethods()

    }

}