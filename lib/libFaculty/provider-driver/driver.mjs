/*
Copyright 2021 HolyCorn Software

This module allows faculties to easily manage providers.
Providers are third-parties (e.g payment gateways, or login providers)

In terms of structure, a provider is just any folder that should have a particular structure,
as well as have a constructor that receives credentials which were stored against it's name in the database. 

This module therefore allows the system to massively check at runtime whether all providers stored in a folder conform
to a given structure

*/

import libPath from 'path'
import fs from 'fs'
import { Collection } from 'mongodb'
import { fileURLToPath } from 'url'
import { StrictFileServer } from '../../../http/strict-file-server.js'
import { Exception } from '../../../errors/backend/exception.js'
import { getCaller } from '../../../util/util.js'
import { HTTPServer } from '../../../http/server.js'




/**
 * @template ModelClass
 */
export class ProviderLoader {

    /**
     * 
     * @param {object} param0
     * @param {string} param0.providers Path to where the providers are stored
     * @param {string} param0.model Path to where the model is stored. The model must be directly exported.
     * That is module.exports = Model
     * @param {[string]} param0.fileStructure The necessary files that a provider must have in order to be validated
     * @param {string} param0.relModulePath  Which of the files in the folder contains the provider ? For example this could be ./provider.js (relative ModulePath)
     * @param {Collection} param0.credentials_collection The database collection where provider credentials are 
     * stored ?
     * 
     */
    constructor({ providers, model, fileStructure, relModulePath, credentials_collection }, importURL = getCaller()) {

        if (!importURL) {
            throw new Error(`Please pass import.meta.url as the second argument`)
        }
        this.caller_module_url = importURL
        let importFilePath;
        try {
            importFilePath = fileURLToPath(importURL)
        } catch (e) {
            console.log(`Could not make the best out of ${importURL}`)
            throw e;
        }

        this.path = libPath.resolve(libPath.dirname(importFilePath), providers)
        this.collection = credentials_collection
        this.fileStructure = fileStructure
        this.model = libPath.resolve(libPath.dirname(importFilePath), model)
        this.relModulePath = relModulePath

        const pathExist = (path) => {
            if (!fs.existsSync(path)) {
                const except = new Exception(`The path ${path.yellow} is doesn't exist`, {
                    code: 'error.system.unplanned',
                    flags: {
                        stackIndex: 3
                    }
                })

                throw except;
            }
        }

        pathExist(this.path);
        pathExist(this.model);

        ensureArgs(arguments[0], ['providers', 'model', 'fileStructure', 'relModulePath', 'credentials_collection'])

    }

    /**
     * Loads all the providers in it's path
     * @param {(provider:string)=>any|Promise<any>} getParams if passed, this function will be executed for each provider. The return of the function will be used to initialize the provider
     * @param {string[]} whitelist If specified, only providers whose names are listed here will be loaded
     * 
     * @returns {Promise<{errors:[Exception], providers:[ModelClass & BaseModel] }>}
     */

    async load(getParams = () => undefined, whitelist = this.providerNamesNonLoaded) {

        const _stck = new Error().stack.split('\n')
        if (_stck.length) {
            // console.log(_stck);
        }
        let caller = getCaller() || getCaller(1) // / *at .*\(([^(]+)\)$/.exec(new Error().stack.split('\n')[3])?.[1];
        if (!caller) {
            console.trace('No caller detected !')
            throw new Exception(`No caller detected when loading the providers.`)
        }
        let errors = []
        /** @type {[{name:string, instance:ModelClass}]} */
        let loadedProviders = []

        const providerNames = this.providerNamesNonLoaded.filter(x => Array.isArray(whitelist) ? whitelist.findIndex(w => w == x) !== -1 : true)

        // Load all providers. When a provider is loaded, add to the loadedProviders list, and when an error is encountered, add it to the errors list. Then wait till all have been initialized, whether or not errors are encountered
        await Promise.all(
            providerNames.map(async provider_name => {
                try {
                    let loader = new SingleVerifier({
                        path: `${this.path}/${provider_name}`,
                        relModulePath: this.relModulePath,
                        fileStructure: this.fileStructure,
                        model: this.model,
                        collection: this.collection
                    }, this.caller_module_url)
                    await loader.load(getParams)
                    loadedProviders.push(loader.instance)

                } catch (e) {
                    errors.push(e);
                }
            })
        );

        console.log(`${loadedProviders.length === this.providerNamesNonLoaded.length ? `All(${loadedProviders.length.toString().yellow})` : `${loadedProviders.length.toString().blue}/${this.providerNamesNonLoaded.length.toString().green}`} providers in the path ${this.path.yellow} have been loaded.\n\tThe results${loadedProviders.length === this.providerNamesNonLoaded.length ? '' : ' and errors'} have been returned to the caller at ${caller.yellow}`)

        //Now store the loaded providers on this
        //Then return the results and the errors

        return { providers: this.providers = loadedProviders, errors }


    }

