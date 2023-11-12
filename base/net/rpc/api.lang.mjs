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
        lang = arguments[1]?.lang
        return new JSONRPC.MetaObject(await this[controller].getStrings({ lang: lang }), { cache: { tag: `system.lang.${lang || 'default'}.strings`, expiry: 1 * 24 * 60 * 60 * 1000 } })
    }

    async getLanguages() {
        return new JSONRPC.MetaObject(await this[controller].getLanguages(), { cache: { tag: 'system.lang.languages', expiry: 30 * 24 * 60 * 60 * 1000 } })
    }

    get [controller]() {
        return BasePlatform.get().lang
    }

}