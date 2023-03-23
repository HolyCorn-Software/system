/**
 * Copyright 2022 HolyCorn Software
 * This module allows the BasePlatform to provide useful functionalities over public rpc
 * 
 */



import { BasePlatform } from "../../platform.mjs";
import { PublicRPCSessionAPI } from "../../../comm/rpc/api/session.mjs";
import { BasePublicErrorAPI } from "./api.error.mjs";
import BaseLanguagePublicMethods from "./api.lang.mjs";
import BaseSettingsPublicMethods from "./api.settings.mjs";


export class SystemPublicMethods {

    constructor() {

    }

    /**
     * @returns {PublicRPCSessionAPI}
     */
    get $session() {
        return this[session_api_symbol] ||= new PublicRPCSessionAPI()
    }

    /**
     * @returns {BasePublicErrorAPI}
     */
    get error() {
        return this[error_api_symbol] ||= new BasePublicErrorAPI()
    }

    /**
     * @returns {BaseLanguagePublicMethods}
     */
    get lang() {
        return this[lang_api] ||= new BaseLanguagePublicMethods()
    }

    /**
     * @returns {BaseSettingsPublicMethods}
     */
    get settings() {
        return this[settingsAPI] ||= new BaseSettingsPublicMethods(BasePlatform.get())
    }
}

const lang_api = Symbol()
const session_api_symbol = Symbol(`BasePublicMethods.prototype.session_api`)
const error_api_symbol = Symbol(`BasePublicMethods.prototype.error`)
const settingsAPI = Symbol()