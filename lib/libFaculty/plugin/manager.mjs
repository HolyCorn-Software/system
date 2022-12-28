/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module loader, allows a faculty to load plugins
 * 
 * 
 */

import { CollectionProxy } from "../../../database/collection-proxy.js"

import fs from 'node:fs'
import FilesCheck from "../../../util/files-check.mjs"
import { checkArgs } from "../../../util/util.js"
import libPath from 'node:path'
import PluginModelModel from './model.mjs'
import unzipper from 'unzipper'
import shortUUID from "short-uuid"
import fetch from 'node-fetch'
import PluginList from "./list.mjs"
import libModule from 'node:module'
import { PluginManager as LivePluginManager } from 'live-plugin-manager'

global.PluginModelModel = PluginModelModel


const staticServer = Symbol()


/**
 * @template {object} PluginNamespaceMap 
 */
export default class PluginManager {


    constructor() {

        /**
         * @type {import("./types.js").PluginMap}
         */
        this[registry] = {

        }

        /** @type {PluginList<PluginNamespaceMap>} */
        this.plugins = new PluginList(this)

    }

    /**
     * This method returns information about all plugins, that were at least of the right format, whether active or not
     * @returns {typeof this[registry]}
     */
    getAll() {
        return { ...this[registry] }
    }

    /**
     * This method initializes the PluginManager
     * @returns {Promise<void>}
     */
    async init() {
        const faculty = FacultyPlatform.get()

        if (!faculty.descriptor.plugin) {
            return;
        }



        const pluginHTTP = await HTTPServer.new();

        await faculty.base.shortcutMethods.http.claim(
            {
                remotePath: `${faculty.standard.httpPath}$plugins/`,
                localPath: `/`,
                http: pluginHTTP
            }
        )

        this[staticServer] = new StrictFileServer(
            {
                http: pluginHTTP,
                urlPath: `/`,
                refFolder: this.pluginsDir
            }
        );

        //Get plugin information from the database
        const allPlugins = await this.getPluginNames()
        const enabledPlugins = await this.getEnabledPlugins(allPlugins)


        const preloadResults = await Promise.allSettled(
            allPlugins.map(plugin => this.preloadPlugin(plugin))
        );

        const preloadErrors = preloadResults.filter(x => x.status === 'rejected');

        for (const failure of preloadErrors) {
            console.error(failure.reason)
        }

        //Let's filter the half-loaded plugins. These are plugins that are atleast structurally correct
        const preloadSuccess = preloadResults.filter(x => x.status === 'fulfilled')


        //Now, let's add the half-loaded plugins
        for (let entry of preloadSuccess) {
            this[registry][entry.value.descriptor.name] = {
                ...entry.value,
                enabled: true
            }
        }


        //Now, which of the half-loaded plugins will fully load?
        //For the ones that do, we extract the enabled ones, and load them fully
        const loadResults = await Promise.allSettled(
            preloadSuccess.filter(suc => enabledPlugins.indexOf(suc.value.descriptor.name) !== -1).map(async success => {
                const results = await this.loadPlugin(success.value)
                results.enabled = true
                return results
            })
        );


        //Now, for the plugins that were disabled
        const disabled = allPlugins.filter(plugin => enabledPlugins.indexOf(plugin) == -1)

        for (let plugin of disabled) {
            const results = preloadResults.find(x => x.value.descriptor).value

            this[registry][plugin] = {
                ...results,
                state: 'stopped',
                enabled: false
            }
        }

        const errorTasks = loadResults.filter(x => x.value?.error || x.reason);


        for (const task of errorTasks) {
            const errorObject = task.reason || task.value.error
            console.error(errorObject.stack || errorObject)
        }


        //Then add (and possibly override with) the fully loaded plugins
        for (let finalEntry of loadResults.filter(x => x.status === 'fulfilled')) {
            this[registry][finalEntry.value.descriptor.name] = finalEntry.value
        }


        console.log(`Public files for plugins may be accessed via https://${faculty.server_domains.secure}${faculty.standard.httpPath}$plugins/${'pluginName'.magenta}/@public/`)



    }

