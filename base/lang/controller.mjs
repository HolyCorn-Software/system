/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module (controller) is the brain behind language in the system.
 */

import { BasePlatform } from "../platform.mjs"
import langCollections from "./collection.mjs"


const config_collection = Symbol()
const string_collection = Symbol()

export default class LanguageController {


    constructor() {

        this[config_collection] = langCollections.config
        this[string_collection] = langCollections.strings

        Promise.all([
            this[string_collection].createIndex({ lang: 1 }),
            this[config_collection].createIndex({ code: 1 })
        ]).catch(e => console.warn(e))

    }

    /**
     * This method is used to create a language, if it doesn't exist
     * @param {import("./types.js").LanguageConfig} langConfig 
     * @returns {Promise<void>}
     */
    async createLanguage(langConfig) {
        await this[config_collection].updateOne(
            {
                code: langConfig.code
            },

            {
                $set: {
                    label: langConfig.label
                }
            },

            { upsert: true }
        )
    }

    async getLanguages() {
        return await this[config_collection].find({}).toArray()
    }

    /**
     * This method is used to set strings if they don't exist
     * @param {import("./types.js").StringEnsureArgs} strings 
     * @param {boolean} skipCheck If true, for each string, the database entry will be overriden regardless
     * @returns {Promise<void>}
     */
    async ensureStrings(strings, skipCheck) {
        const promises = []
        for (let string in strings) {

            for (let lang in strings[string]) {
                promises.push(
                    (async () => {

                        //That is, set strings.<whatever> = input, if it doesn't exist, or if asked to override
                        if (skipCheck || !await this[string_collection].findOne({ lang })?.strings?.[string]) {
                            this[string_collection].updateOne(
                                {
                                    lang,
                                },
                                {
                                    $set: {
                                        [`strings.${string}`]: `${strings[string][lang]}`
                                    }
                                },
                                { upsert: true }
                            )
                        }
                    })()
                )

            }
        }
        await Promise.all(promises)
    }

    /**
     * This method is used to set strings in the database
     * @param {import("./types.js").StringEnsureArgs} strings 
     * @returns {Promise<void>}
     */
    async setStrings(strings) {
        await this.ensureStrings(strings, true)
    }

    /**
     * This method is used to retrieve strings from the database
     * @param {object} param0 
     * @param {string} param0.lang If specified, only strings for the given
     * @returns {Promise<import("./types.js").SummedLanguageStrings[]>}
     */
    async getStrings({ lang } = {}) {


        /** @type {import("mongodb").Filter<import("./types.js").LanguageStrings>} */
        const query = {}
        if (lang) {
            query.lang = lang
        }
        const arrays = await this[string_collection].find(query).toArray()

        /** @type {import("./types.js").SummedLanguageStrings} */
        const results = {}
        for (let entry of arrays) {
            results[entry.lang] = entry.strings
        }
        return results

    }

    /**
     * This method is used to delete a single string, from the language specified
     * @param {object} param0 
     * @param {string[]} param0.langs
     * @param {string} param0.string
     * @returns {Promise<void>}
     */
    async deleteString({ langs, string }) {
        await this[string_collection].updateMany(
            {
                lang: { $in: langs }
            },
            {
                $unset: { [`strings.${`${string}`}`]: true }
            }
        )
    }

    /**
     * This method is used to delete a number of strings
     * @param {object} param0 
     * @param {string[]} param0.strings The strings to be deleted. This value should be an array of string codes
     * @param {string} param0.lang The language from which these strings will be deleted
     * @returns {Promise<void>}
     */
    async deleteStrings({ strings, lang }) {

        await this[string_collection].updateMany(
            {
                lang
            },
            {
                $unset: {
                    ...(
                        () => {
                            const fin = {}
                            strings.forEach(string => {
                                fin[`strings.${`${string}`}`] = true
                            })
                            return fin
                        }
                    )()
                }
            }

        )
    }

    /**
     * This method deletes a language completely, with all strings
     * @param {string} code 
     * @returns {Promise<void>}
     */
    async deleteLanguage(code) {
        await this[config_collection].deleteMany({ code })
        await this[string_collection].deleteMany({ lang: code });

        BasePlatform.get().events.emit('lang-deleted', code)
    }



}