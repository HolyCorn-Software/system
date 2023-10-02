/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (public), allows frontend components to access public methods provided by plugins
 */


const manager = Symbol()

/**
 * @extends faculty.plugin.PluginsPublicRemoteInterface
 */
export default class PluginsCustomPublicMethods extends Object {

    constructor() {
        super();
        
        return new Proxy(this, {
            get: (target, namespace) => { // Getting plugin namespace
                return new Proxy({}, {
                    get: (target, plugin) => { // Getting plugin by name
                        return this[manager].loaded.namespaces[namespace]?.find(x => x.descriptor.name == plugin)?.instance.remote?.public
                    }
                })
            }
        })
    }
    get [manager]() {
        return FacultyPlatform.get().pluginManager
    }

}