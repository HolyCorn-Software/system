    /*
Copyright 2021 HolyCorn Software
This module ensures that other faculties can access the functions available in the faculty

*/

import { FacultyPlatform } from "./platform.mjs";

const platform = FacultyPlatform.get()



/**
 * 
 * @param {object} object An object containing functions that'll be accessible from the outside
 * Input: 
 * ```js
 * {sayHi:function(){}, hello:function(){}, profile:{names:function(){}, age:function(){}}}
 * 
 * ```
 * Action:
 * 
 * ```js
 * sayHi:function(){}
 * hello: function(){}
 * profile_names:function(){}
 * profile_age:function(){}
 * ```
 */
export function expose(object, prefix = '', Interface = platform.remote.internal) {

    for (var _method in object) {
        let method = _method


        if (typeof object[method] == 'function') {

            Interface[`${prefix}${method}`] = async function (faculty, ...params) {
                try {
                    return await object[method](...params)
                } catch (e) {
                    throw e
                }
            }

        }

        if(typeof object[method] =='object'){
            expose(object[method], `${method}_`)
        }

    }
}