/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module (manager) allows the base platform to manage plugins of it's faculties
 */

import { BasePlatform } from "../platform.mjs"
import { Exception } from '../../errors/backend/exception.js'



export default class BasePluginManager {


    constructor() {

    }

    /**
     * An object representing whether or not each of the faculties support plugins
     * @returns {Promise<import("./types.js").PluginSupportMap>}
     */
    async getCapabilities() {
        const map = {}
        BasePlatform.get().faculties.members.forEach((faculty) => {
            map[faculty.descriptor.name] = faculty.descriptor.plugin ? true : false
        })
        return map
    }

    /**
     * This method gets all plugins of a single, or of all faculties
     * @param {string} faculty 
     * @returns {Promise<import("./types.js").FacultiesPlugins>}
     */
    async getPlugins(faculty) {
        if (faculty) {
            return {
                [faculty]: await doGet(faculty)
            }
        }
        const map = {}
        const promises = []
        for (let faculty of BasePlatform.get().faculties.members) {
            promises.push(
                (async () => {
                    map[faculty.descriptor.name] = await doGet(faculty.descriptor.name)
                })()
            )
        }


        async function doGet(faculty) {
            return await getFaculty(faculty).comm_interface.serverRemote.management.plugin.getAll()
        }
        (await Promise.allSettled(promises)).filter(x => x.status === 'rejected').forEach(result => {
            console.error(`Error when retrieving list of plugins:\n`, result.reason)
        })

        return map
    }

    /**
     * This method is used to install a plugin in a faculty
     * @param {object} param0 
     * @param {string} param0.url
     * @param {string} param0.faculty
     */
    async installPlugin({ url, faculty }) {
        return await getFaculty(faculty).comm_interface.serverRemote.management.plugin.installPlugin({ url })
    }

    /**
     * This method is used to configure credentials for a plugin
     * @param {object} param0 
     * @param {string} param0.plugin
     * @param {string} param0.faculty
     * @param {object} param0.credentials
     * @returns {Promise<void>}
     */
    async setCredentials({ plugin, faculty, credentials }) {
        return await getFaculty(faculty).comm_interface.serverRemote.management.plugin.setCredentials({ plugin, credentials })
    }

    /**
     * This method is used to retrieve credentials for a plugin
     * @param {object} param0 
     * @param {string} param0.plugin
     * @param {string} param0.faculty
     * @param {object} param0.credentials
     * @returns {Promise<void>}
     */
    async getCredentials({ plugin, faculty }) {
        return await getFaculty(faculty).comm_interface.serverRemote.management.plugin.getCredentials({ plugin })
    }


    /**
     * This method flips the state of a plugin between enabled, and disabled
     * @param {object} param0 
     * @param {string} param0.faculty
     * @param {string} param0.plugin
     * @param {boolean} param0.state
     * @returns {Promise<void>}
     */
    async toggleEnabledState({ faculty, plugin, state }) {
        return await getFaculty(faculty).comm_interface.serverRemote.management.plugin.toggleEnabledState({ plugin, state })
    }


    /**
     * This method starts a plugin
     * @param {object} param0 
     * @param {string} param0.faculty
     * @param {string} param0.plugin
     * @returns {Promise<void>}
     */
     async start({faculty, plugin}){
        return await getFaculty(faculty).comm_interface.serverRemote.management.plugin.start({ plugin })
        
    }
    /**
     * This method stops a running plugin
     * @param {object} param0 
     * @param {string} param0.faculty
     * @param {string} param0.plugin
     * @returns {Promise<void>}
     */
     async stop({faculty, plugin}){
        return await getFaculty(faculty).comm_interface.serverRemote.management.plugin.stop({ plugin })
        
    }
    
    /**
     * This method uninstalls a running plugin
     * @param {object} param0 
     * @param {string} param0.faculty
     * @param {string} param0.plugin
     * @returns {Promise<string>}
     */
     async uninstall({faculty, plugin}){
        return await getFaculty(faculty).comm_interface.serverRemote.management.plugin.uninstall({ plugin })
        
    }
    
    
}


function getFaculty(name) {
    const faculty = BasePlatform.get().faculties.findByName(name)
    if (!faculty) {
        throw new Exception(`The faculty ${faculty} was not found!`)
    }
    return faculty;
}