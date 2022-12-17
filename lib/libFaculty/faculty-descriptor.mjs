/*
Copyright 2021 HolyCorn Software
This module does the work of parsing the facult.json file
It verifies the information given, and returns a descriptor of the faculty


==================================================================================================================
According to the concept of this module, a faculty is more or less a folder with a faculty.json file describing it
The faculty.json file contains fields such as:
    name (text),
    label (text),
    init (file)

Example:
    {
        "name": "voting",
        "label":"Voting Faculty",
        "init": "./main.js",
        "cert":"./keys/cert.cer",
        "key":"./keys/private.key"
    }
*/



import { NoDescriptorErr, MalformedDescriptorErr, FileNotFoundErr } from './errors.mjs'

import { createRequire } from 'module';
const require = createRequire(import.meta.url)
import fs from 'node:fs'
import libPath from 'node:path'
import { checkArgs } from '../../util/util.js';


export class FacultyDescriptor {

    constructor(path) {
        //Just verify the faculty info, and continue to the real constructor
        let json;

        try { //The faculty.json file contains info about the faculty
            json = require(`${path}/faculty.json`)
        } catch (e) {
            //Without it, the faculty is not well defined
            throw new NoDescriptorErr(path)
        }


        //++++++++++++ Now verifying if the faculty has all the fields defined ++++++++++++++++++++++

        let required_fields = ['name', 'label', 'init']

        for (var field of required_fields) {
            if (!json[field]) {
                throw new MalformedDescriptorErr(`${path}/faculty.json`, field)
            }
        }

        // //+++++++++++++++++++++++++++ Verify the init script ++++++++++++++++++++++++++++++++++++++++
        // let init_script = require(`${path}/${json.init}`)

        // if (!init_script.init) {
        //     throw new MalformedInitErr(path, json.init)
        // }

        let init_script = libPath.resolve(`${path}/${json.init}`)
        if (!fs.existsSync(init_script)) {
            throw new FileNotFoundErr(path, init_script, 'init')
        }



        //++++++++++++++++++++++ Now that we are done verifying, let us construct +++++++++++++++++++++
        this.set_properties({ ...json, name: json.name, label: json.label, path, init: init_script, meta: json.meta || {} })

        this.path = path;


        /***
         * This is just to help the IDE
         */
        /**@type {string} */ this.name;
        /**@type {string} */ this.path
        /**@type {string} */ this.label
        /**@type {string} */ this.init;
        /** @type {import('./plugins/types.js').PluginSupportDefinition} */ this.plugin
        /** @type {import('../../errors/handler.mjs').ErrorMapV2 } */ this.errorsV2
        /** @type {import('../../errors/handler.mjs').ErrorMap} */ this.errors


        if (this.plugin) {


            for (let field in this.plugin.plugins) {


                if (this.plugin.plugins[field].test) {

                    checkArgs(this.plugin.plugins[field],
                        {
                            model: 'string',
                            test: {
                                module: 'object',
                            }
                        }
                    )
                }

            }
        }


    }

    set_properties({ name, label, path, init, cert, key } = {}) {
        //This constructor is actually where things happen


        //Set all the fields in the constructor argument on the object
        for (var x in arguments[0]) this[x] = arguments[0][x]

    }



}

