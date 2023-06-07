/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (file-cache), allows us to speed up reading, and writing to files
 */


import libFs from 'node:fs'
import chokidar from 'chokidar'
import libStream from 'node:stream'

const put = Symbol()
const state = Symbol()
const get = Symbol()
const remove = Symbol()

export default class FileCache {

    /**
     * 
     * @param {soul.http.filecache.Options} options 
     */
    constructor(options) {

        /**
         * @type {soul.http.filecache.CacheState}
         */
        this[state] = {}
        this[state].size = 0
        this[state].items = {}
        this[state].watcher = options?.watcher || new chokidar.FSWatcher()
        this[state].max_size = options?.max_size || (10 * 1024 * 1024); // The max size, or 10MB


        const onFileRemove = (path, stat) => {
            if (this[state].items[path]) {
                this[remove](path)
            }
        }
        this[state].watcher.on('change', onFileRemove)
        this[state].watcher.on('unlink', onFileRemove)

    }
    remove(path) {
        this[remove](path)
    }

    [remove](path) {
        this[state].size -= this[state].items[path].data.byteLength
        this[state].count -= 1
        delete this[state].items[path]
    }

    /**
     * This internal method is used to add an item to the cache
     * @param {string} path 
     * @param {Buffer} data
     * @returns {void}
     */
    [put](path, data) {

        if (!this[state].items[path]) {

            this[state].size += data.byteLength + 3
            this[state].count++

            this[state].items[path] = {
                created: Date.now(),
                accessed: Date.now(),
                score: 0,
                data
            }

            this[state].watcher.add(path)

        } else {
            const old = this[state].items[path]
            if (old.data.byteLength !== data.byteLength) {
                this[state].size -= old.data.byteLength - data.byteLength
            }
        }

        // At this point, we are determining what's going to leave the cache, based on 
        // their relative scores
        if (this[state].size > this[state].max_size) {
            console.log(`There's way too much in the cache ${this[state].size}, instead of ${this[state].max_size}`)
            const ranked = Reflect.ownKeys(this[state].items).map(item => ({ path: item, data: this[state].items[item] })).sort(
                (a, b) => a.data.data.byteLength - b.data.data.byteLength
            )
            let nwSize = 0
            const remaining = []
            for (let i = 0; (i < ranked.length) && (nwSize < this[state].max_size); i++) {
                nwSize += ranked[i].data.data.byteLength
                remaining.push(ranked[i])
            }
            this[state] = {
                ...this[state],
                items: Object.fromEntries(remaining.map(x => [x.path, x.data])),
                count: remaining.length,
                size: nwSize,
            }
        }



    }
    /**
     * This method gets a single item in cache
     * @param {string} path 
     * @returns {Buffer}
     */
    [get](path) {
        this[state].items[path].accessed = Date.now()

        // Now, we score the importance of this path, based on its size, relative to 
        // all other items in the cache
        const iSize = this[state].items[path].data.byteLength + 3
        const score_plus = (10 / (iSize * 0.3)) * this[state].size
        const score_minus = (score_plus / this[state].count) * -1

        for (const item in this[state].items) {
            this[state].items[item].score += item === path ? score_plus : score_minus
        }
        return this[state].items[path]?.data
    }

    /**
     * This method reads a file, and stores it in the cache, before returning it
     * @param {string} path 
     * @returns {Promise<Buffer>}
     */
    async read(path) {
        const start = Date.now()
        if (this[state].items[path]) {
            if (libFs.existsSync(path) && (await libFs.promises.stat(path)).size == this[state].items[path].data.byteLength) {
                if (/zip/.test(path) && this[state].items[path].data.byteLength < 200) {
                    console.warn(`How is ${path.yellow} only ${this[state].items[path].data.byteLength.toString().green} bytes long?`)
                }
                return this[state].items[path].data
            }
        }
        let data = await libFs.promises.readFile(path)
        this[put](path, data)
        return this[get](path) || data
    }

    /**
     * This method reads from the cache, but returns data as a readable stream
     * @param {string} path 
     * @returns {Promise<libStream.Readable>}
     */
    async readAsStream(path) {
        const stream = new libStream.Readable()
        const data = await this.read(path)
        Reflect.defineProperty(stream, 'readableLength', {
            get: () => data.byteLength,
            set: () => true,
            configurable: true,
            enumerable: true
        })
        stream.push(data)
        stream.push(null)
        stream.end = (e, cb) => {
            cb?.()
            stream.destroy(e)
        }
        stream.close = (cb) => { cb?.() }
        return stream
    }

    /**
     * This method returns a stream, which allows files to be written to the cache, but 
     * @param {string} path 
     * @returns {libStream.Writable}
     */
    writeAsStream(path) {
        if (!this[state].items[path]) {
            this[put](path, Buffer.from(''))
        }
        const fileStream = libFs.createWriteStream(path, { autoClose: true })

        const oWrite = fileStream.write
        fileStream.write = (data, encoding, callback) => {
            if (this[state].items[path]) {
                this[put](path, Buffer.concat([this[state].items[path].data, Buffer.from(data)]))
            }
            oWrite.call(fileStream, data, encoding, callback)
        }

        return fileStream
    }

    /**
     * This method writes a file
     * @param {string} path 
     * @param {Buffer} buffer 
     * @returns {Promise<void>}
     */
    async write(path, buffer) {
        this[put](path, data)
        try {
            await libFs.promises.writeFile(path, buffer)
        } catch (e) {
            this[remove](path)
            throw e
        }
    }

}