    /**
     * This method is used to install a plugin in the faculty
     * @param {object} param0 
     * @param {string} param0.url
     * @returns {Promise<import("./types.js").PluginDescriptor>}
     */
    async installPlugin({ url }) {

        if (!url) {
            throw new Exception(`Nothing passed for installation.`)
        }

        if (isGit(url)) {
            throw new Exception(`Git urls are not yet supported`)
        }

        //Now fetch the file, store in a temporary folder, get the descriptor, move the files to the real folder, then voila
        const tmp = `/tmp/${shortUUID.generate()}${shortUUID.generate()}`

        function fail(error) {
            fs.rmSync(tmp, { force: true, recursive: true })
            throw error
        }

        await new Promise(async (resolve, reject) => {

            const timeout = setTimeout(() => reject(new Exception(`Extracting the plugin zip took too long.\nPerhaps the file was too large.`)), 45 * 1000);

            function cleanup() {
                clearTimeout(timeout)
            }

            function done() {
                cleanup()
                resolve()
            }
            function failed(e) {
                cleanup()
                reject(e)
            }

            try {
                /** @type {ReturnType<import('node-fetch')['default']>} */
                let response;

                try {
                    response = await fetch(url);
                } catch (e) {
                    throw new Exception(`Failed to fetch zip.\n${e?.message || e}`)
                }
                response.body.pipe(
                    unzipper.Extract(
                        {
                            path: tmp
                        }
                    )
                ).addListener('close', () => done())
                    .addListener('end', () => done())
                    .addListener('error', (error) => failed(error))
            } catch (e) {
                failed(e)
            }
        })

        const descriptorRelPath = `/@system/descriptor.json`
        let descriptorText;
        try {
            descriptorText = fs.readFileSync(`${tmp}${descriptorRelPath}`)
        } catch (e) {
            console.error(`Error when reading descriptor file located at ${tmp}${descriptorRelPath}`, '\n', e)
            fail(new Exception(`The plugin lacks a descriptor, or the descriptor is not located at ${descriptorRelPath}`))
        }

        /** @type {import("./types.js").PluginDescriptor} */
        let descriptor;
        try {
            descriptor = JSON.parse(descriptorText)
        } catch (e) {
            fail(new Exception(`The descriptor of the plugin is not a JSON file.`))
        }

        if (!descriptor.name) {
            fail(new Exception(`This plugin doesn't have a name. Please check that the descriptor contains a, "name" field. The name should be unique`))
        }

        const thisFaculty = FacultyPlatform.get().descriptor.name
        if (descriptor.faculty !== thisFaculty) {
            fail(new Exception(`This plugin was not built for this faculty (${thisFaculty}), for it specified the name ${descriptor.faculty} as the target faculty`))
        }

        //Now that the name is set, let's move it to our plugin dir
        //But first, let's clear the way
        const pluginPath = `${this.pluginsDir}/${descriptor.name}`

        let oldPath;

        async function folderMove(src, dst, log) {
            const items = fs.readdirSync(src)
            const folders = []
            if (!fs.existsSync(dst)) {
                fs.mkdirSync(dst, { recursive: true })
            }
            for (const item of items) {
                if (fs.statSync(`${src}${libPath.sep}${item}`).isDirectory()) {
                    if (log) console.log(`${item} is not a file.`)
                    folders.push(item)
                } else {
                    if (log) console.log(`Directly moving ${item} from ${src} to ${dst}`)
                    fs.renameSync(`${src}${libPath.sep}${item}`, `${dst}${libPath.sep}${item}`)
                }

            }

            for (const folder of folders) {
                if (log) console.log(`Moving folder ${folder}`)
                await folderMove(`${src}${libPath.sep}${folder}`, `${dst}${libPath.sep}${folder}`)
            }

            if (log) console.log(`Now doing the final move ${src} -> ${dst}`)


            fs.rmdirSync(src)

        }

        if (fs.existsSync(pluginPath)) {
            oldPath = libPath.resolve(`${pluginPath}/../${shortUUID.generate()}${shortUUID.generate()}`)
            await folderMove(pluginPath, oldPath)
        }

        fs.cpSync(tmp, pluginPath, { recursive: true })

        const oldData = this[registry][descriptor.name];


        try {
            this[registry][descriptor.name] = await this.preloadPlugin(descriptor.name)

            if (this[registry][descriptor.name].error) {
                throw this[registry][descriptor.name].error
            }

            await this.installDependencies(descriptor)


            if (oldPath) {
                fs.rmSync(oldPath, { recursive: true })
            }

            (await PluginManager.getPluginCollections()).settings.updateOne({ plugin: descriptor.name }, { $set: { plugin: descriptor.name } }, { upsert: true })

            return descriptor
        } catch (e) {
            if (oldPath) {
                console.warn(`Reverting to old version of ${descriptor.name} plugin, found at ${oldPath}`)
                await folderMove(oldPath, pluginPath)
            } else {
                if (oldData) {
                    try {
                        await this.uninstall({ plugin: descriptor.name })
                    } catch (e) {
                        console.warn(`Though the new version of the plugin has been installed, the old one did not uninstall correctly. \n${e?.stack || e}`)
                    }
                }
                fs.rmSync(pluginPath, { recursive: true })
            }
            throw e
        }


    }


