/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module sits on the frontend, allowing components to make use of much-needed functionality.
 */

import runMan from "./run/lib.mjs";



class FrontendMan {
    constructor() {
        this.run = runMan
    }
}


const frontendMan = new FrontendMan()


export default frontendMan