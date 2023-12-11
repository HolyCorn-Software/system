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


        // Now, our way of detecting deleted links, is by checking on the app after 60s, to remove any paths that haven't been updated since
        BasePlatform.get().events.addListener('booted', async () => {

            await firstUpdatePromise;

            await new Promise(x => setTimeout(x, 12_000))

            await BasePlatform.get().bootTasks.wait().then(() => {
                BasePlatform.get().compat.allDone().then(
                    async () => {
                        for (const item in this[map]) {
                            if (!(this[map][item].version?.emperical > startTime)) {
                                console.log(`${item.magenta.bold} removed. Perhaps the file is no more. Last time was ${new Date(this[map][item].version?.emperical)}`)
                                this.removeURL(item)
                            }
                        }
                    }).then(() => {
                        BasePlatform.get().faculties.events.dispatchEvent(
                            new CustomEvent(
                                'frontend-manager-files-ready',
                            )
                        )
                    })
            });


            this.events.addEventListener('files-change', () => {
                BasePlatform.get().faculties.events.dispatchEvent(
                    new CustomEvent(
                        'frontend-manager-files-change',
                    )
                )
            });

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
        this.events.dispatchEvent(
            new CustomEvent('files-change')
        )
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


        for (const item in this[map]) {
            try {
                if ((this[map][item].links ||= []).findIndex(x => x == url) !== -1) {
                    this[map][item].version.grand = now
                }
            } catch (e) {
                throw e
            }
        }

        // Now that several url versions have updated, let's persist that information
        this[scheduleUpdate]()
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
        this.events.dispatchEvent(
            new CustomEvent('files-change')
        )
    }

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
            this.events.dispatchEvent(
                new CustomEvent('files-change')
            )
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