/*
Copyright 2021 HolyCorn Software
The Soul System
This module allows Faculties to declare methods that are widely available to the public

As word of caution, don't use private fields (#myPrivateFields). Use Symbols instead (this[someSymbol].doSomething() )
*/

import PluginsCustomPublicMethods from "../../lib/libFaculty/plugin/remote/public.mjs";
import { FacultyPlatform } from "../../lib/libFaculty/platform.mjs";
import { PublicRPCSessionAPI } from "./api/session.mjs";

/**
 * @typedef {Object<string,function(import('../websockets/incomingClient.js').WSIncomingClient,...any)|undefined>} FacultyPublicMethodsStub
*/

export class FacultyPublicMethods {

    /**
     * @this {FacultyPublicMethodsStub}
     * @returns {FacultyPublicMethodsStub}
     */
    constructor() {

        let faculty = FacultyPlatform.get()

        if (!(faculty instanceof FacultyPlatform)) {
            throw new Error(`A module tried to create an instance of the FacultyPublicMethods, but unfortunately, a faculty environment was not detected`)
        }
    }

    /**
     * @returns {FacultyPublicSessionAPI}
     */
    get $session() {
        return this[session_api_symbol] ||= new FacultyPublicSessionAPI()
    }

    /**
     * @returns {PluginsCustomPublicMethods}
     */
    get $plugins() {
        return this[plugins_public] ||= new PluginsCustomPublicMethods()
    }


}

const session_api_symbol = Symbol(`FacultyPublicMethods.prototype.session_api`)

const plugins_public = Symbol()


export class FacultyPublicSessionAPI extends PublicRPCSessionAPI {

}