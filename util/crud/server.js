/*
Copyright 2021 HolyCorn Software
This module allows faculties to create a simple JSON-based CRUD (Create Read Update Delete) backend

At the moment, it just helps reduce redundancy of repeating urls

Sub-classes simply override the Create, Read, Update, Delete and Find methods
They return the response that will be given to the client or throw the appropriate exception

*/

import { getJSONOrBadRequest } from "../util.js";
import { HTTPServer } from "../../http/server.js";
import { Exception } from "../../errors/backend/exception.js";

export class CRUDServer {

    /**
     * @param {object} param0
     * @param {HTTPServer} param0.http 
     * @param {string} param0.path
     */
    constructor({ http, path }) {
        /** @type {HTTPServer} */
        this.http = http;
        /** @type {string} */
        this.path = path;

        let props = ['http', 'path']

        //We want that whenever http or path is set,
        //The module should check if both are set, then perform routing
        for (var _x of props) {
            let x = _x

            Reflect.defineProperty(this, x, {
                set: v => {
                    this[`__${x}__`] = v
                    if (props.every(p => typeof this[p] !== 'undefined')) {
                        this.doRouting()
                    }

                },
                get: () => this[`__${x}__`]
            })

        }

        Object.assign(this, arguments[0])

    }

    doRouting() {
        let map = {
            'create': 'create',
            'delete': 'delete',
            'update': 'update',
            'all': 'find',
            'find': 'find'
        }
        for (let _action in map) {

            let action = _action;
            this.http.route({
                point: `${this.path}${action}`,
                callback: async (req, res) => {
                    try {
                        let json = await getJSONOrBadRequest(req)
                        if(!this[action]){
                            console.log(`this['${action}'] is not a function, serving at point ${this.path}${action}`.cyan);
                        }
                        let reply = await this[action](json);

                        res.endJSON(reply || 'Thank You!', {}, 200)
                    } catch (e) {
                        console.log(`catching `, e)
                        throw e
                    }

                }
            });
        }
    }


    warn(json) {
        console.warn(`\n\n${path} is not well configured\n`.bgRed.black)
        throw new Exception("Unexpected error, some methods are missing from the CRUD Server ", {code:'error.system.unplanned'})
    }
    create(json) {
        this.warn(json)

    }
    find(json) {
        this.warn(json)

    }
    delete(json) {
        this.warn(json)

    }
    update(json) {
        this.warn(json)
    }


}