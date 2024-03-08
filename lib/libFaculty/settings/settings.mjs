/**
 * Copyright 2023 HolyCorn Software
 * The Soul System
 * This module (settings), automatically manages the settings of a faculty.
 * The faculty may write to this object to store, or retrieve settings, in a pre-determined faculty
 */

import { CollectionProxy } from "../../../database/collection-proxy.js"




const checkArgs = Symbol()


/**
 * This object allows the faculty to have settings that are automatically managed by the system.
 * 
 * 
 * 
 */

export default class FacultySettings {



    /**
     * This method reads a single setting
     * @template {keyof faculty.faculties} FacultyName
     * @param {Omit<faculty.managedsettings.SettingsUpdateType<FacultyName>, "value">} param0 
     * @returns {Promise<any>}
     */
    async get({ name, namespace }) {
        FacultySettings[checkArgs]({ namespace, name });
        return (await FacultySettings.collections.values.findOne({ namespace, name }))?.value
    }

    /**
     * This method is used to set a setting
     * @template {keyof faculty.faculties} FacultyName
     * @template {faculty.managedsettings.Namespaces} Namespace
     * @template {faculty.managedsettings.Names<FacultyName, Namespace>} SettingName
     * @param {Omit<faculty.managedsettings.SettingsUpdateType<FacultyName, SettingName, Namespace>, "name"|"namespace">} param0 
     * @returns {Promise<void>}
     */
    async set({ namespace, name, value }) {
        FacultySettings[checkArgs]({ namespace, name });
        await FacultySettings.collections.values.updateOne(
            { name, namespace },
            {
                $set: { value }
            },
            { upsert: true }
        );
    }

    /**
     * This method is used to remove a setting
     * @param {object} param0 
     * @param {string} param0.namespace
     * @param {string} param0.name
     * @returns {Promise<void>}
     */
    async clear({ namespace, name }) {
        FacultySettings[checkArgs]({ namespace, name });
        await FacultySettings.collections.values.deleteOne({ namespace, name })
    }

    /**
     * This method gets all values in a namespace, or in all 
     * @param {object} param0 
     * @param {string} param0.namespace
     * @returns {Promise<faculty.managedsettings.SettingValue[]>}
     */
    async getAll({ namespace } = {}) {
        /** @type {import('mongodb').Filter<Pick<faculty.managedsettings.SettingValue, "namespace">>} */
        const filter = {}

        if (namespace) {
            filter.namespace = namespace
        }

        return await FacultySettings.collections.values.find(namespace).toArray()
    }

    /**
     * This method checks if the arguments are correct
     * @param {object} param0 
     * @param {string} param0.namespace
     * @param {string} param0.name
     */
    static [checkArgs]({ namespace, name }) {
        soulUtils.checkArgs(arguments[0], { namespace: 'string', name: 'string', }, 'input')
    }

    static {

        /**
         * @type {CollectionProxy<{descriptors: faculty.managedsettings.SettingDescriptorsCollection, values: faculty.managedsettings.SettingValuesCollection}>['$0']}
         */
        this.collections = (new CollectionProxy(
            {
                'descriptors': 'managedsettings.descriptors',
                'values': 'managedsettings.values'
            }
        )).$0
    }




}



/**
 * This objects allows us to progressively access a collection.
 * If at any point, the 'get', 'set', or 'default' () methods are called, it uses the previous properties in conjunction with '.',
 * as the collection name, and it performs the get, set, and default operations on it.
 * 
 * get is defined as retrieving a value from the database
 * set sets a value
 * default is used to set a value, if not exists
 */
class SettingsProxy {

    /**
     * 
     * @param {FacultyPlatform} faculty 
     */
    constructor(faculty, path, lastProperty) {


        return new Proxy(() => true, {
            get(target, property, receiver) {
                if (typeof property !== 'string') {
                    return undefined;
                }
                return new SettingsProxy(faculty, path ? `${lastProperty ? `${path}.${lastProperty}` : path}` : property, path ? property : undefined)
            },
            set: (target, property, value, receiver) => {
                throw new Error(`Cannot set property '${path}.${property}'`)
            },
            async apply(target, thisArg, argArray) {

                const [key, value] = argArray

                const colName = `${faculty.descriptor.name}._settings_.${path}`

                /** @type {import("./types").FacultySettingsCollection} */
                const collection = faculty.database.collection(colName)

                switch (lastProperty) {
                    case 'get':
                        return (await collection.findOne({ key }, { projection: { _id: false } }))?.value
                    case 'set':
                        await collection.updateOne({ key }, { $set: { value } }, { upsert: true })
                        return value
                    case 'default':
                        await collection.updateOne({ key }, { $setOnInsert: { value } }, { upsert: true })
                        return (await collection.findOne({ key })).value

                    default:
                        throw new Error(`${path}.${key} is not a function`)
                }
            }
        })

    }


}