/**
 * Copyright 2022 HolyCorn Software
 * The language module
 * This sub-module (dictionary) allows for strings to be looked up in the frontend
 */

import hcRpc from "../comm/rpc/aggregate-rpc.mjs";
import { report_error_direct } from "../errors/error.mjs";


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
    return await fetchAndStore('system.lang.strings', hcRpc.system.lang.getStrings)
}



/**
 * This method is used to retrieve languages 
 * @returns {Promise<import("../../base/lang/types.js").LanguageConfig[]>}
 */
async function getLanguages() {
    return await fetchAndStore('system.lang.languages', hcRpc.system.lang.getLanguages)
}





const strings = Symbol()
const lang = Symbol()
const languages = Symbol()

const promise = Symbol()

class StringDictionary {



    constructor() {
        /** @type {import("../../base/lang/types.js").SummedLanguageStrings} */
        this[strings] = {}
        /** @type {import("../../base/lang/types.js").LanguageConfig} */
        this[languages] = {}



        //Here, we are all about retrieving the user's preferred language
        let superDefaultLanguage = this[languages][0]?.code
        try {
            const chosenLanguage = localStorage.getItem('system.lang.userLanguage')
            this[lang] = chosenLanguage ?? superDefaultLanguage
            //TODO: Ask the user to select his language, if the chosen language is undefined
        } catch (e) {
            report_error_direct(e)
            console.log(e)
            this[lang] = superDefaultLanguage
        }


        this[promise] = (async () => {
            this[strings] = await getStringMap()
            this[languages] = await getLanguages()
        })()

    }


    /**
     * @deprecated use {@link get} instead
     * This method is used to get the value of a string
     * @param {object} param0 
     * @param {string} param0.code The code of the string
     * @param {string} param0.nullValue A value that will be returned if the string wasn't found
     * @returns {string}
     */
    getString({ code, nullValue }) {
        console.warn(`This method is deprecated. Use get(), instead`)
        return this[strings]?.[this[lang]]?.[code] || (nullValue ?? `${code}`)
    }

    /**
     * This method returns the value of a code
     * @param {object} param0 
     * @param {string} param0.code
     * @param {string} param0.nullValue
     * @returns {Promise<string>}
     */
    async get({ code, nullValue }) {
        await this[promise]
        const realValue = this[strings]?.[this[lang]]?.[code]
        if (!realValue) {
            report_error_direct(new Error(`Unfortunately, there's no value for string ${code} in language ${this[lang]}`, `\nInvoked from\n`, new Error().stack.split('\n').slice(1).join('\n')))
        }
        return realValue || (nullValue ?? `${code}`)
    }
}


const dictionary = new StringDictionary()


export default dictionary