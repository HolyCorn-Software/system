/**
 * Copyright 2022 HolyCorn Software
 * This module (remote) allows the base to interact with the faculty for the purpose of managing plugins
 */



export default class FacultyPluginManagementRemote {


    constructor() {

    }

    /**
     * This method returns all plugins, whether running or not, that are at least syntatically validated
     * @returns {Promise<import("../types.js").PluginStatus[]>}
     */
    async getAll() {
        const plugins = await FacultyPlatform.get().pluginManager.getAll()
        /** @type {import('../types.js').PluginStatus[]}*/
        const finalData = []

        for (let plugin in plugins) {
            finalData.push(
                {
                    descriptor: plugins[plugin].descriptor,
                    error: (plugins[plugin].error?.stack || plugins[plugin].error?.message || plugins[plugin].error)?.strip,
                    state: plugins[plugin].state,
                    enabled: plugins[plugin].enabled
                }
            )
        }

        return finalData
    }

    /**
     * This method is used to install a plugin in the faculty
     * @param {object} param0 
     */
    async installPlugin({ url }) {
        return await FacultyPlatform.get().pluginManager.installPlugin({ url })
    }


    /**
     * This method is used to configure credentials for a plugin
     * @param {object} param0 
     * @param {string} param0.plugin
     * @param {object} param0.credentials
     * @returns {Promise<void>}
     */
    async setCredentials({ plugin, credentials }) {
        return await FacultyPlatform.get().pluginManager.setCredentials({ plugin, credentials })
    }


    /**
     * This method returns credentials for a given plugin
     * @param {object} param0 
     * @param {string} param0.plugin
     * @returns {Promise<void>}
     */
    async getCredentials({ plugin }) {
        return await FacultyPlatform.get().pluginManager.getCredentials({ plugin })
    }


    /**
     * This method makes a plugin to either be enabled, or disabled
     * @param {object} param0
     * @param {string} param0.plugin
     * @param {boolean} param0.state
     * @returns {Promise<void>}
     */
    async toggleEnabledState({ plugin, state }) {
        return await FacultyPlatform.get().pluginManager.toggleEnabledState({ plugin, state })

    }


    /**
     * This method starts a plugin
     * @param {object} param0 
     * @param {string} param0.faculty
     * @param {string} param0.plugin
     * @returns {Promise<void>}
     */
    async start({ plugin }) {
        return await FacultyPlatform.get().pluginManager.start({ plugin })

    }
    /**
     * This method stops a running plugin
     * @param {object} param0 
     * @param {string} param0.faculty
     * @param {string} param0.plugin
     * @returns {Promise<void>}
     */
     async stop({ plugin }) {
        return await FacultyPlatform.get().pluginManager.stop({ plugin })

    }
    
    /**
     * This method uninstalls a specified plugin
     * @param {object} param0 
     * @param {string} param0.faculty
     * @param {string} param0.plugin
     * @returns {Promise<string>}
     */
     async uninstall({ plugin }) {
        return await FacultyPlatform.get().pluginManager.uninstall({ plugin })

    }
    


}