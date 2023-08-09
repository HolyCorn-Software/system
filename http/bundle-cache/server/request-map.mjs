/**
 * Copyright 2023 HolyCorn Software
 * The Soul System
 * This module (request-map), is part of the bundle-cache module, 
 * and is responsible for keeping a map of how requests lead to other requests,
 * as well as the versions of each url
 */

import { BasePlatform } from '../../../base/platform.mjs';
import DelayedAction from '../../../public/html-hc/lib/util/delayed-action/action.mjs';

const map = Symbol()
const scheduleUpdate = Symbol()
const collection = Symbol()

export default class RequestMap {

    /**
     * 
     * @param {import('./types.js').URLInternalMap} _collection 
     */
    constructor(_collection) {

        /** @type {soul.http.bundlecache.URLInternalMap} */
        this[map] = {}

        /** @type {soul.http.bundlecache.RequestMapCollection} */
        this[collection] = _collection

        this.init()
    }

    async init() {

        const limit = Date.now()

        // Now, our way of detecting deleted links, is by checking on the app after 60s, to remove any paths that haven't been updated since
        BasePlatform.get().events.addListener('booted', () => {

            BasePlatform.get().bootTasks.zeroWait().then(() => {
                BasePlatform.get().compat.allDone().then(async () => {
                    const dbData = (await this[collection].findOne()) || {};
                    delete dbData._id
                    this[map] = dbData

                    for (const item in this[map]) {
                        if (!(this[map][item].version?.emperical > limit)) {
                            console.log(`${item.magenta.bold} removed. Perhaps the file is no more. Last time was ${new Date(this[map][item].version?.emperical)}`)
                            this.removeURL(item)
                        }
                    }
                })

            })

        })
    }

    /**
     * This method adds a url path to the map
     * @param {string} url 
     * @returns {void}
     */
    addURL(url) {
        /** @type {this[map][string]} */
        let item = (this[map][url] ||= {});
        item.version = {
            emperical: Date.now(),
            grand: Date.now()
        }
        item.links ||= []
        this[scheduleUpdate]()
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
            return console.trace(`Trying to add ${url} links to a path that doesn't exist`)
        }
        for (const aUrl of urls) {
            if ((this[map][aUrl]?.links.findIndex(x => x == url) || -1) !== -1) {
                console.warn(`${url.yellow}, is recursively linked to ${aUrl.yellow}`)
                urls = urls.filter(x => x !== aUrl)
            }
        }
        if (
            urls.some(
                u => this[map][url].links.findIndex(x => x == u) == -1
            )
        ) {
            this[map][url].version.grand = Date.now()
            console.log(`Linking new at version ${this[map][url].version.grand} ones to ${url}\n`, urls)
        }

        this[map][url].links = [...new Set([...this[map][url].links, ...urls])]

        // Now, find URLs that are linked to this one, and update their grand version
        for (const item in this[map]) {
            if (this[map][item].links.findIndex(x => x == url) !== -1) {
                this[map][item].version.grand = Date.now()
            }
        }

        this[scheduleUpdate]()
    }

    /**
     * This method is used to update the version of a URL in the map
     * @param {string} url 
     */
    updateVersion(url) {
        const now = Date.now()
        if (!this[map][url]) {
            this.addURL(url)
        }
        this[map][url].version.emperical = this[map][url].version.grand = now


        for (const item in this[map]) {
            try {
                if ((this[map][item].links ||= []).findIndex(x => x == url) !== -1) {
                    this[map][item].version.grand = now
                }
            } catch (e) {
                console.log(`links is first of all\n`, this[map][item]?.links, `\nWith entire map being\n`, this[map])
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
    }

    /**
     * This method gets all the URLs that are seen to be requested when
     * this one is requested
     * @param {string} url 
     * @returns {({url:string, version:soul.http.bundlecache.VersionInfo})[]}
     */
    getRelated(url) {

        const grandList = []

        const step = (url) => {
            const links = this[map][url]?.links || []
            // Now, if there are no new links at this step
            // then there's no need to find links related to the links
            for (const link of links) {
                grandList.push({ url: link, version: this[map][url]?.version || {} })
                step(link)
            }
        }

        step(url)

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

    [scheduleUpdate] = new DelayedAction(
        async () => {
            const data = JSON.parse(JSON.stringify(this[map]))
            try {
                await this[collection].deleteMany({})
                await this[collection].insertOne(data)
            } catch (e) {
                console.log(`Could not update database with map\n`, data)
            }
        }, 5000
    )

}