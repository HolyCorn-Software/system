/**
 * Copyright 2023 HolyCorn Software
 * The Soul System
 * This module allows frontend code access to features related to settings
 */



const base = Symbol()

export default class BaseSettingsPublicMethods {

    /**
     * 
     * @param {import('../../../base/platform.mjs').BasePlatform} basePlatform 
     */
    constructor(basePlatform) {
        this[base] = basePlatform
    }

    /**
     * This method is used to retrieve a setting
     * @template {keyof faculty.faculties} FacultyName
     * @param {{faculty: FacultyName}& Omit<faculty.managedsettings.SettingsUpdateType<FacultyName>, "value">} param0 
     * @returns {Promise<faculty.managedsettings.all[param0['name']]['data']>}
     */
    async get({ faculty, namespace, name }) {
        faculty = arguments[1]?.faculty
        namespace = arguments[1]?.namespace
        name = arguments[1]?.name
        const theFaculty = this[base].faculties.findByName(faculty)
        if (!faculty || !theFaculty) {
            console.warn(`The faculty '${faculty}' was not found.`)
            return
        }


        if (!theFaculty.descriptor.meta.settings?.[namespace]?.public) {
            throw new Exception(`The setting namespace ${namespace} is not public.`)
        }
        const desc = theFaculty.descriptor.meta.settings?.[namespace].items?.find(x => x.name == name)

        if (!(desc?.public ?? theFaculty.descriptor.meta.settings[namespace]?.public)) {
            throw new Exception(`The setting ${name} of ${namespace} is not publicly available.`)
        }




        return new JSONRPC.CacheObject(await theFaculty.comm_interface.serverRemote.management.settings.get({ name, namespace }), { expiry: 10 * 60 * 1000 })
    }

}