/**
 * Copyright 2024 HolyCorn Software
 * The soul system
 * This module (secure-db-query), allows a database collection to be confidently exposed to the public, after defining constraint fields.
 */


const options = Symbol()

const internal = Symbol()


/**
 * @template T
 */
export default class SecureDBQuery {

    /**
     * 
     * @param {soul.util.secure_db_query.Options<T>} opts 
     */
    constructor(opts) {
        this[options] = opts
    }

    [internal] = {

        /**
         * This checks if wildcarding is allowed for this intent.
         * @param {soul.util.secure_db_query.Intent} intent 
         * @returns {boolean}
         */
        checkWildcard: (intent) => {

            // We're checking if there's a specific rule for the intent, and then going on to check if there's a general rule
            const rules = [this[options].allowWildcardSearch[intent], this[options].allowWildcardSearch.all]

            for (const rule of rules) {
                if (typeof rule != 'undefined') return rule
            }

            return false // Then, by default wildcarding with this intent, is forbidden
        },

        /**
         * This method checks if a filter is legitimate. That is, it doesn't make use of a disallowed field
         * @param {soul.util.secure_db_query.Search<T>} filter 
         * @param {soul.util.secure_db_query.Intent} intent
         */
        checkFilter: async (filter, intent) => {
            if (Reflect.ownKeys(filter).length == 0 && !this[internal].checkWildcard(intent)) {
                throwWildcardExcp()
            }
            /**
             * 
             * @param {soul.util.secure_db_query.Search<T>} filter 
             */
            const check = (filter) => {

                for (const key in filter) {
                    let checked;
                    if ((key == '$or') || (key == '$and')) {
                        if (!Array.isArray(filter[key])) {
                            throw new Exception(`'${key}', was supposed to be an array, but you passed in a ${typeof filter[key]}`)
                        }

                        if (filter[key].length == 0 && !this[internal].checkWildcard(intent)) {
                            throwWildcardExcp()
                        }

                        for (const item of filter[key]) {
                            check(item)
                        }
                        checked = true
                    }

                    switch (key) {
                        // Operators like these are allowed
                        case '$exists':
                        case '$in':
                            checked = true
                    }
                    // Here, we're checking if the field is legitimate
                    if (!checked) {

                        if (key.startsWith('$')) {
                            throw new Exception(`Cannot use strange field during search '${key}'`)
                        }

                        const [mainKey] = key.split('.')

                        if (
                            !this[options].fields.search.some(x => x == mainKey)
                        ) {
                            throw new Exception(`You cannot use the field '${key}', to search this database. It is disallowed, please.`)
                        }

                    }

                }
            }

            check(filter)

            await this[options]?.transformQuery({
                search: filter,
                intent,
            })

            return filter;



            function throwWildcardExcp() {
                throw new Exception(`You're trying to access a database in a way that is unsecure to other users, by using a wildcard filter.`)
            }
        },
        /**
         * This method checks to see, that an update query is perfectly legitimate.
         * @param {soul.util.secure_db_query.Update<T>} update 
         */
        checkUpdate: async (update) => {
            const check = async (obj) => {
                Reflect.ownKeys(obj).forEach(key => {
                    if (this[options].fields.update.findIndex(u => u == key) == -1) {
                        throw new Exception(`Cannot use field '${key}', when writing to the database`)
                    }
                });

                await this[options].dataCheck({ data: obj, intent: 'update' })
            }
            const checks = ['$set', '$setOnInsert', '$unset']
            const finalUpdate = {}

            for (const item of checks) {
                if (update[item]) {
                    await check(update[item])
                    finalUpdate[item] = update[item]
                }
            }

            await this[options].transformQuery({ update: finalUpdate, intent: 'update' })

            return update = finalUpdate
        },
        checkFields: async (data) => {
            for (const key in data) {
                if (this[options].fields.update.findIndex(u => u == key) == -1) {
                    throw new Exception(`Cannot use field '${key}', when writing to the database`)
                }
            }
        }
    }

    /**
     * This method is used to create a new record
     * @param {T} data 
     */
    async create(data) {

        const original = JSON.parse(JSON.stringify(data))

        if (this[options].disableUpdate) {
            throw new Exception(`You're not allowed to update this database, please.`)
        }

        await this[internal].checkFields(data)

        await this[options].dataCheck({ data, intent: 'create' });

        await this[options].collection.insertOne(data)

        // Return the new fields
        const changes = {}
        for (const key in data) {
            if (typeof original[key] == 'undefined') {
                changes[key] = data[key]
            }
        }

        return changes

    }


    /**
     * This method retrieves content from the database
     * @param {object} param0
     * @param {soul.util.secure_db_query.Search<T>} param0.search 
     */
    async find({ search }) {
        return await this[options].collection.find(await this[internal].checkFilter(search, 'read'))
    }


    /**
     * This method deletes a single document from the DB.
     * @param {object} param0
     * @param {soul.util.secure_db_query.Search<T>} param0.search 
     */
    async deleteOne({ search }) {
        return await this[options].collection.deleteOne(await this[internal].checkFilter(search, 'delete'))
    }



    /**
     * This method retrieves a single document from the database
     * @param {object} param0
     * @param {soul.util.secure_db_query.Search<T>} param0.search 
     */
    async findOne({ search }) {
        return await this[options].collection.findOne(await this[internal].checkFilter(search, 'read'))
    }




    /**
     * This method updates a single document in the database
     * @param {object} param0
     * @param {soul.util.secure_db_query.Search<T>} param0.search 
     * @param {soul.util.secure_db_query.Update<T>} param0.update 
     */
    async updateOne({ search, update }) {
        if (this[options].disableUpdate) {
            throw new Exception(`You're not allowed to update this database, please.`)
        }
        return await this[options].collection.updateOne(await this[internal].checkFilter(search), await this[internal].checkUpdate(update, 'update'))
    }


    /**
     * This method updates a multiple documents in the database
     * @param {object} param0
     * @param {soul.util.secure_db_query.Search<T>} param0.search 
     * @param {soul.util.secure_db_query.Update<T>} param0.update 
     */
    async updateMany({ search, update }) {
        if (this[options].disableUpdate) {
            throw new Exception(`You're not allowed to update this database, please.`)
        }
        return await this[options].collection.updateMany(await this[internal].checkFilter(search), await this[internal].checkUpdate(update, 'update'))
    }

}