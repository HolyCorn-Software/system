/**
 * Copyright 2023 HolyCorn Software
 * The soul system.
 * This module (file-manager), keeps track of file versions, sizes, and configuration files
 */




import { BasePlatform } from '../../../../platform.mjs';
import DelayedAction from '../../../../../public/html-hc/lib/util/delayed-action/action.mjs';
import libFs from 'node:fs'

const map = Symbol()
const scheduleUpdate = Symbol()
const updateConfigInfo = Symbol()
const removeConfigInfo = Symbol()
const collection = Symbol()
const frontendConfig = Symbol()
const firstUpdate = Symbol()
const postPoneFileCheck = Symbol()
const dispatchFilesChanged = Symbol()

export default class FileManager {

    /**
     * 
     * @param {import('./types.js').URLInternalMap} _collection 
     */
    constructor(_collection) {

        /** @type {soul.http.frontendManager.fileManager.VersionInfoMap} */
        this[map] = {};

        /** @type {soul.http.frontendManager.fileManager.VersionInfoCollection} */
        this[collection] = _collection;

        /** @type {{[url: string]: soul.http.frontendManager.fileManager.FrontendConfig}} */
        this[frontendConfig] = {};

        this.init();


        /** @type {soul.http.frontendManager.fileManager.FileManagerEvents} */
        this.events = new EventTarget()
    }

    async init() {

        const dbData = (await this[collection].findOne()) || {};
        delete dbData._id
        this[map] = dbData
        const startTime = Date.now()


        const firstUpdatePromise = new Promise(resolve => this[firstUpdate] = resolve)


        // Now, our way of detecting deleted links, is by checking on the app after all frontend files have probably been reported, all vital startup tasks have been done. 
        // After that happens, we simply delete the resources that haven't been updated since system startup.
        BasePlatform.get().events.addListener('booted', async () => {

            await firstUpdatePromise;

            // Wait until all file info has been reported.
            await Promise.allSettled([
                new Promise(x => {
                    let timeout;
                    this[postPoneFileCheck] = () => {
                        clearTimeout(timeout)
                        timeout = setTimeout(() => {
                            x()
                        }, 5000)
                    }
                }),
                // And all system startup tasks are done
                BasePlatform.get().bootTasks.wait(),
                // And all faculties have booted
                BasePlatform.get().faculties.initDone,
                // And all frontend files have compiled
                BasePlatform.get().compat.allDone(),
            ])


            for (const item in this[map]) {
                if (!(this[map][item].version?.emperical > startTime)) {
                    console.log(`${item.magenta.bold} removed. Perhaps the file is no more. Last time was ${new Date(this[map][item].version?.emperical)}`)
                    this.removeURL(item)
                }
            }

            BasePlatform.get().faculties.events.dispatchEvent(
                new CustomEvent(
                    'frontend-manager-files-ready',
                )
            );


            this.events.addEventListener('files-change', new DelayedAction(() => {
                BasePlatform.get().faculties.events.dispatchEvent(
                    new CustomEvent(
                        'frontend-manager-files-change',
                    )
                )
            }, 250, 5000));

        })
    }

    /**
     * This method adds a url path to the map
     * @param {string} url 
     * @param {string} path
     * @param {number} size
     * @returns {void}
     */
    addURL(url, path, size) {
        /** @type {this[map][string]} */
        let item = (this[map][url] ||= {});
        item.version = {
            emperical: Date.now(),
            grand: Date.now()
        }
        item.size = size
        item.links ||= []
        item.path = path
        this[updateConfigInfo](url, path)
        this[scheduleUpdate]()
        this[firstUpdate]?.()
        this[postPoneFileCheck]?.()
        this[dispatchFilesChanged]()
    }
    /**
     * This method links a url to other urls.
     * 
     * Linking it means, visiting this url, will eventually make the user visit the other urls
     * @param {string} url 
     * @param {string[]} urls 
     * @returns {void}
     */
    link(url, urls) {
        if (!this[map][url]) {
            return //console.trace(`Trying to add ${url} links, when it doesn't exist on the map to a path that doesn't exist\n`)
        }
        for (const aUrl of urls) {
            if ((this[map][aUrl]?.links.findIndex(x => x == url) || -1) !== -1) {
                console.warn(`${url.yellow}, is recursively linked to ${aUrl.yellow}`)
                urls = urls.filter(x => x !== aUrl)
            }
        }

        this[map][url].links = [...new Set([...this[map][url].links, ...urls])]

        this[scheduleUpdate]()
        this[dispatchFilesChanged]()
    }