    /**
     * This method is used to filter a list of plugins, removing the disabled ones.
     * 
     * If no list is passed, it is built from the list of all plugins
     * @param {string[]} names 
     * @returns {Promise<string[]>}
     */
    async getEnabledPlugins(names) {
        names ??= await this.getPluginNames()

        const plugins = await (await PluginManager.getPluginCollections()).settings.find({}, { limit: 128 }).toArray()

        return names.filter(name => plugins.find(pl => pl.plugin === name)?.enabled ?? true)

    }

    /**
     * This method is used to load a particular plugin
     * @param {string} name 
     * @returns {Promise<import("./types.js").PluginPreLoadResult>}
     */
    async preloadPlugin(name) {

        const fDesc = FacultyPlatform.get().descriptor
        const pluginDefinition = fDesc.plugin.plugins
        /** @type {import("./types.js").PluginPreLoadResult['state']} */
        let state = 'stopped'

        if (!pluginDefinition) {
            throw new Error(`This faculty "${fDesc.label}" (${fDesc.name}), doesn't support plugins`)
        }

        const path = `${this.pluginsDir}/${name}`
        if (!fs.existsSync(path)) {
            throw new Error(`The plugin '${plugin}' could not be loaded because it's files were not found, in the expected path: ${path}.`)
        }
        //Check for necessary files
        const checker = new FilesCheck({
            structure: [
                './@system/descriptor.json',
                './plugin.mjs',
                './@public/icon.png'
            ],
            path
        })

        let nav;
        try {
            nav = checker.load()
        } catch (e) {
            throw new Exception(`Some vital files are not within the '${name.red}' plugin.\n${e.message || e}`)
        }
        const descNav = nav['@system']['descriptor.json']

        /** @type {import("./types.js").PluginDescriptor} */
        const descriptor = (() => {
            const descContent = descNav.$.fileContent
            try {
                return JSON.parse(descContent)
            } catch (e) {
                throw new Error(`The file ${descNav.$.path} is not a properly formatted json file`)
            }
        })();



        try {
            checkArgs(descriptor, PLUGIN_DESCRIPTOR_STRUCTURE)
        } catch (e) {
            throw new Exception(`Invalid plugin descriptor.\nMore info: ${e.message || e.stack || e}`)
        }

        //TODO: Catch checkArgs error, and append documentation URL to the error message

        const namespace = descriptor.namespace


        let error, plugin;

        try {


            if (!pluginDefinition[namespace]) {
                throw new Error(`Sorry, the plugin, "${name}", belongs to a namespace ("${namespace}"), that's not defined by the faculty ${fDesc.name}.`)
            }

            //Now, check if the plugin support definition is correct
            if (typeof pluginDefinition[namespace].model !== 'string') {
                throw new Error(`The plugin namespace '${namespace}', is not well defined in ${descNav.$.path}. It is supposed to have a "model" field, which defines the name of the model class (globally available), which all plugins in the namespace must extend.`)
            }
            const filesTest = pluginDefinition[namespace].test?.files
            if (filesTest && (!Array.isArray(filesTest) || !filesTest.every(file => typeof file === 'string'))) {
                throw new Error(`The files test for the '${namespace}' plugin namespace defined in ${descNav.$.path} is invalid because it's not an array of strings.\nJust pass an array of strings referring to paths that must be available`)
            }

            //Now, perform the file test. Checking that all required files and folders are present.
            try {
                new FilesCheck(
                    {
                        structure: filesTest,
                        path,
                    }
                ).load()
            } catch (e) {
                throw new Exception(`The plugin doesn't contain some files required by the faculty.\n${e.message || e}`)
            }


        } catch (e) {
            error = e;
            state = 'crashed'
        }

        this[staticServer].add(`${this.pluginsDir}/${name}/@public/`)

        //Now the structure is set, let's get credentials information from the descriptor

        return {
            descriptor,
            error,
            path,
            state
        }



    }