    /**
     * The names of all providers to be loader
     * @returns {string[]}
     */
    get providerNamesNonLoaded() {
        return fs.readdirSync(this.path).filter(x => !x.startsWith('.'))
    }

    /**
     * 
     * This method ensures that when clients visit a given url, they get access to the credentials for
     * that provider.
     * After calling this method, the following are possible (assuming we are at /static/ and /providers):
     * - GET /static/any/file/in/a/public/folder.js
     * - GET /credentials (returns a json of the credentials the client needs)
     * 
     * This method assumes that the Provider class has statically declared a property called client_credential_fields
     * which is an array of strings. 
     * 
     * For example:
     * class SomeProvider extends SomeModel{
     *      static get client_credential_fields(){
     *          //Which fields in the credentials can the client see ?
     *          return ['client_id', 'app_id']
     *      }
     * }
     * The user login provider model in the faculty of users is a good example of this
     * 
     * @param {object} param0
     * @param {HTTPServer} param0.http The HTTP server
     * @param {[string]} param0.whitelist The specific files and folders that are allowed access
     * @param {string} param0.credentialsURL The url path that clients will access to have credentials
     * @param {string} param0.static_file_url If specified, the providers directory will be made available through public http
     * 
     * 
     */
    async routeHTTP({ http, whitelist, credentialsURL = '/providers/credentials', static_file_url = '/static/' }, importURL = getCaller()) {


        //First, keep the list of paths of static files that are accessible to the client
        whitelist = (whitelist || [`.`]).map(x => libPath.resolve(this.path, x))


        // If we have ../home ./lib ../cars/new as whitelisted directories. Then the folder containing them all is ../
        let public_dir = libPath.dirname(whitelist.sort((a, b) => a.split('/').length > b.split('/').length ? 1 : -1)[0])


        new StrictFileServer({
            http,
            refFolder: public_dir,
            urlPath: static_file_url
        }, importURL).add(...whitelist)

        console.log(`Providers located at ${this.path.magenta} have some files in ${public_dir.magenta} available at ${static_file_url.magenta} in the HTTP Server of the Faculty.`)


        //The credentials for every provider
        let db_credentials = await (await this.collection.find()).toArray()
        let all_credentials = {}

        for (var provider of this.providers) {
            all_credentials[provider.name] = db_credentials.filter(x => x.name == provider.name)[0]
        }



        //Now route requests demanding for the credentials of providers
        this.http.route({
            point: credentialsURL, callback: async (req, res) => {
                try {
                    let credentials = {}
                    for (var provider of this.providers) {
                        let cred = {}
                        let db_cred = all_credentials[provider.name]
                        let { client_credential_fields } = provider.constructor

                        for (var field of client_credential_fields) {
                            cred[field] = db_cred[field]
                        }
                        credentials[provider.name] = cred
                    }
                    res.endJSON(credentials)

                } catch (e) {
                    console.log(`Really serious error `, e)
                    res.endJSON('error.system.unplanned', undefined, 500)
                }

                /**
                 * We end up getting something like this 
                 * {
                 *      'google':{
                 *          'client_id':'adfadfasdfadsf'
                 *      },
                 *      'facebook':{
                 *          'client_id':'adfadfasdfadsf'
                 *      }
                 * }
                 */

            }
        })

    }


}



