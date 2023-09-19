/**
 * Copyright 2022 HolyCorn Software
 * This module (list) is part of the plugins module, and allows plugins of a faculty to be easily accessed.
 */

import PluginManager from "./manager.mjs";
import PluginModelModel from "./model.mjs";

const manager = Symbol()


/**
 * Note: This object only deals with usable plugins
 * @template {import("./types.js").DefaultNamespaceMap} PluginNamespaceMapType
 */
export default class PluginList {


    /**
     * 
     * @param {PluginManager} pluginManager 
     */
    constructor(pluginManager) {

        this[manager] = pluginManager

    }

    /**
     * @returns {import("./types.js").AllPlugins<PluginNamespaceMapType>}
     */
    get $all() {
        const all = this[manager].getAll()
        const finalList = {}
        for (const name in all) {
            if (all[name].enabled && all[name].state === 'active') {
                finalList[name] = all[name]
            }
        }
        return finalList
    }

    /**
     * The object is something that can be used to retrieve plugins by namespace.
     * 
     * Therefore namespace.xyz will retrieve plugins of the xyz namespace
     * 
     * @returns {import("./types.js").NamespaceInterfaces<PluginNamespaceMapType>}
     */
    get namespaces() {
        return this[namespaces] ||= new NamespaceInterface(this)
    }

}

const namespaces = Symbol()


/**
 * @type {PluginMapType}
 */
class NamespaceInterface extends Object {

    /**
     * 
     * @param {PluginList} param0 
     */
    constructor(param0) {
        super()

        return new Proxy(param0, {
            get: (target, property, receiver) => {
                /** @type {import("./types.js").AllPlugins<{PluginNamespaceMapType}>} */
                const values = Object.values(target.$all).filter(plugin => plugin.descriptor.namespace === property)
                values.callback = new CallbackInterface(values)
                values.findByName = x => values.find(pl => pl.descriptor.name === x)
                return values
            },
            set: () => {
                throw new Error(`You cannot set anything on this object`)
            }
        })
    }


}


/**
 * This object allows that single methods be called on multiple plugins.
 * Data is returned as an object with two (2) properties: success, and failures, which are array of values, and errors, respectively
 */
class CallbackInterface {

    /**
     * 
     * @param {Array<import("./types.js").PluginLoadResult>} array 
     * @param {function(array extends Array<infer R> ? R : any): string} getName
     */
    constructor(array) {


        return new Proxy(
            array[0] || {},
            {
                get: function (target, property, receiver) {

                    /**
                     * @type {import("./types.js").CollectivePluginFunction<object, PluginModelModel>}
                     */
                    return async function (...args) {
                        const promises = await Promise.allSettled(array.map(async function (object) {
                            try {
                                return { data: await object.instance[property](...args), plugin: object.instance }
                            } catch (e) {
                                // console.error(`Calling ${property.blue} on ${object.descriptor.name.red} produced error:\n `, e)
                                throw { error: e, plugin: object.instance }
                            }
                        }));

                        const settled = promises.filter(x => x.status === 'fulfilled')
                        const failed = promises.filter(x => x.status === 'rejected')
                        return {
                            failure: failed.map(item => ({ error: item.reason.error, plugin: item.reason.plugin })),
                            success: settled.map(item => ({ value: item.value.data, plugin: item.value.plugin }))
                        }
                    }
                }
            }
        )

    }

}