/**
 * Copyright 2022 HolyCorn Software
 * This module (simple-cache) allows components to maintain a simple cache.
 * 
 * The cache works by defining a fetch function, and a timeout.
 * If the cache is querried when the data in it is older than the timeout, it fetches new data, stores it, and returns it. Subsequent fetches will return the
 * newly fetched data, till it's old enough to be obsolete
 */





const cacheData = Symbol()
const cacheDataLastRefresh = Symbol()
const fetchPromise = Symbol()

/**
 * @template Type
 */
export default class SimpleCache {
    /**
     * 
     * @param {object} param0 
     * @param {typeof this.get} param0.get
     * @param {number} param0.timeout
     */
    constructor({ get, timeout = 60 * 1000 }) {

        Object.assign(this, arguments[0])

        /**
         * @returns {Promise<Type>}
         */
        this.get = async () => {
            if (this[cacheData] && (Date.now() - (this[cacheDataLastRefresh] || 0)) < timeout) {
                return this[cacheData]
            }

            const fetchAnew = async () => {
                this[cacheData] = await get()
                this[cacheDataLastRefresh] = Date.now()
                return this[cacheData]
            }

            if (this[fetchPromise]) {
                try {
                    return await this[fetchPromise]
                } catch {
                    const results = (await (this[fetchPromise] = fetchAnew()))
                    delete this[fetchPromise]
                    return results
                }
            } else {
                return await (this[fetchPromise] = fetchAnew())
            }
        }

    }
}