export class SingleVerifier {

    /**
     * @param {object} param0
     * @param {string} param0.providers 
     * @param {string} param0.model
     * @param {[string]} param0.fileStructure
     */
    constructor({ path, relModulePath, model, collection, fileStructure = ['.'] }, importURL) {

        if (!importURL) {
            throw new Error(`Please pass import.meta.url as the second parameter`)
        }

        importURL = fileURLToPath(importURL)

        /** @type {string} */
        this.path = path
        this.collection = collection
        this.model_path = libPath.resolve(libPath.dirname(importURL), model)
        this.fileStructure = fileStructure
        this.relModulePath = relModulePath

        ensureArgs(arguments[0], ['path', 'relModulePath', 'model', 'collection'])
    }

    /**
     * If the path is /somewhere/somewhere/proivders/google
     * The return is google
     */
    get name() {
        return /[^/]+$/.exec(this.path)[0]
    }

    async verify_structure() {

        let ProviderModel = (await import(this.model_path)).default

        if (!ProviderModel) {
            throw new Error(`Bad model: ${this.model_path}\nCheck that the model class is exported default.`)
        }

        if (!(ProviderModel.prototype instanceof BaseModel)) {
            throw new Error(`Please specify a model that extends the BaseModel.\nCertain fields like `
                + `client_credential_fields are important`
            )
        }

        // Check that there are no absolute paths in the provider file structure (It won't make sense since absolute paths refer to files not owned by the provider)
        this.fileStructure.forEach(path => {
            if (path.startsWith('/')) {
                throw new Exception(`The path ${path.yellow} to be respected by providers is wrong because it is an absolute path`, {
                    code: 'error.system.unplanned'
                })
            }
        })


        // Check if the provider has the required files

        for (var file of this.fileStructure) {
            let path = libPath.resolve(`${this.path}/${file}`)
            if (!fs.existsSync(path)) {
                throw new Exception(`The provider ${this.name.yellow} is lacking the file ${file.yellow}\n The provider is located at ${this.path.blue}`, {
                    code: 'error.system.unplanned',
                    flags: {
                        stackIndex: 6
                    }
                })
            }
        }

        let provider_module_path = libPath.resolve(`${this.path}/${this.relModulePath}`)
        let module = (await import(provider_module_path)).default

        if (!module) {
            throw new Error(`No class is exported by default for module ${provider_module_path}`)
        }

        if (!(module.prototype instanceof ProviderModel)) {
            throw new Error(`The module ${provider_module_path.blue} is invalid because it doesn't `
                + `extend the ${ProviderModel.name.yellow} class`
            )
        }


        // Check if the provider follows the model
        let verifyModule = (ideal, real, modelName) => {
            const idealKeys = Reflect.ownKeys(ideal)
            const realKeys = Reflect.ownKeys(real)

            for (var key of idealKeys) {
                if (realKeys.indexOf(key) == -1) {
                    const isSuperModule = ideal === BaseModel || ideal === BaseModel.prototype
                    throw new ModuleStructureError({ modelName, module_path: provider_module_path, model_path: this.model_path, key }, { isSuperModule })
                }
            }
        }

        verifyModule(BaseModel, ProviderModel, BaseModel.name)
        verifyModule(BaseModel.prototype, ProviderModel.prototype, BaseModel.name)
        verifyModule(ProviderModel, module, ProviderModel.name)
        verifyModule(ProviderModel.prototype, module.prototype, ProviderModel.name)

        /** @type {typeof Provider} */
        this.module = module;


    }

