/**
 * Copyright 2022 HolyCorn Software
 * The language module
 * This sub-module (dictionary) allows for strings to be looked up in the frontend
 */

import systemRpc from "/$/system/static/comm/rpc/system-rpc.mjs";


const timeouts = {}
/**
 * This method is used to fetch a piece of data if non-existent, or return the local copy, only to later on fetch it afresh
 * @param {string} key 
 * @param {()=>Promise<any>} fetchFxn 
 * @returns {Promise<any>}
 */
async function fetchAndStore(key, fetchFxn) {

    try {
        const old = JSON.parse(localStorage.getItem(key)) || {}
        clearTimeout(timeouts[key])
        timeouts[key] = setTimeout(() => fetchNew(old), 2000)
        //The reason we passed a reference of old to the function fetchNew() is so that, long after the old that has been returned, when the update comes,
        //It would be applied to those having the old copy
        return old
    } catch {
        return await fetchNew({})
    }

    async function fetchNew(old) {
        const data = await fetchFxn();
        localStorage.setItem(key, JSON.stringify(data))
        Object.assign(old, data);
        return data
    }
}


async function getStringMap() {
    return await fetchAndStore('system.lang.strings', systemRpc.system.lang.getStrings)
}



/**
 * This method is used to retrieve languages 
 * @returns {Promise<import("../../base/lang/types.js").LanguageConfig[]>}
 */
async function getLanguages() {
    return await fetchAndStore('system.lang.languages', systemRpc.system.lang.getLanguages)
}





const strings = Symbol()
const lang = Symbol()
const languages = Symbol()

class StringDictionary {

    /**
     * 
     * @param {import("../types.js").SummedLanguageStrings} _strings 
     * @param {[import("../types.js").LanguageConfig]} langs
     */
    constructor(_strings, langs) {
        this[strings] = _strings
        this[languages] = langs || {}



        //Here, we are all about retrieving the user's preferred language
        let superDefaultLanguage = this[languages][0]?.code
        try {
            const chosenLanguage = localStorage.getItem('system.lang.userLanguage')
            this[lang] = chosenLanguage ?? superDefaultLanguage
            //TODO: Ask the user to select his language, if the chosen language is undefined
        } catch (e) {
            systemRpc.system.error.report(e)
            console.log(e)
            this[lang] = superDefaultLanguage
        }
    }


    /**
     * This method is used to get the value of a string
     * @param {object} param0 
     * @param {string} param0.code The code of the string
     * @param {string} param0.nullValue A value that will be returned if the string wasn't found
     * @returns {string}
     */
    getString({ code, nullValue }) {
        nullValue ??= `${code} missing`
        const realValue = this[strings]?.[this[lang]]?.[code]
        if (!realValue) {
            systemRpc.system.error.report(`Unfortunately, there's no value for string ${code} in language ${this[lang]}`, `\nInvoked from\n`, new Error().stack.split('\n').slice(1).join('\n'))
        }
        return realValue || nullValue
    }
}


const dictionary = new StringDictionary(await getStringMap(), await getLanguages())


export default dictionary