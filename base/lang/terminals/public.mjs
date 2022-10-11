/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module (public) allows that clients on the public web make use of features related to language
 */

import LanguageController from "../controller.mjs"


const controller = Symbol()

export default class LanguagePublicMethods {


    /**
     * 
     * @param {LanguageController} langController 
     */
    constructor(langController) {

        this[controller] = langController

    }

    /**
     * This method returns all strings of all or a single, language
     * @param {object} param0 
     * @param {string} param0.lang If specified, only strings of the given language will be returned
     * @returns {Promise<import("../types.js").SummedLanguageStrings>}
     */
    async getStrings({ lang }) {
        return await this[controller].getStrings({ lang: arguments[1]?.lang })
    }


    /**
     * This method retrieves all the languages of the platform
     */
    async getLanguages(){
        return await this[controller].getLanguages()
    }
    
}