    async verify_credentials() {

        if (false && !this.credentials) {
            throw new Exception(`The provider ${this.name.yellow} doesn't have credentials stored in the database.\n` +
                `Check the database collection ${this.collection.collectionName.cyan}`, {
                code: 'error.system.unplanned',
                flags: {
                    stackIndex: 6
                }
            })
        }

        if (typeof this.module.credential_fields === 'undefined') {
            throw new Exception(`The provider ${this.name.yellow} (${this.model_path.blue.dim}) did not specify an array of fields that must be present in it's database credentials.(${'credential_fields'.yellow})\n Implement a property on the provider module that returns an array of string. The array could be empty if no credentials are needed. For example 
            class MyProvider extends SomeProviderModel{
                static get credential_fields(){
                    return ['client_id'] //'client_id' must be present in the database before the provider loads
                }
            }
            `)
        }

        let fields = this.module.credential_fields

        let credentials = this.credentials ? this.credentials : {};

        const missing_fields = []

        for (var field of fields) {
            if (!(field in credentials)) {
                missing_fields.push(field);
            }
        }
        if (missing_fields.length !== 0) {
            throw new CredentialsError(this.name, missing_fields.join(','), this.collection, this.path)
        }


    }

    /**
     * This method is used to load the provider
     * @param  {function():Promise<any>|any} getArgs Use this to pass an arbitary function which when executed, would return the details needed to initialized the provider
     * @returns {Promise<void>}
     */
    async load(getArgs) {
        this.credentials = await this.collection.findOne({ name: this.name })
        await this.verify_structure()
        await this.verify_credentials()
        this.instance = new this.module({ ...this.credentials })
        this.instance.$data = {
            name: this.name,
            path: this.path,
            credentials: this.credentials,
            credentials_collection: this.collection,
            class: this.module
        }

        await this.instance.init(await getArgs?.(this.name));
        this.instance.name = this.name


    }


}


export class ModuleStructureError extends Exception {
    /**
     * This error is thrown when a provider doesn't have certain vields defined
     */
    constructor({ module_path, model_path, key, modelName }, { isSuperModule = false } = {}) {
        super(`The ${isSuperModule ? 'model' : 'provider'} ${isSuperModule ? model_path : module_path.bold.blue} ${'is invalid because it lacks the '}${key.blue} ${'property'}. ` +
            `\nNote that ${isSuperModule ? 'the model' : 'all providers'} `
            + `must follow the structure of ${modelName.blue} defined in ${isSuperModule ? import.meta.url.blue.bold : model_path.blue.bold} `
            , {
                code: 'error.system.unplanned',
                flags: {
                    stackIndex: 7
                }
            });

    }
}


class ProviderMetadata {
    constructor() {

        /** @type {string} The name of the provider as determined by the path it is stored in*/ this.name
        /** @type {string} The path on the disk the provider is stored on*/ this.path
        /** @type {object} */ this.credentials
        /** @type {Collection} */ this.credentials_collection
        /** @type {BaseModel} */ this.class
    }
}


export class BaseModel {

    constructor() {

        /** @type {ProviderMetadata} This is created at runtime by the provider loader, and contains information that was used to load it */ this.$data
    }

    /**
     * The fields to that make up the credentials for the provider.
     * Specifying this will make the system check for incomplete data
     */
    static get client_credential_fields() {

    }

    /**
     * The fields of the providers credentials in the database
     * that will be sent to the client
     */
    static get credential_fields() {

    }

    /**
     * Initializations that providers must make during boot time
     */
    async init() {

    }

}





export class CredentialsError extends Error {
    /**
     * Called when certain credentials are missing from the database
     */

    constructor(provider_name, fields, credentialsCollection, path) {
        super(`The provider ${provider_name.blue} (${path.dim.blue}) requires ${fields.red}, but it was absent in the database. ` +
            `Check the collection ${credentialsCollection.collectionName.blue}, and check the ` +
            `document for the named provider`)
    }

}

/**
 * 
 * @param {object} object 
 * @param {[string]} fields 
 */
function ensureArgs(object, fields) {
    for (var param of fields) {
        if (typeof object[param] == 'undefined') {
            throw new Error(`${param} is missing from the arguments!`)
        }
    }
}



/**
 * @typedef {{
 * $data:{
 * name:string,
 * path:string,
 * credentials_collection: Collection,
 * class: Object
 * }
 * 
 * }} ProviderAddonData
 */