    /**
     * This method completes the process of loading a plugin.
     * @param {import("./types.js").PluginPreLoadResult} preloadData 
     * @returns {Promise<import("./types.js").PluginLoadResult>}
     */
    async loadPlugin(preloadData) {
        /** @type {import("./types.js").PluginPreLoadResult['state']} */
        let state = 'crashed'


        const fDesc = FacultyPlatform.get().descriptor
        const pluginDefinition = fDesc.plugin.plugins

        const { namespace } = preloadData.descriptor
        /** @readonly @type {PluginModelModel} */
        let instance;

        let error;

        try {
            const PluginModelClass = global[pluginDefinition[namespace].model]
            if (!PluginModelClass) {
                throw new Error(`Unfortunately some plugins will not load, because the model class "${pluginDefinition[namespace].model?.red}" was not found. Check the spelling of the model class, and check that it is globally available`)
            }

            //Now, good thing the plugin has defined a model. But does the model take after the model of models?
            if (!(PluginModelClass.prototype instanceof PluginModelModel)) {
                throw new Error(`The model "${pluginDefinition[namespace].model}" was supposed to extend "PluginModelModel"`)
            }
            await this.installDependencies(preloadData.descriptor)

            //After checking that the model exists, let's check that the model is respected
            let modul;
            try {
                const modulePath = `${preloadData.path}${libPath.sep}plugin.mjs`
                delete libModule.createRequire(import.meta.url).cache[modulePath]
                modul = await import(`${modulePath}?dd=${Date.now()}`)

            } catch (esmErr) {
                throw new Error(`The plugin ${preloadData.descriptor.name}, could not load because of a programming error: \n${esmErr}\n`, { cause: esmErr })
            }

            if (!modul.default) {
                throw new Error(`The module 'plugin.mjs' in the plugin ${preloadData.descriptor.name} was supposed to export a default class. A class which is expected to extend ${pluginDefinition[namespace].model}.`)
            }
            if (!(modul.default.prototype instanceof PluginModelClass)) {
                throw new Error(`The class ${modul.default.name} in the module 'plugin.mjs' in the plugin ${preloadData.descriptor.name} was supposed to extend  ${pluginDefinition[namespace].model}.`)
            }

            //Now check if the module has the right methods enabled
            const DEFAULT_MODULE_FUNCTIONS = {
                _start: `This method is called by the system, when it wishes for the plugin to start.`,
                _stop: `This method is called by the system, when it wants the plugin to stop executing.`
            }

            for (const method in DEFAULT_MODULE_FUNCTIONS) {
                if (typeof modul.default.prototype[method] !== 'function') {
                    throw new Error(`The plugin ${preloadData.descriptor.name} should also implement the ${method} method. ${DEFAULT_MODULE_FUNCTIONS[method]}`)
                }
            }

            //Now, for credentials
            const credentials = await (await PluginManager.getPluginCollections()).parameters.findOne({ plugin: preloadData.descriptor.name })
            try {
                checkArgs(credentials?.parameters, preloadData.descriptor.credentials.validation, 'credentials')
            } catch (e) {
                throw new Exception(`Invalid credentials for ${preloadData.descriptor.name.red}. \n ${e.message || e}`)
            }

            //If validation is done, then all is well

            instance = new modul.default()
            const moduleTest = pluginDefinition[namespace].test?.module
            //Now that the plugin extends the right class, let's check that it implements the right fields
            if (moduleTest) {
                try {
                    moduleCheck(modul.default, instance, moduleTest)
                } catch (e) {
                    const exception = new Exception(`The plugin ${preloadData.descriptor.name.red} did not load.\n\n ${e.message || e}`)
                    throw exception
                }
            }

            Reflect.defineProperty(instance, 'descriptor', {
                get: () => ({ ...preloadData.descriptor }),
                set: () => {
                    throw new Error(`Cannot set this property`)
                },
                enumerable: true,
                configurable: true
            })

            preloadData.instance = instance
            await this.invokeStart(preloadData)

            state = 'active'


        } catch (e) {
            state = 'crashed'
            error = e;
        }


        return {
            ...preloadData,
            error,
            state
        }



    }



