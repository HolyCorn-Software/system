/**
 * Copyright 2022 HolyCorn Software
 * This module (model) defines a pattern which plugin models must follow.
 * It is the model of plugin models
 */

import { checkArgs } from "../../../util/util.js";
import SimpleCache from "../../../util/simple-cache.mjs";
import PluginManager from "./manager.mjs";

const lastWorkingCredentials = Symbol()
const cache = Symbol()



export default class PluginModelModel {

    constructor() {
        this[cache] = new SimpleCache(
            {
                get: async () => {
                    return (await (await PluginManager.getPluginCollections()).parameters.findOne({ plugin: this.descriptor.name }))?.parameters;
                },
                timeout: 30 * 1000
            }
        )
    }


    /**
     * Plugins can read this property, when they need the static information about itself
     * @returns {import("./types.js").PluginDescriptor}
     */
    get descriptor() {

    }

    /**
     * This method returns data that has been stored for the plugin, in the database.
     * @returns {Promise<object>}
     */
    async getCredentials() {
        const currentData = await this[cache].get()
        //Validate this data.
        //If the data is faulty, we use the last good credentials
        const oldData = () => {
            const old = this[lastWorkingCredentials]
            if (!old) {
                throw new Error(`No credentials were found for the plugin (${this.descriptor.name})`)
            }
            return old
        }
        try {
            checkArgs(currentData, this.descriptor.credentials.validation, 'credentials')
            return currentData
        } catch (e) {
            console.warn(`The credentials for the plugin ${this.descriptor.name.cyan} changed to something invalid.\nThe following error was encountered during validation:\n`, e)
            return oldData()
        }

    }

    /**
     * Plugins should implement this method, so that the system can execute it, when it wishes for the plugin to start
     * @returns {Promise<void>}
     */
    async _start() {

    }

    /**
     * Plugins should implement this method, so that the system can execute it, when it wishes for the plugin to stop
     * @returns {Promise<void>}
     */
    async _stop() {

    }


}