/**
 * Copyright 2021 HolyCorn Software
 * This module allows faculties to centralized and standardize names of database collections
 * It also prevents the possibility of duplicated collection names
 * 
 * How to use
 * 
 * // collections.js
 * let collections = new CollectionProxy({
 *      'user':'user',
 *      'widget':'ui.wigets',
 *      'pages':'ui.pages',
 *      'loginProviderCredentials':'login.proviers.credentials'
 * })
 * module.exports = collections
 * 
 * //Now, in some other module
 * import collections  from 'collections.js'
 * collections.widgets.find() //Just like that (No need to pass through Db.collection() function with mongodb)
 * 
 * This module also appends the faculty name to the name of the collection.
 * So, in a faculty abc, the collection 'user' will be called abc.user
 * 
 * Finally, do well do use jsDoc to document the fields found in the collection. 
 * 
 * To fully understand these concepts, check <faculty of users>/drivers/collections.js
 * 
 */

import { Platform } from '../platform.mjs';

/**
 * @template Mp
 */
export class CollectionProxy {

    /**
     * Pass a parameter such as 
     * ```
     * {
     * users:'user_profiles',
     * credentials:'settings_and_credentials.credentials'
     * }
     * ```
     * In the above, users is the object we'll have access to at runtime. 'user_profiles' is the name of the collection
     * @param {Mp} values 
     * @param {string} prefix - This defines the prefix before all collection names. By default, the module will use the name of the platform
     * @returns 
     */
    constructor(values = {}, prefix) {

        //The whole idea is, providers.credentials becomes collection('providers.credentials')

        /** @type {ToCollection<Mp>} */ this.$0;


        const proxy = new Proxy(this, {
            /**
             * 
             * @param {CollectionsClass} target 
             * @param {string} property 
             * @returns {Collection}
             */
            get: (target, property) => {
                if (property === '$0') {
                    return proxy
                }
                if (typeof values[property] == 'string') {
                    let platform = Platform.get(); //Either get a FacultyPlatform or BasePlatform
                    //If faculty platform, use platform.descriptor.name, or just use system
                    if (typeof FacultyPlatform !== 'undefined' && (platform instanceof FacultyPlatform)) {
                        return platform.database.collection(`${prefix || (platform.descriptor.name)}.${values[property]}`)
                    } else {
                        return platform.database.connection.collection(`${prefix || 'base'}.${values[property]}`)
                    }
                }
                //Then it's the case where we have nested collections
                if (typeof values[property] == 'object') {
                    return new CollectionProxy(values[property], prefix)
                }
            }
        })

        return proxy

    }


}
