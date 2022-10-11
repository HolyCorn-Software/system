/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module (internal) provides methods related to language, to faculties of the system
 */

import { BasePlatform } from "../../platform.mjs";


const controller = Symbol()

export default class LanguageInternalMethods {


    get [controller]() {
        return BasePlatform.get().lang
    }




    /**
     * This method is used to create a language, if it doesn't exist
     * @param {import("./../types.js").LanguageConfig} langConfig 
     * @returns {Promise<void>}
     */
    async createLanguage(langConfig) {
        await this[controller].createLanguage(arguments[1])
    }

    /**
     * This method is used to set strings if they don't exist
     * @param {import("./../types.js").StringEnsureArgs} strings 
     * @param {boolean} skipCheck If true, for each string, the database entry will be overriden regardless
     * @returns {Promise<void>}
     */
    async ensureStrings(strings, skipCheck) {
        await this[controller].ensureStrings(...[...arguments].slice(1))
    }

    /**
     * This method is used to set strings in the database
     * @param {import("../types.js").StringEnsureArgs} strings 
     * @returns {Promise<void>}
     */
    async setStrings(strings) {
        await this[controller].setStrings(arguments[1])
    }

    /**
     * This method is used to retrieve strings from the database
     * @param {object} param0 
     * @param {string} param0.lang If specified, only strings for the given
     * @returns {Promise<[import("./../types.js").SummedLanguageStrings]>}
     */
    async getStrings({ lang }) {
        return await this[controller].getStrings({ ...arguments[1] })
    }

    /**
     * This method is used to delete a single string, from the language specified
     * @param {object} param0 
     * @param {[string]} param0.langs
     * @param {string} param0.string
     * @returns {Promise<void>}
     */
     async deleteString({ langs, string }) {
        await this[controller].deleteString({ ...arguments[1] })
    }

    /**
     * This method is used to delete many strings from a specified language
     * @param {object} param0 
     * @param {string} param0.lang
     * @param {[string]} param0.strings
     * @returns {Promise<void>}
     */
     async deleteStrings({ lang, strings }) {
        await this[controller].deleteStrings({ ...arguments[1] })
    }

    /**
     * This method anhilates a language completely, with all it's strings
     * @param {string} langCode 
     * @returns {Promis<void>}
     */
    async deleteLanguage(langCode) {
        await this[controller].deleteLanguage(arguments[1])
    }



}