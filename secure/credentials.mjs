/*
Copyright 2021 HolyCorn Software
This module is solely for making sure the there's consistent access to the certificate authority of the platform
As well as the private key and certificate
*/

import fs from 'fs'
import libPath from 'path'

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import colors from 'colors'
colors.enable()

import libUrl from 'node:url'





const database_config_symbol = Symbol()


class Credentials {

    constructor() {

        /** @type {string} */this.tls_ca
        /** @type {string} */this.tls_key
        /** @type {string} */this.tls_cert

        const env_requirements = ['tls_ca', 'tls_cert', 'tls_key']

        for (let req of env_requirements) {

            const requirement_full_name = req.toUpperCase()

            Reflect.defineProperty(this, req, {
                get: () => {
                    if (!process.env[requirement_full_name]) {
                        throw new Error(`The system needs the path to the file ${requirement_full_name.blue}. Specify this in the environment variables `)
                    }
                    return fs.readFileSync(process.env[requirement_full_name])
                }
            })

        }



    }
    get database_config() {
        return this[database_config_symbol] ||= this.get_db_credentials()
    }

    get_db_credentials() {

        const requirement_full_name = `DATABASE_CONFIG`
        if (!process.env[requirement_full_name]) {
            throw new Error(`The system needs the path to the file ${requirement_full_name.blue}. Specify this in the environment variables `)
        }

        const platform_database = require(`${process.cwd()}/` + process.env.DATABASE_CONFIG);



        //Providing the option of having multiple database configurations depending on the hosting provider
        //Something else for localhost, and something else on heroku
        let environments = Reflect.ownKeys(platform_database).sort((a, b) => a > b ? 1 : b > a ? -1 : 0)



        const old_method = () => {


            for (var env of environments) {
                let regexp = new RegExp(env)
                //If on a "raw" (not forked) copy of NodeJS, then this is probably going to be the BasePlatform. Therefore, we use that environmental variable to decide on which database credential to use
                if (regexp.test(process.env._)) {
                    return platform_database[env]
                }
            }

        }

        const environments_enum = ['development', 'production',]

        global.undefined_environment_warning_timeout = 0;

        if (!environments.some(env => environments_enum.findIndex(x => x == env) !== -1)) {
            clearTimeout(global.undefined_environment_warning_timeout)
            global.undefined_environment_warning_timeout = setTimeout(() => {
                console.warn(`The database credentials were specified in ${libPath.resolve(libUrl.fileURLToPath(import.meta.url), process.env.PLATFORM_DATBASE_CONFIG,).yellow} using the old way.\nIn the new way, you specify credentials for the target one of the following environments: ${environments_enum.map(x => x.blue).join(', ')}, instead of ${environments.map(x => x.red).join(", ")}.\nThen in the system environment variables, set a value to the ENVIRONMENT field. That is process.env.ENVIRONMENT could be ${environments_enum[0].blue}`)
            }, 10)
            return old_method()
        } else {
            if (!process.env.ENVIRONMENT) {
                const default_environment = environments_enum[0]
                clearTimeout(global.undefined_environment_warning_timeout)
                console.trace(`The ENVIRONMENT environmental variable was not set. It is assumed to be ${default_environment}\n${new Error().stack}`)
                process.env.ENVIRONMENT = default_environment
            }
            return platform_database[process.env.ENVIRONMENT]
        }

    }
}


export default new Credentials()