    /**
     * This method installs the dependencies for a plugin
     * @param {import("./types.js").PluginDescriptor} descriptor 
     * @returns {Promise<void>}
     */
    async installDependencies(descriptor) {

        if (descriptor.node_modules) {

            let npmManager = new LivePluginManager(
                {
                    pluginsPath: 'node_modules',
                    npmInstallMode: 'useCache',
                }
            )

            //Now, dependencies
            await Promise.all(
                descriptor.node_modules.map(async (depen) => {
                    try {
                        await npmManager.install(depen)
                    } catch (e) {
                        throw new Exception(`Could not install dependency '${depen.red}' for ${descriptor.name.magenta}\n ${e?.stack || e.message}`)
                    }
                })
            )

        }
    }

    /**
     * This method starts a plugin, by calling its _start() method
     * @param {import("./types.js").PluginLoadResult} preloadData 
     * @returns {Promise<void>}
     */
    async invokeStart(preloadData) {

        let startInterrupt;
        await Promise.race(
            [
                (async () => {
                    try {
                        if (!preloadData.instance) {
                            throw new Exception(`The plugin '${preloadData.descriptor.name.red}' did not even load correctly.\nThe system doesn't have an instance of it.`)
                        }
                        await preloadData.instance._start()
                    } catch (e) {
                        clearTimeout(startInterrupt)
                        delete preloadData.instance
                        preloadData.state = 'crashed'
                        preloadData.error = e
                        throw new Exception(`The plugin '${preloadData.descriptor.name}' failed to start, because: \n${e?.stack || e}`)
                    }
                })(),
                new Promise(
                    (resolve, reject) => {
                        //90s to start
                        startInterrupt = setTimeout(() => reject(new Exception(`The plugin took too long to start. \nThis is not normal!`)), 90 * 1000)
                    }
                )
            ]
        )
        clearTimeout(startInterrupt)
    }



    /**
     * This method is used to configure credentials for a plugin
     * @param {object} param0 
     * @param {string} param0.plugin
     * @param {object} param0.credentials
     * @returns {Promise<void>}
     */
    async setCredentials({ plugin, credentials }) {
        const pluginData = this.getAll()[plugin];
        if (!pluginData) {
            console.log(`pluginData is `, pluginData)
            throw new Exception(`The plugin you're setting credentials '${plugin}' for, doesn't exist.`)
        }

        try {
            checkArgs(credentials, pluginData.descriptor.credentials.validation, 'credentials')
        } catch (e) {
            throw new Exception(`Invalid credentials. \n${e.message || e}`)
        }

        (await PluginManager.getPluginCollections()).parameters.updateOne(
            {
                plugin
            },
            {
                $set: {
                    parameters: credentials
                }
            },
            {
                upsert: true
            }
        );
    }

    /**
     * This method is used to readback the credentials stored for a plugin
     * @param {object} param0 
     * @param {string} param0.plugin
     * @returns {Promise<object>}
     */
    async getCredentials({ plugin }) {
        return (
            await (await PluginManager.getPluginCollections()).parameters.findOne(
                {
                    plugin
                }
            )
        )?.parameters
    }



    /**
     * This method makes a plugin to be enabled or disabled.
     * @param {object} param0
     * @param {string} param0.plugin
     * @param {boolean} param0.state
     * @returns {Promise<void>}
     */
    async toggleEnabledState({ plugin, state }) {

        const pluginData = await this.getAll()[plugin]

        if (!pluginData) {
            throw new Exception(`The plugin named '${plugin}' was not found.`)
        }



        pluginData.enabled = state;

        (await PluginManager.getPluginCollections()).settings.updateOne(
            { plugin },
            {
                $set: {
                    enabled: state
                }
            },
            { upsert: true }
        );


    }



