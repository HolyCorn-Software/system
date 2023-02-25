/**
 * Copyright 2023 HolyCorn Software
 * The Soul System
 * This module (settings), automatically manages the settings of a faculty.
 * The faculty may write to this object to store, or retrieve settings, in a pre-determined faculty
 */




/**
 * This object allows the faculty to have settings that are automatically managed by the system.
 * 
 * It's progressive, and allows the possibility for something like ``` payment.currency.get("baseCurrency")```, or ```payment.transaction.rules.set("retry", false)```,
 * or even `payment.currency.default("baseCurrency", "XAF")`.
 * The `get`, and `set` methods are obvious.
 * The `default` method, sets the value of the item, if it was not set before.
 * 
 * 
 */

export default class FacultySettings {



    constructor(faculty) {

        return new SettingsProxy(faculty)


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