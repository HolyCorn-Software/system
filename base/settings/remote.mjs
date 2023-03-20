/**
 * Copyright 2023 HolyCorn Software
 * The Soul System
 * This module allows other faculties to pass through the base to manage the settings of other faculties
 */



/**
 * @extends faculty.managedsettings.BaseRemote
 */
export default class FacultySettingsBaseRemote extends Object {


    /**
     * 
     * @param {import('../platform.mjs').BasePlatform} platform 
     */
    constructor(platform) {
        super()


        return new RecursiveProxy(platform, [])



    }

}



class RecursiveProxy {


    /**
     * 
     * @param {import('../platform.mjs').BasePlatform} base
     * @param {string[]} properties 
     */
    constructor(base, properties = []) {


        return new Proxy(() => undefined, {
            get: (target, property, receiver) => new RecursiveProxy(base, [...properties, property]),
            apply: async (target, thisArg, input) => {
                const argArray = input[1].slice(1) //This is because the base is calling <someFxn>.apply(<someObject>, args: []), and args[0] is the faculty that called it
                const facultyName = argArray[0]
                const theFaculty = base.faculties.findByName(facultyName)
                if (!facultyName || !theFaculty) {
                    throw new Exception(`The faculty '${facultyName}' was not found.`)
                }

                let fxn = theFaculty.comm_interface.serverRemote.management.settings
                let _nwThisArg = theFaculty.comm_interface.serverRemote.management.settings;
                let skipFirst = true
                for (const property of properties) {
                    fxn = fxn[property]
                    if (!skipFirst) {
                        _nwThisArg = _nwThisArg[property]
                    }
                    skipFirst = false
                }

                return await fxn(undefined, argArray.slice(1))
            }
        })

    }


}