    /**
     * This method is used to update the version of a URL in the map
     * @param {string} url 
     * @param {string} path
     * @param {number} size
     */
    updateVersion(url, path, size) {
        const now = Date.now()
        if (!this[map][url]) {
            this.addURL(url, path, size)
        } else {
            this[updateConfigInfo](url, path)
        }
        this[map][url].version.emperical = this[map][url].version.grand = now
        this[map][url].size = size
        this[map][url].path = path

        // If the file that changed, is an auto-run file, then all HTML files should change
        let isConfigFile = /frontend\.config\.json$/.test(url)
        const config = this.frontendConfig[url]


        for (const item in this[map]) {
            try {
                if ((this[map][item].links ||= []).findIndex(x => x == url) !== -1) {
                    this[map][item].version.grand = now
                } else {
                    if (isConfigFile && FileManager.isHTML(item)) {
                        try {

                            if (config.autorun?.length > 0) {
                                this[map][item].version.grand = now
                            }
                        } catch (e) {
                            console.log(`config file ${path} changed, but we could not update HTML file ${this[map][item].path}, because `, e)
                        }
                    }
                }
            } catch (e) {
                throw e
            }
        }

        // Now that several url versions have updated, let's persist that information
        this[scheduleUpdate]()
        this[dispatchFilesChanged]()
    }

    /**
     * This method determines if a particular resource is an HTML page
     * @param {string} url 
     * @returns {boolean}
     */
    static isHTML(url) {
        return url.endsWith('/') || url.endsWith('html')
    }

    /**
     * This method calculates the grand version of a set of links
     * @param {string} link 
     * @returns {number}
     */
    getGrandVersion(link) {
        return this[map][link]?.version.grand || -1
    }

    /**
     * This method removes a URL from the map
     * @param {string} url 
     * @returns {void}
     */
    removeURL(url) {
        // First remove associations

        for (const item in this[map]) {
            this[map][item].links = this[map][item]?.links.filter(x => x !== url) || []
        }
        delete this[map][url]
        this[scheduleUpdate]()
        this[removeConfigInfo](url)
        this[dispatchFilesChanged]()
    }

    [dispatchFilesChanged] = new DelayedAction(() => {
        this.events.dispatchEvent(
            new CustomEvent('files-change')
        )
    }, 250, 1000)

    /**
     * This method gets all the URLs that are seen to be requested when
     * this one is requested
     * @param {string} url 
     * @returns {({url:string, version:soul.http.frontendManager.fileManager.VersionInfo, size: number, path: string})[]}
     */
    getRelated(url) {

        const grandList = []

        const addLink = (link) => {
            if (this[map][link]) {
                grandList.push(
                    JSON.parse(JSON.stringify(
                        { url: link, version: this[map][link]?.version || {}, size: this[map][link].size, path: this[map][link].path }
                    ))
                );
            }
        }

        const step = (url) => {
            const links = this[map][url]?.links || []
            // Now, if there are no new links at this step
            // then there's no need to find links related to the links
            // console.log(`Links of ${url.cyan}\n`, links, `\nwith map as\n`, this[map])
            for (const link of links) {
                addLink(link);
                step(link)
            }
        }

        step(url)

        addLink(url)

        return [
            ...new Set(
                grandList.map(x => x.url)
            )
        ].map(x => grandList.find(g => g.url === x))
    }
    /**
     * This method returns the empirical version of a URL
     * @param {string} url 
     */
    getVersion(url) {
        return this[map][url]?.version
    }

    [scheduleUpdate] = new DelayedAction(async () => {
        const data = JSON.parse(JSON.stringify(this[map]))
        try {
            await this[collection].deleteMany({})
            await this[collection].insertOne(data)
        } catch (e) {
            console.log(`Could not update database with map\n`, data)
        }
    }, 5000, 15000);

    /**
     * This method updates the set of configuration information about the frontend.
     * @param {string} url 
     * @param {string} path
     * 
     */
    async [updateConfigInfo](url, path) {

        if (!/frontend\.config\.json$/.test(url)) {
            return;
        }


        try {
            this[frontendConfig][url] = JSON.parse((await libFs.promises.readFile(path)).toString())
            this.events.dispatchEvent(
                new CustomEvent('config-change')
            )
        } catch (e) {
            console.warn(`Could not update configuration for path ${url}\n`, e)
        }

    }

    async [removeConfigInfo](url) {
        if (this[frontendConfig][url]) {
            delete this[frontendConfig][url]
            this.events.dispatchEvent(
                new CustomEvent('config-change')
            )
        }
    }

    /**
     * This method filters particular URL paths, that match a given pattern
     * @param {RegExp|string} pattern 
     * @returns {({url: string}&soul.http.frontendManager.fileManager.VersionInfoMap[string])[]}
     */
    getURLs(pattern) {
        pattern = typeof pattern === 'string' ? new RegExp(pattern) : pattern
        const items = []
        for (const url in this[map]) {
            if (pattern.test(url)) {
                items.push({ url, ...this[map][url] })
            }
        }
        return items
    }

    /**
     * @returns {{[url: string]: soul.http.frontendManager.fileManager.FrontendConfig}}
     */
    get frontendConfig() {
        return this[frontendConfig]
    }

}