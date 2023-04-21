/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module allows public clients enjoy language functionality
 */

import { BasePlatform } from "../../../../system/base/platform.mjs";



const controller = Symbol()

export default class BaseLanguagePublicMethods {

    /**
     * This method returns all strings of all or a specific language
     * @param {object} param0 
     * @param {string} param0.lang If specified, only strings for the specific language will be returned
     * @returns {Promise<import("system/base/lang/types.js").SummedLanguageStrings[]>}
     */
    async getStrings({ lang } = {}) {
        return await this[controller].getStrings({ lang: arguments[1]?.lang })
    }

    async getLanguages(){
        return await this[controller].getLanguages()
    }

    get [controller](){
        return BasePlatform.get().lang
    }

}