    /**
     * Invoking this method will start a plugin if not running.
     * @param {object} param0 
     * @param {string} param0.faculty
     * @param {string} param0.plugin
     * @returns {Promise<void>}
     */
    async start({ plugin }) {
        const pluginData = this.getAll()[plugin]
        if (!pluginData) {
            throw new Exception(`No plugin was found having the name '${plugin}'`)
        }
        if (pluginData.state === 'active' && pluginData.instance) {
            return console.warn(`Plugin ${plugin} already running`);
        }
        if (!pluginData.instance) {
            try {
                const results = await this.loadPlugin(pluginData)

                //Update the registry to the latest data about the plugin, which was created just now.
                this[registry][plugin] = results
                results.error

                if (results.error) {
                    throw results.error
                }

                return;
            } catch (e) {
                throw new Exception(`Error ecountered while loading plugin. \n${e.stack || e}`)
            }
        }

        if (pluginData.state !== 'active') {
            //The plugin crashed, or was stopped.
            //So, let's just make it start
            await this.invokeStart(pluginData)
            pluginData.state = 'active'
        }
    }
    /**
     * This method stops a running plugin
     * @param {object} param0 
     * @param {string} param0.faculty
     * @param {string} param0.plugin
     * @returns {Promise<void>}
     */
    async stop({ plugin }) {

        const pluginData = this.getAll()[plugin]
        if (!pluginData) {
            throw new Exception(`No plugin was found having the name '${plugin}'`)
        }

        if (pluginData.state === 'stopped') {
            return;
        }


        let timeout;
        await Promise.race(
            [
                (async () => {
                    try {
                        await pluginData.instance?._stop()
                    } catch (e) {
                        delete pluginData.instance
                        pluginData.state = 'crashed'
                        pluginData.error = e
                        clearTimeout(timeout)
                        throw new Exception(`The plugin did not shutdown correctly. \n${e?.stack || e}`)
                    }
                })(),
                new Promise(
                    (resolve, reject) => {
                        //30s to shutdown
                        timeout = setTimeout(() => reject(new Exception(`The plugin took too long to stop. \nThis is not normal!`)), 30 * 1000)
                    }
                )
            ]
        )
        clearTimeout(timeout)

        pluginData.state = 'stopped'


    }

    /**
     * This method is used to uninstall a plugin
     * @param {object} param0 
     * @param {string} param0.plugin
     * @returns {Promise<string>}
     */
    async uninstall({ plugin }) {

        if (!this.getAll()[plugin]) {
            throw new Exception(`The plugin you're trying to uninstall: "${plugin}", was not found.`)
        }

        let warning;

        try {
            await this.stop({ plugin })
        } catch (e) {
            warning = `The plugin was uninstalled, but the system may be unstable due to the following error. \n${e?.stack || e}`
        }

        await fs.promises.rm(this.pluginsDir, { recursive: true, force: true })
        delete this[registry][plugin];


        const pluginCollections = await PluginManager.getPluginCollections()
        pluginCollections.settings.deleteOne({ plugin });
        pluginCollections.parameters.deleteOne({ plugin });

        return warning

    }




    async getPluginNames() {

        const pluginsDir = this.pluginsDir
        if (!fs.existsSync(pluginsDir)) {
            fs.mkdirSync(pluginsDir)
        }
        return fs.readdirSync(pluginsDir)
    }

    get pluginsDir() {
        return `${FacultyPlatform.get().descriptor.path}/_.plugins`
    }


    /**
     * This method returns the collections used to store information about plugins.
     * Be it settings, or parameters.
     * @returns {Promise<import("./types.js").PluginCollections>}
     */
    static async getPluginCollections() {
        const prefix = `_plugins_`

        return new CollectionProxy(
            {
                settings: `${prefix}.settings`,
                parameters: `${prefix}.parameters`
            }
        )
    }


}


/**
 * This method is used to check if an object has a given set of fields
 * @param {Object} _class 
 * @param {typeof _class} instance
 * @param {import("./types.js").ModuleTest} test 
 * @returns {void}
 */
function moduleCheck(_class, instance, test) {

    instance ??= new _class()
    const staticKeyRegexp = /^@(.+)$/


    function check(target, test, propertyName) {
        if (_class.prototype.hasOwnProperty(propertyName)) {
            checkArgs(target[propertyName], test, propertyName)
        } else {
            throw new Exception(`The ${`${typeof test == 'object' ? 'object' : test}`.blue} ${propertyName.red.bold} was not implemented.`)
        }
    }

    for (const stKey of Reflect.ownKeys(test)) {
        if (staticKeyRegexp.test(stKey)) {
            const key = staticKeyRegexp.exec(stKey)[1]
            check(_class, test[stKey], key)
        } else {
            check(_class.prototype, test[stKey], stKey)
        }
    }
}


const registry = Symbol()



/**
 * This method tells us if a url is pointing to a git repository
 * @param {string} url 
 * @returns {boolean}
 */
function isGit(url) {
    return url.endsWith('.git')
}

/**
 * @type {import("./types.js").PluginDescriptor}
 */
const PLUGIN_DESCRIPTOR_STRUCTURE = {
    faculty: 'string',
    label: 'string',
    version: {
        label: 'string',
        code: "string|number"
    },
    namespace: 'string'
}