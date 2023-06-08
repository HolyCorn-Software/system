/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This script is the service worker, intended to intercept requests, and making caching
 * possible
 */


console.log(`Okay, service worker working (v1) `);

const CACHE_NAME = 'bundle_cache0'

// Let's pull the bundle needed for this page

// First things, first let's keep track of the server's version

self.addEventListener('fetch', (event) => {

    /** @type {Request} */const request = event.request

    event.respondWith(
        (async () => {

            const theClient = await self.clients.get(event.clientId)
            const origin = theClient?.url || request.url

            const promise = (async () => {

                if (!isUIFile(request.url) || /^\$bundle_cache/gi.test(request.url) || (request.method.toLowerCase() !== 'get')) {
                    try {
                        return await fetch(request)
                    } catch (e) {
                        return await findorFetchResource(request, origin)
                    }
                }


                try {
                    if (isHTML(origin) && !await grandVersionOkay(origin)) {
                        const guPromise = grandUpdate(origin)
                        guPromise.then(() => {
                            console.log(`Grand update of ${origin} finished!`)
                        }).catch(e => {
                            console.log(`Grand update to ${origin} failed\n`, e)
                        })
                        if (isHTML(request.url)) {
                            return temporalPageResponse()
                        }
                        await guPromise
                    }
                    const result = await findorFetchResource(request, origin)
                    return result
                } catch (e) {
                    console.error(`Failed to perform service worker duties for url ${request.url}\n`, e)

                    return await safeFetch(request)
                }

            })();

            if (isUIFile(request.url) && isHTML(origin)) {
                loader.load(origin, promise)
            }
            return await promise
        })()
    )

})

/**
 * This method safely fetches a request.
 * 
 * Safely means returning an offline page if the fetch failed
 * @param {URL|RequestInfo} url 
 * @param {RequestInit} init 
 * @param {Promise<Response>} params 
 */
async function safeFetch(url, init) {
    try {
        return await fetch(...arguments)
    } catch (e) {
        if (isHTML(url?.url || url)) {
            return offlineResponse();
        }

        throw e
    }
}


const templates = {
    offline: `
        <!DOCTYPE html>
        <!-- 
            Copyright 2023 HolyCorn Software
            The soul system offline page
        -->
        <html>
            <head>
                <meta name='viewport' content= 'width=device-width,initial-scale=1.0,user-scalable=no' />
            </head>
            <body>
                <div class='all'>
                    <div class='img'>
                        <img src='/$/shared/static/logo.png'>
                    </div>
                    <div class='message'>
                        <div class='container'>
                            
                            <div class='title'>Offline</div>
                            <div class='content'>You seem to be offline.
                            Please Check your internet connection.
                            If this is not a problem of internet connection, please contact support.
                            </div>
                        </div>
                    </div>

                    <div class='retry'>
                        <div class='main'>Try again</div>
                    </div>
                </div>
                
            </body>

            <style>
                body{
                    color:white;
                    background-color: rgba(16, 53, 99, 1);
                    font-family:k2d,monospace;

                }

                .all{
                    display:flex;
                    flex-direction:column;
                    width:100vw;
                    height: 100vh;
                    position:fixed;
                    align-items:center;
                    justify-content:center;
                }

                .all >.retry{
                    display:flex;
                    flex-direction:column;
                    padding-top:3em;
                }
                .all >.retry >.main{
                    display:inline-flex;
                    background-color:white;
                    color:rgba(16, 53, 99, 1);
                    border-radius:8px;
                    padding:0.5em;
                    cursor:pointer;
                    transition:0.5s 0.125s;
                }
                .all >.retry >.main:hover{
                    border-radius:28px;
                    font-weight:bolder;
                }

                .all >.message{
                    display:flex;
                    justify-content:center;
                    align-items:center;
                    left: 0px;
                    top: 0px;
                }
                .all >.message >.container{
                    display:inline-flex;
                    flex-direction:column;
                    gap:1.5em;
                    border:1px solid lightblue;
                    border-radius:1em;
                    padding:1.5em;
                    max-width:clamp(300px, 400px, 80vw);
                }
                .all >.img{
                    display:flex;
                    justify-content:center;
                    padding-bottom:3em;
                }
                .all >.img >img{
                    border-radius:100%;
                    background-color:white;
                    object-fit:contain;
                    height:4em;
                    width:4em;
                    border:2px solid lightblue;
                }
                .all >.message >.container >.title{
                    font-size:1.5em;
                    font-weight:bolder;
                }
                
                @font-face {
                    font-family:k2d;
                    src: url('/$/system/static/html-hc/lib/fonts/res/K2D-Regular.ttf');
                }
            </style>

            <script>
                document.body.querySelector('.retry >.main').addEventListener('click', ()=>{
                    window.location.reload()
                })
            </script>
        </html>
    `
}

self.addEventListener('install', async (event) => {
    event.waitUntil(self.skipWaiting())
})


self.addEventListener('activate', async (event) => {
    controller.continueLoad()
    console.log(`Activate called.`)
    await event.waitUntil(self.clients.claim().then(async () => {
        controller.updateStorage()
        controller.continueLoad();
        console.log(`Activated!!!`)
    }))

})


function offlineResponse() {
    const response = new Response(new Blob([templates.offline], { type: 'text/html' }),
        {
            headers: {
                'X-bundle-cache-generated': true
            }
        }
    );

    return response;
}

let lastOfflineCheck = Date.now();
let lastOfflineValue;
async function isOffline(request) {
    if (1) {
        return false
    }
    if ((Date.now() - lastOfflineCheck < 20 * 1000)) {
        return lastOfflineValue
    }
    try {
        await (fetchTasks[request.url] = fetch(url));
        lastOfflineCheck = Date.now()
        return lastOfflineValue = false
    } catch {
        return lastOfflineValue = true
    }
}

/**
 * This method checks if a URL path is pointing to an HTML source
 * @param {string} url 
 * @returns {boolean}
 */
function isHTML(url) {
    return url.endsWith('/') || /\.[a-zA-Z]{0,1}html$/i.test(url)
}

function isUIFile(url) {
    return isHTML(url) || /.((mjs)|(js)|(css)|(css3)|(svg))$/.test(url) || /\/shared\/static\/logo.png/.test(url)
}

const storageObject = {}

const channel = Symbol()


class SWControllerClient {
    constructor() {
        this[channel] = new BroadcastChannel('serviceworker-control')
        this[channel].addEventListener('message', (event) => {
            switch (event.data?.type) {
                case 'setStorage': {
                    Object.assign(storageObject, event.data.data)
                    break;
                }
            }

        })
    }

    async continueLoad() {
        this[channel].postMessage({ type: 'continue' })
    }

    async setStorage() {
        this[channel].postMessage({ type: 'setStorage', data: storageObject })
    }
    async updateStorage() {
        this[channel].postMessage({ type: 'getStorage' })
    }
}

const controller = new SWControllerClient()

class SWLoaderClient {

    constructor() {
        const channel = new BroadcastChannel('page-load')
        const promises = Symbol()

        /** @type {{[origin: string]: Promise[]}} */ this[promises] = {};

        const post = (msg, origin, id) => channel.postMessage({ [msg]: id, origin })
        /**
         * This method puts the page of an origin to start loading, for as long as this promise
         *  is pending
         * @param {string} origin The origin that we want the page on to show a loader
         * @param {Promise} promise The page will keep loading, as long as this promise is pending
         * @returns {void}
         */
        this.load = (origin, promise) => {
            const id = `${Date.now()}${Math.random()}${Math.random()}`
            post('load', origin, id);

            (async () => {
                try {
                    await promise
                } catch { }
                post('unload', origin, id)
            })()
        }

    }

}

const loader = new SWLoaderClient()

class SWStorageClient {

    constructor() {
    }

    /**
     * This method gets an item from the storage
     * @param {string} key 
     * @returns {Promise<string|number>}
     */
    async getKey(key) {
        controller.updateStorage();
        return storageObject[key]
    }


    /**
     * This method sets an item on local Storage
     * @param {string} key 
     * @param {any} value 
     * @returns {Promise<void>}
     */
    async setKey(key, value) {
        storageObject[key] = value
        controller.setStorage()
    }

}


const storage = new SWStorageClient()

/**
 * @type {[path: string]: Promise<void>}
 */
const grandUpdates = {}


/**
 * This method directly requests for the grand bundle of a given url.
 * 
 * It doesn't check if the update is deserved
 * @param {string} origin 
 * @returns {Promise<void>}
 */
async function grandUpdate(origin) {
    const path = new URL(origin).pathname


    async function freshUpdate() {
        try {
            grandUpdates[path] = main();
            if (isHTML(origin)) {
                loader.load(origin, grandUpdates[path]);
            }
            await grandUpdates[path];
            delete grandUpdates[path];
        } catch (e) {
            delete grandUpdates[path];
            throw e;
        }
    }


    async function main() {
        try {


            const cache = await caches.open(CACHE_NAME)

            // Let's allow the possibility of a partial update,
            // by sending the server information of the files we already have in cache


            const response = await fetch('/$bundle_cache/grand', {
                method: 'GET',
                headers: {
                    'x-bundle-cache-path': path,
                    'x-bundle-cache-version': await storage.getKey(`${path}-version`)
                }
            });

            const nwVersion = Date.now()

            const len = new Number(response.headers.get('Content-Length')).valueOf()
            if (len > 0) {


                const unzipper = await ZipLoader.unzip(
                    await response.blob()
                )

                for (let file in unzipper.files) {
                    const contents = unzipper.files[file].buffer
                    file = `/${file.replace(/\/.index$/, '/')}`

                    const response = new Response(new Blob([contents]),
                        {
                            status: 200,
                            statusText: 'FOUND',
                            headers: {
                                'Content-Type': getMime(file),
                                'Content-Length': contents.byteLength,
                                'x-bundle-cache-version': Date.now()
                            }

                        }
                    )
                    if (/bundle_cache/gi.test(file)) {
                        console.log(`Why are we putting this in cache? ${file}`)
                    }
                    await cache.put(file, response)
                }
            }
            await storage.setKey(`${path}-version`, nwVersion)
            await storage.setKey(`${path}-remote-version`, nwVersion)


        } catch (e) {

            throw e
        }
    }

    if (grandUpdates[path]) {
        await Promise.race([
            grandUpdates[path],
            new Promise((resolve, reject) => setTimeout(reject, 20_000))
        ]).catch(e => freshUpdate())
    } else {
        await freshUpdate();
    }

}

const fetchTasks = {}


/**
 * This method loads a single resource, whether from the cache, or not
 * @param {Request} request 
 * @returns {Promise<Response>}
 */
async function findorFetchResource(request, origin) {
    // First things, first, ... wait for any grand update that's currently ongoing
    try {
        await Promise.race([grandUpdates[origin], new Promise(x => setTimeout(x, 15_000))])
    } catch { }

    if (fetchTasks[request.url]) {
        try {
            const res = await fetchTasks[request.url]
            delete fetchTasks[request.url]
            return res
        } catch (e) {
            delete fetchTasks[request.url]
            throw e
        }

    }

    // Now that the grand updates are done, we check the cache for what we're looking for

    const cache = await caches.open(CACHE_NAME)

    async function fetchNew() {
        const preHeaders = new Headers(request.headers)
        preHeaders.set('x-bundle-cache-src', origin)
        const response = await safeFetch(request.url, {
            ...request,
            headers: preHeaders
        })
        if (response.headers.get('x-bundle-cache-generated')) {
            return response
        }
        const headers = new Headers(response.headers)
        headers.append('x-bundle-cache-version', Date.now())


        const nwResponse = new Response(new Blob([await response.clone().arrayBuffer()]),
            {
                status: response.status,
                statusText: response.statusText,
                headers: headers
            }
        )
        cache.put(request.url, nwResponse)
        return response
    }
    if (isHTML(request.url) && await isOffline(request.url)) {
        return offlineResponse()
    }
    const inCache = await cache.match(request, { ignoreMethod: true, ignoreVary: true })

    if (inCache) {
        return inCache
    }


    const nwPromise = fetchTasks[request.url] = fetchNew();
    nwPromise.finally(x => delete fetchTasks[request.url])

    if (isHTML(request.url) && isHTML(origin)) {
        return temporalPageResponse()
    } else {
        return await nwPromise
    }


}

/**
 * @type {{[origin: string]: {time: number, results:boolean}}}
 */
let lastGrandVersionCheck = {
}
function temporalPageResponse() {
    return new Response(new Blob([`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Please Wait</title>
                <meta name='viewport' content='width=device-width,initial-scale=1.0,user-scalable=no' />
            </head>

            <body>
                <div class='hc-sw-spinner'>
                    <div class='container'>
                        <div class='unit'></div>
                        <div class='unit'></div>
                        <div class='unit'></div>
                        <div class='unit'></div>
                        <div class='unit'></div>
                        <div class='unit'></div>
                        <div class='unit'></div>
                    </div>
                    <div class='logo'>
                        <img src='/$/shared/static/logo.png'>
                    </div>
                </div>
            </body>

            <style>
                body{
                    background-color:rgba(16, 53, 99, 1);
                    color:white;
                }
                /*
            Copyright 2023 HolyCorn Software
            This stylesheet allows us to display a loading page when the servie worker is
            loading a page

            */

            .hc-sw-spinner {
                width: calc(100vw + 16px);
                height: calc(100vh + 16px);
                z-index: 1000;
                background-color: rgba(16, 53, 99, 1);
                position: fixed;
                margin:-8px;
            }

            .hc-sw-spinner, .hc-sw-spinner>.container {
                display: inline-grid;
                place-items: center;
            }

            .hc-sw-spinner >.logo{
                position:absolute;
                left:calc(50% - 1.25em);
                top: calc(50% - 1.25em);
                width:2em;
                aspect-ratio:1/1;
                background-color:white;
                border-radius:100%;
                padding-left:0.25em;
                padding-right:0.25em;
                padding-top:0.25em;
                padding-bottom:0.25em;
            }
            .hc-sw-spinner >.logo >img{
                width:100%;
                height:100%;
                object-fit:contain;
            }


            .hc-sw-spinner .container .unit {
                border: 0.25em solid transparent;
                border-radius: 50%;
                border-top-color: #ffc000;
                content: '';

                width: 5em;
                height: 5em;

                position: absolute;
                animation: 3.5s spin infinite;

                font-size: 0.75em;
            }

            .hc-sw-spinner>.container {
                animation: 1s spin infinite;
            }

            .hc-sw-spinner.paused .unit,
            .hc-sw-spinner.paused>.container {
                animation: none !important;
            }

            @keyframes spin {
                0% {
                    transform: rotate(0deg);
                }

                100% {
                    transform: rotate(355deg);
                }
            }
            </style>

            <script>
                // Here, we make sure we keep trying to fetch the real page, to see if it's available
                function doLoad(){
                    fetch(window.location.href).then((reply)=> {
                        if(!reply.headers.get('x-bundle-cache-temporal-page')){
                            setTimeout(()=>window.location.reload(), 2_000)
                        }else{
                            return setTimeout(()=>doLoad(), 2_000)
                        }
                    }).catch(e=>doLoad())
                }

                doLoad()
            </script>
        </html>
    `], { type: 'text/html' }),
        {
            status: 200,
            statusText: `OK TEMPORAL`,
            headers: {
                'x-bundle-cache-temporal-page': 'true'
            }
        }
    );
}

const grandVersionCheckTasks = {}

/**
 * This method checks if the grand version of what we have stored is okay.
 * This method makes sure, if we already have previous information, we use
 * that information to mitigate delays, by returning immediately
 * @param {string} origin 
 * @returns {Promise<boolean>}
 */
async function grandVersionOkay(origin) {

    if ((Date.now() - (lastGrandVersionCheck[origin]?.time || 0) < 60_000) && lastGrandVersionCheck[origin].results === true) {
        return true
    }

    if (grandVersionCheckTasks[origin]) {
        return await grandVersionCheckTasks[origin]
    }

    grandVersionCheckTasks[origin] = (async () => {

        const checkPromise = (async () => {


            const MAX_TIME = 20_000
            const path = new URL(origin).pathname;

            const knownRemoteVersion = await storage.getKey(`${path}-remote-version`)
            const localVersion = (await storage.getKey(`${path}-version`)) || -1
            const remoteVersion =
                //If we already know what the remote version is
                await Promise.race(
                    [
                        new Promise(done => setTimeout(() => done(knownRemoteVersion), MAX_TIME)),
                        (async () => {
                            try {
                                await fetchGrandVersion(origin)
                            } catch (e) {
                                console.warn(`Could not fetch grand version of ${path}, so we'll use the older ${knownRemoteVersion} `)
                            }

                            // In case it succeeds, localStorage would be updated. If not, we use our older information
                            return (await storage.getKey(`${path}-remote-version`)) || knownRemoteVersion
                        })()
                    ]
                );

            (lastGrandVersionCheck[origin] ||= {}).time = Date.now()

            return lastGrandVersionCheck[origin].results = localVersion >= remoteVersion

        })()

        loader.load(origin, checkPromise)

        return await checkPromise
    })()

    try {
        const result = await grandVersionCheckTasks[origin]
        delete grandVersionCheckTasks[origin]
        return result
    } catch (e) {
        delete grandVersionCheckTasks[origin]
        throw e
    }



}

/** @type {[path:string]: Promise<void>} */
const grandVersionTasks = {}
/**
 * This method gets the grand version of a path, all anew, in an orderly way
 * @param {string} origin 
 * @returns {Promise<number>}
 */
async function fetchGrandVersion(origin) {
    const path = new URL(origin).pathname;
    async function check() {
        const data = await (await fetch('/$bundle_cache/getGrandVersion', {
            headers: {
                'x-bundle-cache-path': path
            }
        })).json()
        await storage.setKey(`${path}-remote-version`, data.version)
    }

    // The following section ensures that the grand version of each path can be 
    // fetched, no more than once in 5s, and fetched one at a time
    const newFetch = async () => {
        await (grandVersionTasks[path] = check())
        if (isHTML(origin)) {
            loader.load(origin, grandVersionTasks[path])
        }
        setTimeout(() => delete grandVersionTasks[path], 5000)
    }
    if (grandVersionTasks[path]) {
        try {
            await grandVersionTasks[path]
        } catch {
            try {
                await newFetch()
            } catch (e) {
                throw e
            }
        }
    } else {
        await newFetch()
    }
}



/**
 * This method gets the mime-type of an extension
 * @param {string} fileName 
 * @returns {string}
 */
function getMime(fileName) {
    const extension = fileName?.split('.').at(-1)
    if (fileName.endsWith('/')) {
        return "text/html"
    }
    for (const item in mimeTable) {
        /** @type {string[]} */
        const exts = mimeTable[item].extensions
        if (exts.findIndex(x => x === extension) !== -1) {
            return item
        }
    }
    return "application/octet-stream"
}


const mimeTable = {
    "text/html": {
        extensions: [
            "xhtml",
            "xht",
            "xhtm",
            "/"
        ]
    },
    "text/html": {
        extensions: [
            "html",
            "htm",
            "shtml",
            "shtm"
        ]
    },
    "image/apng": {
        extensions: [
            "apng"
        ]
    },
    "application/wasm": {
        extensions: [
            "wasm"
        ]
    },
    "text/javascript": {
        extensions: [
            "js",
            "mjs"
        ]
    },
    "image/bmp": {
        extensions: [
            "bmp"
        ]
    },
    "image/gif": {
        extensions: [
            "gif"
        ]
    },
    "image/jpeg": {
        extensions: [
            "jpeg",
            "jpg",
            "jpe"
        ]
    },
    "image/png": {
        extensions: [
            "png"
        ]
    },
    "image/svg+xml": {
        extensions: [
            "svg",
            "svgz"
        ]
    },
    "image/vnd.microsoft.icon": {
        extensions: [
            "ico"
        ]
    },
    "image/webp": {
        extensions: [
            "webp"
        ]
    },
    "image/x-icon": {
        extensions: [
            "ico"
        ]
    },
    "text/css": {
        extensions: [
            "css"
        ]
    }
}








// ZipLoader source
/*!
 * zip-loader
 * https://github.com/yomotsu/ZipLoader
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 * ZipLoader uses pako, released under the MIT license.
 */
var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var pako_inflate_minExports = {};
var pako_inflate_min = {
    get exports() { return pako_inflate_minExports; },
    set exports(v) { pako_inflate_minExports = v; },
};

/*! pako 2.1.0 https://github.com/nodeca/pako @license (MIT AND Zlib) */

(function (module, exports) {
    !function (e, t) { t(exports); }(commonjsGlobal, (function (e) { var t = (e, t, i, n) => { let a = 65535 & e | 0, r = e >>> 16 & 65535 | 0, o = 0; for (; 0 !== i;) { o = i > 2e3 ? 2e3 : i, i -= o; do { a = a + t[n++] | 0, r = r + a | 0; } while (--o); a %= 65521, r %= 65521; } return a | r << 16 | 0 }; const i = new Uint32Array((() => { let e, t = []; for (var i = 0; i < 256; i++) { e = i; for (var n = 0; n < 8; n++)e = 1 & e ? 3988292384 ^ e >>> 1 : e >>> 1; t[i] = e; } return t })()); var n = (e, t, n, a) => { const r = i, o = a + n; e ^= -1; for (let i = a; i < o; i++)e = e >>> 8 ^ r[255 & (e ^ t[i])]; return -1 ^ e }; const a = 16209; var r = function (e, t) { let i, n, r, o, s, l, d, f, c, h, u, w, b, m, k, _, g, p, v, x, y, E, R, A; const Z = e.state; i = e.next_in, R = e.input, n = i + (e.avail_in - 5), r = e.next_out, A = e.output, o = r - (t - e.avail_out), s = r + (e.avail_out - 257), l = Z.dmax, d = Z.wsize, f = Z.whave, c = Z.wnext, h = Z.window, u = Z.hold, w = Z.bits, b = Z.lencode, m = Z.distcode, k = (1 << Z.lenbits) - 1, _ = (1 << Z.distbits) - 1; e: do { w < 15 && (u += R[i++] << w, w += 8, u += R[i++] << w, w += 8), g = b[u & k]; t: for (; ;) { if (p = g >>> 24, u >>>= p, w -= p, p = g >>> 16 & 255, 0 === p) A[r++] = 65535 & g; else { if (!(16 & p)) { if (0 == (64 & p)) { g = b[(65535 & g) + (u & (1 << p) - 1)]; continue t } if (32 & p) { Z.mode = 16191; break e } e.msg = "invalid literal/length code", Z.mode = a; break e } v = 65535 & g, p &= 15, p && (w < p && (u += R[i++] << w, w += 8), v += u & (1 << p) - 1, u >>>= p, w -= p), w < 15 && (u += R[i++] << w, w += 8, u += R[i++] << w, w += 8), g = m[u & _]; i: for (; ;) { if (p = g >>> 24, u >>>= p, w -= p, p = g >>> 16 & 255, !(16 & p)) { if (0 == (64 & p)) { g = m[(65535 & g) + (u & (1 << p) - 1)]; continue i } e.msg = "invalid distance code", Z.mode = a; break e } if (x = 65535 & g, p &= 15, w < p && (u += R[i++] << w, w += 8, w < p && (u += R[i++] << w, w += 8)), x += u & (1 << p) - 1, x > l) { e.msg = "invalid distance too far back", Z.mode = a; break e } if (u >>>= p, w -= p, p = r - o, x > p) { if (p = x - p, p > f && Z.sane) { e.msg = "invalid distance too far back", Z.mode = a; break e } if (y = 0, E = h, 0 === c) { if (y += d - p, p < v) { v -= p; do { A[r++] = h[y++]; } while (--p); y = r - x, E = A; } } else if (c < p) { if (y += d + c - p, p -= c, p < v) { v -= p; do { A[r++] = h[y++]; } while (--p); if (y = 0, c < v) { p = c, v -= p; do { A[r++] = h[y++]; } while (--p); y = r - x, E = A; } } } else if (y += c - p, p < v) { v -= p; do { A[r++] = h[y++]; } while (--p); y = r - x, E = A; } for (; v > 2;)A[r++] = E[y++], A[r++] = E[y++], A[r++] = E[y++], v -= 3; v && (A[r++] = E[y++], v > 1 && (A[r++] = E[y++])); } else { y = r - x; do { A[r++] = A[y++], A[r++] = A[y++], A[r++] = A[y++], v -= 3; } while (v > 2); v && (A[r++] = A[y++], v > 1 && (A[r++] = A[y++])); } break } } break } } while (i < n && r < s); v = w >> 3, i -= v, w -= v << 3, u &= (1 << w) - 1, e.next_in = i, e.next_out = r, e.avail_in = i < n ? n - i + 5 : 5 - (i - n), e.avail_out = r < s ? s - r + 257 : 257 - (r - s), Z.hold = u, Z.bits = w; }; const o = 15, s = new Uint16Array([3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0]), l = new Uint8Array([16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78]), d = new Uint16Array([1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0]), f = new Uint8Array([16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64]); var c = (e, t, i, n, a, r, c, h) => { const u = h.bits; let w, b, m, k, _, g, p = 0, v = 0, x = 0, y = 0, E = 0, R = 0, A = 0, Z = 0, S = 0, T = 0, O = null; const U = new Uint16Array(16), D = new Uint16Array(16); let I, B, N, C = null; for (p = 0; p <= o; p++)U[p] = 0; for (v = 0; v < n; v++)U[t[i + v]]++; for (E = u, y = o; y >= 1 && 0 === U[y]; y--); if (E > y && (E = y), 0 === y) return a[r++] = 20971520, a[r++] = 20971520, h.bits = 1, 0; for (x = 1; x < y && 0 === U[x]; x++); for (E < x && (E = x), Z = 1, p = 1; p <= o; p++)if (Z <<= 1, Z -= U[p], Z < 0) return -1; if (Z > 0 && (0 === e || 1 !== y)) return -1; for (D[1] = 0, p = 1; p < o; p++)D[p + 1] = D[p] + U[p]; for (v = 0; v < n; v++)0 !== t[i + v] && (c[D[t[i + v]]++] = v); if (0 === e ? (O = C = c, g = 20) : 1 === e ? (O = s, C = l, g = 257) : (O = d, C = f, g = 0), T = 0, v = 0, p = x, _ = r, R = E, A = 0, m = -1, S = 1 << E, k = S - 1, 1 === e && S > 852 || 2 === e && S > 592) return 1; for (; ;) { I = p - A, c[v] + 1 < g ? (B = 0, N = c[v]) : c[v] >= g ? (B = C[c[v] - g], N = O[c[v] - g]) : (B = 96, N = 0), w = 1 << p - A, b = 1 << R, x = b; do { b -= w, a[_ + (T >> A) + b] = I << 24 | B << 16 | N | 0; } while (0 !== b); for (w = 1 << p - 1; T & w;)w >>= 1; if (0 !== w ? (T &= w - 1, T += w) : T = 0, v++, 0 == --U[p]) { if (p === y) break; p = t[i + c[v]]; } if (p > E && (T & k) !== m) { for (0 === A && (A = E), _ += x, R = p - A, Z = 1 << R; R + A < y && (Z -= U[R + A], !(Z <= 0));)R++, Z <<= 1; if (S += 1 << R, 1 === e && S > 852 || 2 === e && S > 592) return 1; m = T & k, a[m] = E << 24 | R << 16 | _ - r | 0; } } return 0 !== T && (a[_ + T] = p - A << 24 | 64 << 16 | 0), h.bits = E, 0 }, h = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_MEM_ERROR: -4, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 }; const { Z_FINISH: u, Z_BLOCK: w, Z_TREES: b, Z_OK: m, Z_STREAM_END: k, Z_NEED_DICT: _, Z_STREAM_ERROR: g, Z_DATA_ERROR: p, Z_MEM_ERROR: v, Z_BUF_ERROR: x, Z_DEFLATED: y } = h, E = 16180, R = 16190, A = 16191, Z = 16192, S = 16194, T = 16199, O = 16200, U = 16206, D = 16209, I = e => (e >>> 24 & 255) + (e >>> 8 & 65280) + ((65280 & e) << 8) + ((255 & e) << 24); function B() { this.strm = null, this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new Uint16Array(320), this.work = new Uint16Array(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0; } const N = e => { if (!e) return 1; const t = e.state; return !t || t.strm !== e || t.mode < E || t.mode > 16211 ? 1 : 0 }, C = e => { if (N(e)) return g; const t = e.state; return e.total_in = e.total_out = t.total = 0, e.msg = "", t.wrap && (e.adler = 1 & t.wrap), t.mode = E, t.last = 0, t.havedict = 0, t.flags = -1, t.dmax = 32768, t.head = null, t.hold = 0, t.bits = 0, t.lencode = t.lendyn = new Int32Array(852), t.distcode = t.distdyn = new Int32Array(592), t.sane = 1, t.back = -1, m }, z = e => { if (N(e)) return g; const t = e.state; return t.wsize = 0, t.whave = 0, t.wnext = 0, C(e) }, F = (e, t) => { let i; if (N(e)) return g; const n = e.state; return t < 0 ? (i = 0, t = -t) : (i = 5 + (t >> 4), t < 48 && (t &= 15)), t && (t < 8 || t > 15) ? g : (null !== n.window && n.wbits !== t && (n.window = null), n.wrap = i, n.wbits = t, z(e)) }, L = (e, t) => { if (!e) return g; const i = new B; e.state = i, i.strm = e, i.window = null, i.mode = E; const n = F(e, t); return n !== m && (e.state = null), n }; let M, H, j = !0; const K = e => { if (j) { M = new Int32Array(512), H = new Int32Array(32); let t = 0; for (; t < 144;)e.lens[t++] = 8; for (; t < 256;)e.lens[t++] = 9; for (; t < 280;)e.lens[t++] = 7; for (; t < 288;)e.lens[t++] = 8; for (c(1, e.lens, 0, 288, M, 0, e.work, { bits: 9 }), t = 0; t < 32;)e.lens[t++] = 5; c(2, e.lens, 0, 32, H, 0, e.work, { bits: 5 }), j = !1; } e.lencode = M, e.lenbits = 9, e.distcode = H, e.distbits = 5; }, P = (e, t, i, n) => { let a; const r = e.state; return null === r.window && (r.wsize = 1 << r.wbits, r.wnext = 0, r.whave = 0, r.window = new Uint8Array(r.wsize)), n >= r.wsize ? (r.window.set(t.subarray(i - r.wsize, i), 0), r.wnext = 0, r.whave = r.wsize) : (a = r.wsize - r.wnext, a > n && (a = n), r.window.set(t.subarray(i - n, i - n + a), r.wnext), (n -= a) ? (r.window.set(t.subarray(i - n, i), 0), r.wnext = n, r.whave = r.wsize) : (r.wnext += a, r.wnext === r.wsize && (r.wnext = 0), r.whave < r.wsize && (r.whave += a))), 0 }; var Y = { inflateReset: z, inflateReset2: F, inflateResetKeep: C, inflateInit: e => L(e, 15), inflateInit2: L, inflate: (e, i) => { let a, o, s, l, d, f, h, B, C, z, F, L, M, H, j, Y, G, X, W, q, J, Q, V = 0; const $ = new Uint8Array(4); let ee, te; const ie = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]); if (N(e) || !e.output || !e.input && 0 !== e.avail_in) return g; a = e.state, a.mode === A && (a.mode = Z), d = e.next_out, s = e.output, h = e.avail_out, l = e.next_in, o = e.input, f = e.avail_in, B = a.hold, C = a.bits, z = f, F = h, Q = m; e: for (; ;)switch (a.mode) { case E: if (0 === a.wrap) { a.mode = Z; break } for (; C < 16;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } if (2 & a.wrap && 35615 === B) { 0 === a.wbits && (a.wbits = 15), a.check = 0, $[0] = 255 & B, $[1] = B >>> 8 & 255, a.check = n(a.check, $, 2, 0), B = 0, C = 0, a.mode = 16181; break } if (a.head && (a.head.done = !1), !(1 & a.wrap) || (((255 & B) << 8) + (B >> 8)) % 31) { e.msg = "incorrect header check", a.mode = D; break } if ((15 & B) !== y) { e.msg = "unknown compression method", a.mode = D; break } if (B >>>= 4, C -= 4, J = 8 + (15 & B), 0 === a.wbits && (a.wbits = J), J > 15 || J > a.wbits) { e.msg = "invalid window size", a.mode = D; break } a.dmax = 1 << a.wbits, a.flags = 0, e.adler = a.check = 1, a.mode = 512 & B ? 16189 : A, B = 0, C = 0; break; case 16181: for (; C < 16;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } if (a.flags = B, (255 & a.flags) !== y) { e.msg = "unknown compression method", a.mode = D; break } if (57344 & a.flags) { e.msg = "unknown header flags set", a.mode = D; break } a.head && (a.head.text = B >> 8 & 1), 512 & a.flags && 4 & a.wrap && ($[0] = 255 & B, $[1] = B >>> 8 & 255, a.check = n(a.check, $, 2, 0)), B = 0, C = 0, a.mode = 16182; case 16182: for (; C < 32;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } a.head && (a.head.time = B), 512 & a.flags && 4 & a.wrap && ($[0] = 255 & B, $[1] = B >>> 8 & 255, $[2] = B >>> 16 & 255, $[3] = B >>> 24 & 255, a.check = n(a.check, $, 4, 0)), B = 0, C = 0, a.mode = 16183; case 16183: for (; C < 16;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } a.head && (a.head.xflags = 255 & B, a.head.os = B >> 8), 512 & a.flags && 4 & a.wrap && ($[0] = 255 & B, $[1] = B >>> 8 & 255, a.check = n(a.check, $, 2, 0)), B = 0, C = 0, a.mode = 16184; case 16184: if (1024 & a.flags) { for (; C < 16;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } a.length = B, a.head && (a.head.extra_len = B), 512 & a.flags && 4 & a.wrap && ($[0] = 255 & B, $[1] = B >>> 8 & 255, a.check = n(a.check, $, 2, 0)), B = 0, C = 0; } else a.head && (a.head.extra = null); a.mode = 16185; case 16185: if (1024 & a.flags && (L = a.length, L > f && (L = f), L && (a.head && (J = a.head.extra_len - a.length, a.head.extra || (a.head.extra = new Uint8Array(a.head.extra_len)), a.head.extra.set(o.subarray(l, l + L), J)), 512 & a.flags && 4 & a.wrap && (a.check = n(a.check, o, L, l)), f -= L, l += L, a.length -= L), a.length)) break e; a.length = 0, a.mode = 16186; case 16186: if (2048 & a.flags) { if (0 === f) break e; L = 0; do { J = o[l + L++], a.head && J && a.length < 65536 && (a.head.name += String.fromCharCode(J)); } while (J && L < f); if (512 & a.flags && 4 & a.wrap && (a.check = n(a.check, o, L, l)), f -= L, l += L, J) break e } else a.head && (a.head.name = null); a.length = 0, a.mode = 16187; case 16187: if (4096 & a.flags) { if (0 === f) break e; L = 0; do { J = o[l + L++], a.head && J && a.length < 65536 && (a.head.comment += String.fromCharCode(J)); } while (J && L < f); if (512 & a.flags && 4 & a.wrap && (a.check = n(a.check, o, L, l)), f -= L, l += L, J) break e } else a.head && (a.head.comment = null); a.mode = 16188; case 16188: if (512 & a.flags) { for (; C < 16;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } if (4 & a.wrap && B !== (65535 & a.check)) { e.msg = "header crc mismatch", a.mode = D; break } B = 0, C = 0; } a.head && (a.head.hcrc = a.flags >> 9 & 1, a.head.done = !0), e.adler = a.check = 0, a.mode = A; break; case 16189: for (; C < 32;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } e.adler = a.check = I(B), B = 0, C = 0, a.mode = R; case R: if (0 === a.havedict) return e.next_out = d, e.avail_out = h, e.next_in = l, e.avail_in = f, a.hold = B, a.bits = C, _; e.adler = a.check = 1, a.mode = A; case A: if (i === w || i === b) break e; case Z: if (a.last) { B >>>= 7 & C, C -= 7 & C, a.mode = U; break } for (; C < 3;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } switch (a.last = 1 & B, B >>>= 1, C -= 1, 3 & B) { case 0: a.mode = 16193; break; case 1: if (K(a), a.mode = T, i === b) { B >>>= 2, C -= 2; break e } break; case 2: a.mode = 16196; break; case 3: e.msg = "invalid block type", a.mode = D; }B >>>= 2, C -= 2; break; case 16193: for (B >>>= 7 & C, C -= 7 & C; C < 32;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } if ((65535 & B) != (B >>> 16 ^ 65535)) { e.msg = "invalid stored block lengths", a.mode = D; break } if (a.length = 65535 & B, B = 0, C = 0, a.mode = S, i === b) break e; case S: a.mode = 16195; case 16195: if (L = a.length, L) { if (L > f && (L = f), L > h && (L = h), 0 === L) break e; s.set(o.subarray(l, l + L), d), f -= L, l += L, h -= L, d += L, a.length -= L; break } a.mode = A; break; case 16196: for (; C < 14;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } if (a.nlen = 257 + (31 & B), B >>>= 5, C -= 5, a.ndist = 1 + (31 & B), B >>>= 5, C -= 5, a.ncode = 4 + (15 & B), B >>>= 4, C -= 4, a.nlen > 286 || a.ndist > 30) { e.msg = "too many length or distance symbols", a.mode = D; break } a.have = 0, a.mode = 16197; case 16197: for (; a.have < a.ncode;) { for (; C < 3;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } a.lens[ie[a.have++]] = 7 & B, B >>>= 3, C -= 3; } for (; a.have < 19;)a.lens[ie[a.have++]] = 0; if (a.lencode = a.lendyn, a.lenbits = 7, ee = { bits: a.lenbits }, Q = c(0, a.lens, 0, 19, a.lencode, 0, a.work, ee), a.lenbits = ee.bits, Q) { e.msg = "invalid code lengths set", a.mode = D; break } a.have = 0, a.mode = 16198; case 16198: for (; a.have < a.nlen + a.ndist;) { for (; V = a.lencode[B & (1 << a.lenbits) - 1], j = V >>> 24, Y = V >>> 16 & 255, G = 65535 & V, !(j <= C);) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } if (G < 16) B >>>= j, C -= j, a.lens[a.have++] = G; else { if (16 === G) { for (te = j + 2; C < te;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } if (B >>>= j, C -= j, 0 === a.have) { e.msg = "invalid bit length repeat", a.mode = D; break } J = a.lens[a.have - 1], L = 3 + (3 & B), B >>>= 2, C -= 2; } else if (17 === G) { for (te = j + 3; C < te;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } B >>>= j, C -= j, J = 0, L = 3 + (7 & B), B >>>= 3, C -= 3; } else { for (te = j + 7; C < te;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } B >>>= j, C -= j, J = 0, L = 11 + (127 & B), B >>>= 7, C -= 7; } if (a.have + L > a.nlen + a.ndist) { e.msg = "invalid bit length repeat", a.mode = D; break } for (; L--;)a.lens[a.have++] = J; } } if (a.mode === D) break; if (0 === a.lens[256]) { e.msg = "invalid code -- missing end-of-block", a.mode = D; break } if (a.lenbits = 9, ee = { bits: a.lenbits }, Q = c(1, a.lens, 0, a.nlen, a.lencode, 0, a.work, ee), a.lenbits = ee.bits, Q) { e.msg = "invalid literal/lengths set", a.mode = D; break } if (a.distbits = 6, a.distcode = a.distdyn, ee = { bits: a.distbits }, Q = c(2, a.lens, a.nlen, a.ndist, a.distcode, 0, a.work, ee), a.distbits = ee.bits, Q) { e.msg = "invalid distances set", a.mode = D; break } if (a.mode = T, i === b) break e; case T: a.mode = O; case O: if (f >= 6 && h >= 258) { e.next_out = d, e.avail_out = h, e.next_in = l, e.avail_in = f, a.hold = B, a.bits = C, r(e, F), d = e.next_out, s = e.output, h = e.avail_out, l = e.next_in, o = e.input, f = e.avail_in, B = a.hold, C = a.bits, a.mode === A && (a.back = -1); break } for (a.back = 0; V = a.lencode[B & (1 << a.lenbits) - 1], j = V >>> 24, Y = V >>> 16 & 255, G = 65535 & V, !(j <= C);) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } if (Y && 0 == (240 & Y)) { for (X = j, W = Y, q = G; V = a.lencode[q + ((B & (1 << X + W) - 1) >> X)], j = V >>> 24, Y = V >>> 16 & 255, G = 65535 & V, !(X + j <= C);) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } B >>>= X, C -= X, a.back += X; } if (B >>>= j, C -= j, a.back += j, a.length = G, 0 === Y) { a.mode = 16205; break } if (32 & Y) { a.back = -1, a.mode = A; break } if (64 & Y) { e.msg = "invalid literal/length code", a.mode = D; break } a.extra = 15 & Y, a.mode = 16201; case 16201: if (a.extra) { for (te = a.extra; C < te;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } a.length += B & (1 << a.extra) - 1, B >>>= a.extra, C -= a.extra, a.back += a.extra; } a.was = a.length, a.mode = 16202; case 16202: for (; V = a.distcode[B & (1 << a.distbits) - 1], j = V >>> 24, Y = V >>> 16 & 255, G = 65535 & V, !(j <= C);) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } if (0 == (240 & Y)) { for (X = j, W = Y, q = G; V = a.distcode[q + ((B & (1 << X + W) - 1) >> X)], j = V >>> 24, Y = V >>> 16 & 255, G = 65535 & V, !(X + j <= C);) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } B >>>= X, C -= X, a.back += X; } if (B >>>= j, C -= j, a.back += j, 64 & Y) { e.msg = "invalid distance code", a.mode = D; break } a.offset = G, a.extra = 15 & Y, a.mode = 16203; case 16203: if (a.extra) { for (te = a.extra; C < te;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } a.offset += B & (1 << a.extra) - 1, B >>>= a.extra, C -= a.extra, a.back += a.extra; } if (a.offset > a.dmax) { e.msg = "invalid distance too far back", a.mode = D; break } a.mode = 16204; case 16204: if (0 === h) break e; if (L = F - h, a.offset > L) { if (L = a.offset - L, L > a.whave && a.sane) { e.msg = "invalid distance too far back", a.mode = D; break } L > a.wnext ? (L -= a.wnext, M = a.wsize - L) : M = a.wnext - L, L > a.length && (L = a.length), H = a.window; } else H = s, M = d - a.offset, L = a.length; L > h && (L = h), h -= L, a.length -= L; do { s[d++] = H[M++]; } while (--L); 0 === a.length && (a.mode = O); break; case 16205: if (0 === h) break e; s[d++] = a.length, h--, a.mode = O; break; case U: if (a.wrap) { for (; C < 32;) { if (0 === f) break e; f--, B |= o[l++] << C, C += 8; } if (F -= h, e.total_out += F, a.total += F, 4 & a.wrap && F && (e.adler = a.check = a.flags ? n(a.check, s, F, d - F) : t(a.check, s, F, d - F)), F = h, 4 & a.wrap && (a.flags ? B : I(B)) !== a.check) { e.msg = "incorrect data check", a.mode = D; break } B = 0, C = 0; } a.mode = 16207; case 16207: if (a.wrap && a.flags) { for (; C < 32;) { if (0 === f) break e; f--, B += o[l++] << C, C += 8; } if (4 & a.wrap && B !== (4294967295 & a.total)) { e.msg = "incorrect length check", a.mode = D; break } B = 0, C = 0; } a.mode = 16208; case 16208: Q = k; break e; case D: Q = p; break e; case 16210: return v; default: return g }return e.next_out = d, e.avail_out = h, e.next_in = l, e.avail_in = f, a.hold = B, a.bits = C, (a.wsize || F !== e.avail_out && a.mode < D && (a.mode < U || i !== u)) && P(e, e.output, e.next_out, F - e.avail_out), z -= e.avail_in, F -= e.avail_out, e.total_in += z, e.total_out += F, a.total += F, 4 & a.wrap && F && (e.adler = a.check = a.flags ? n(a.check, s, F, e.next_out - F) : t(a.check, s, F, e.next_out - F)), e.data_type = a.bits + (a.last ? 64 : 0) + (a.mode === A ? 128 : 0) + (a.mode === T || a.mode === S ? 256 : 0), (0 === z && 0 === F || i === u) && Q === m && (Q = x), Q }, inflateEnd: e => { if (N(e)) return g; let t = e.state; return t.window && (t.window = null), e.state = null, m }, inflateGetHeader: (e, t) => { if (N(e)) return g; const i = e.state; return 0 == (2 & i.wrap) ? g : (i.head = t, t.done = !1, m) }, inflateSetDictionary: (e, i) => { const n = i.length; let a, r, o; return N(e) ? g : (a = e.state, 0 !== a.wrap && a.mode !== R ? g : a.mode === R && (r = 1, r = t(r, i, n, 0), r !== a.check) ? p : (o = P(e, i, n, n), o ? (a.mode = 16210, v) : (a.havedict = 1, m))) }, inflateInfo: "pako inflate (from Nodeca project)" }; const G = (e, t) => Object.prototype.hasOwnProperty.call(e, t); var X = function (e) { const t = Array.prototype.slice.call(arguments, 1); for (; t.length;) { const i = t.shift(); if (i) { if ("object" != typeof i) throw new TypeError(i + "must be non-object"); for (const t in i) G(i, t) && (e[t] = i[t]); } } return e }, W = e => { let t = 0; for (let i = 0, n = e.length; i < n; i++)t += e[i].length; const i = new Uint8Array(t); for (let t = 0, n = 0, a = e.length; t < a; t++) { let a = e[t]; i.set(a, n), n += a.length; } return i }; let q = !0; try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch (e) { q = !1; } const J = new Uint8Array(256); for (let e = 0; e < 256; e++)J[e] = e >= 252 ? 6 : e >= 248 ? 5 : e >= 240 ? 4 : e >= 224 ? 3 : e >= 192 ? 2 : 1; J[254] = J[254] = 1; var Q = e => { if ("function" == typeof TextEncoder && TextEncoder.prototype.encode) return (new TextEncoder).encode(e); let t, i, n, a, r, o = e.length, s = 0; for (a = 0; a < o; a++)i = e.charCodeAt(a), 55296 == (64512 & i) && a + 1 < o && (n = e.charCodeAt(a + 1), 56320 == (64512 & n) && (i = 65536 + (i - 55296 << 10) + (n - 56320), a++)), s += i < 128 ? 1 : i < 2048 ? 2 : i < 65536 ? 3 : 4; for (t = new Uint8Array(s), r = 0, a = 0; r < s; a++)i = e.charCodeAt(a), 55296 == (64512 & i) && a + 1 < o && (n = e.charCodeAt(a + 1), 56320 == (64512 & n) && (i = 65536 + (i - 55296 << 10) + (n - 56320), a++)), i < 128 ? t[r++] = i : i < 2048 ? (t[r++] = 192 | i >>> 6, t[r++] = 128 | 63 & i) : i < 65536 ? (t[r++] = 224 | i >>> 12, t[r++] = 128 | i >>> 6 & 63, t[r++] = 128 | 63 & i) : (t[r++] = 240 | i >>> 18, t[r++] = 128 | i >>> 12 & 63, t[r++] = 128 | i >>> 6 & 63, t[r++] = 128 | 63 & i); return t }, V = (e, t) => { const i = t || e.length; if ("function" == typeof TextDecoder && TextDecoder.prototype.decode) return (new TextDecoder).decode(e.subarray(0, t)); let n, a; const r = new Array(2 * i); for (a = 0, n = 0; n < i;) { let t = e[n++]; if (t < 128) { r[a++] = t; continue } let o = J[t]; if (o > 4) r[a++] = 65533, n += o - 1; else { for (t &= 2 === o ? 31 : 3 === o ? 15 : 7; o > 1 && n < i;)t = t << 6 | 63 & e[n++], o--; o > 1 ? r[a++] = 65533 : t < 65536 ? r[a++] = t : (t -= 65536, r[a++] = 55296 | t >> 10 & 1023, r[a++] = 56320 | 1023 & t); } } return ((e, t) => { if (t < 65534 && e.subarray && q) return String.fromCharCode.apply(null, e.length === t ? e : e.subarray(0, t)); let i = ""; for (let n = 0; n < t; n++)i += String.fromCharCode(e[n]); return i })(r, a) }, $ = (e, t) => { (t = t || e.length) > e.length && (t = e.length); let i = t - 1; for (; i >= 0 && 128 == (192 & e[i]);)i--; return i < 0 || 0 === i ? t : i + J[e[i]] > t ? i : t }, ee = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" }; var te = function () { this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0; }; var ie = function () { this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1; }; const ne = Object.prototype.toString, { Z_NO_FLUSH: ae, Z_FINISH: re, Z_OK: oe, Z_STREAM_END: se, Z_NEED_DICT: le, Z_STREAM_ERROR: de, Z_DATA_ERROR: fe, Z_MEM_ERROR: ce } = h; function he(e) { this.options = X({ chunkSize: 65536, windowBits: 15, to: "" }, e || {}); const t = this.options; t.raw && t.windowBits >= 0 && t.windowBits < 16 && (t.windowBits = -t.windowBits, 0 === t.windowBits && (t.windowBits = -15)), !(t.windowBits >= 0 && t.windowBits < 16) || e && e.windowBits || (t.windowBits += 32), t.windowBits > 15 && t.windowBits < 48 && 0 == (15 & t.windowBits) && (t.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new te, this.strm.avail_out = 0; let i = Y.inflateInit2(this.strm, t.windowBits); if (i !== oe) throw new Error(ee[i]); if (this.header = new ie, Y.inflateGetHeader(this.strm, this.header), t.dictionary && ("string" == typeof t.dictionary ? t.dictionary = Q(t.dictionary) : "[object ArrayBuffer]" === ne.call(t.dictionary) && (t.dictionary = new Uint8Array(t.dictionary)), t.raw && (i = Y.inflateSetDictionary(this.strm, t.dictionary), i !== oe))) throw new Error(ee[i]) } function ue(e, t) { const i = new he(t); if (i.push(e), i.err) throw i.msg || ee[i.err]; return i.result } he.prototype.push = function (e, t) { const i = this.strm, n = this.options.chunkSize, a = this.options.dictionary; let r, o, s; if (this.ended) return !1; for (o = t === ~~t ? t : !0 === t ? re : ae, "[object ArrayBuffer]" === ne.call(e) ? i.input = new Uint8Array(e) : i.input = e, i.next_in = 0, i.avail_in = i.input.length; ;) { for (0 === i.avail_out && (i.output = new Uint8Array(n), i.next_out = 0, i.avail_out = n), r = Y.inflate(i, o), r === le && a && (r = Y.inflateSetDictionary(i, a), r === oe ? r = Y.inflate(i, o) : r === fe && (r = le)); i.avail_in > 0 && r === se && i.state.wrap > 0 && 0 !== e[i.next_in];)Y.inflateReset(i), r = Y.inflate(i, o); switch (r) { case de: case fe: case le: case ce: return this.onEnd(r), this.ended = !0, !1 }if (s = i.avail_out, i.next_out && (0 === i.avail_out || r === se)) if ("string" === this.options.to) { let e = $(i.output, i.next_out), t = i.next_out - e, a = V(i.output, e); i.next_out = t, i.avail_out = n - t, t && i.output.set(i.output.subarray(e, e + t), 0), this.onData(a); } else this.onData(i.output.length === i.next_out ? i.output : i.output.subarray(0, i.next_out)); if (r !== oe || 0 !== s) { if (r === se) return r = Y.inflateEnd(this.strm), this.onEnd(r), this.ended = !0, !0; if (0 === i.avail_in) break } } return !0 }, he.prototype.onData = function (e) { this.chunks.push(e); }, he.prototype.onEnd = function (e) { e === oe && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = W(this.chunks)), this.chunks = [], this.err = e, this.msg = this.strm.msg; }; var we = he, be = ue, me = function (e, t) { return (t = t || {}).raw = !0, ue(e, t) }, ke = ue, _e = h, ge = { Inflate: we, inflate: be, inflateRaw: me, ungzip: ke, constants: _e }; e.Inflate = we, e.constants = _e, e.default = ge, e.inflate = be, e.inflateRaw = me, e.ungzip = ke, Object.defineProperty(e, "__esModule", { value: !0 }); }));
}(pako_inflate_min, pako_inflate_minExports));

const LITTLE_ENDIAN = true;
class DataReader {
    /** @param {ArrayBuffer} buffer */
    constructor(buffer) {
        this.dataView = new DataView(buffer);
        this.position = 0;
    }

    /** @param {number} length */
    skip(length) {
        this.position += length;
    }

    /** @param {number} length */
    readBytes(length) {
        const type = length === 4 ? 'getUint32' : length === 2 ? 'getUint16' : 'getUint8';
        const start = this.position;
        this.position += length;
        return this.dataView[type](start, LITTLE_ENDIAN);
    }
}

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY = 0x02014b50;
// const END_OF_CENTRAL_DIRECTORY = 0x06054b50;

const parseZip = buffer => {
    const reader = new DataReader(buffer);
    const files = {};
    while (true) {
        const signature = reader.readBytes(4);
        if (signature === LOCAL_FILE_HEADER) {
            const file = parseLocalFile(reader);
            files[file.name] = {
                buffer: file.buffer
            };
            continue;
        }
        if (signature === CENTRAL_DIRECTORY) {
            parseCentralDirectory(reader);
            continue;
        }
        break;
    }
    return files;
};

// # Local file header
//
// | Offset |  Length  | Contents                                 |
// | ------ | -------- | ---------------------------------------- |
// |   0    |  4 bytes | Local file header signature (0x04034b50) |
// |   4    |  2 bytes | Version needed to extract                |
// |   6    |  2 bytes | General purpose bit flag                 |
// |   8    |  2 bytes | Compression method                       |
// |  10    |  2 bytes | Last mod file time                       |
// |  12    |  2 bytes | Last mod file date                       |
// |  14    |  4 bytes | CRC-32                                   |
// |  18    |  4 bytes | Compressed size (n)                      |
// |  22    |  4 bytes | Uncompressed size                        |
// |  26    |  2 bytes | Filename length (f)                      |
// |  28    |  2 bytes | Extra field length (e)                   |
// |        | (f)bytes | Filename                                 |
// |        | (e)bytes | Extra field                              |
// |        | (n)bytes | Compressed data                          |
const parseLocalFile = reader => {
    let i = 0;
    let data;
    reader.skip(4);
    // const version          = reader.readBytes( 2 );
    // const bitFlag          = reader.readBytes( 2 );
    const compression = reader.readBytes(2);
    reader.skip(8);
    // const lastModTime      = reader.readBytes( 2 );
    // const lastModDate      = reader.readBytes( 2 );
    // const crc32            = reader.readBytes( 4 );
    const compressedSize = reader.readBytes(4);
    reader.skip(4);
    // const uncompressedSize = reader.readBytes( 4 );
    const filenameLength = reader.readBytes(2);
    const extraFieldLength = reader.readBytes(2);
    const filename = [];
    // const extraField     = [];
    const compressedData = new Uint8Array(compressedSize);
    for (i = 0; i < filenameLength; i++) {
        filename.push(String.fromCharCode(reader.readBytes(1)));
    }
    reader.skip(extraFieldLength);
    // for ( i = 0; i < extraFieldLength; i ++ ) {

    // 	extraField.push( reader.readBytes( 1 ) );

    // }

    for (i = 0; i < compressedSize; i++) {
        compressedData[i] = reader.readBytes(1);
    }
    switch (compression) {
        case 0:
            data = compressedData;
            break;
        case 8:
            data = new Uint8Array(pako_inflate_minExports.inflate(compressedData, {
                raw: true
            }));
            break;
        default:
            console.log(`${filename.join('')}: unsupported compression type`);
            data = compressedData;
    }
    return {
        name: filename.join(''),
        buffer: data
    };
};

// # Central directory
//
// | Offset |  Length  | Contents                                   |
// | ------ | -------- | ------------------------------------------ |
// |   0    |  4 bytes | Central file header signature (0x02014b50) |
// |   4    |  2 bytes | Version made by                            |
// |   6    |  2 bytes | Version needed to extract                  |
// |   8    |  2 bytes | General purpose bit flag                   |
// |  10    |  2 bytes | Compression method                         |
// |  12    |  2 bytes | Last mod file time                         |
// |  14    |  2 bytes | Last mod file date                         |
// |  16    |  4 bytes | CRC-32                                     |
// |  20    |  4 bytes | Compressed size                            |
// |  24    |  4 bytes | Uncompressed size                          |
// |  28    |  2 bytes | Filename length (f)                        |
// |  30    |  2 bytes | Extra field length (e)                     |
// |  32    |  2 bytes | File comment length (c)                    |
// |  34    |  2 bytes | Disk number start                          |
// |  36    |  2 bytes | Internal file attributes                   |
// |  38    |  4 bytes | External file attributes                   |
// |  42    |  4 bytes | Relative offset of local header            |
// |  46    | (f)bytes | Filename                                   |
// |        | (e)bytes | Extra field                                |
// |        | (c)bytes | File comment                               |
const parseCentralDirectory = reader => {
    // let i = 0;
    reader.skip(24);
    // const versionMadeby        = reader.readBytes( 2 );
    // const versionNeedToExtract = reader.readBytes( 2 );
    // const bitFlag              = reader.readBytes( 2 );
    // const compression          = reader.readBytes( 2 );
    // const lastModTime          = reader.readBytes( 2 );
    // const lastModDate          = reader.readBytes( 2 );
    // const crc32                = reader.readBytes( 4 );
    // const compressedSize       = reader.readBytes( 4 );
    // const uncompressedSize     = reader.readBytes( 4 );
    const filenameLength = reader.readBytes(2);
    const extraFieldLength = reader.readBytes(2);
    const fileCommentLength = reader.readBytes(2);
    reader.skip(12);
    // const diskNumberStart      = reader.readBytes( 2 );
    // const internalFileAttrs    = reader.readBytes( 2 );
    // const externalFileAttrs    = reader.readBytes( 4 );
    // const relativeOffset       = reader.readBytes( 4 );
    // const filename    = [];
    // const extraField  = [];
    // const fileComment = [];

    reader.skip(filenameLength);
    // for ( i = 0; i < filenameLength; i ++ ) {

    // 	filename.push( String.fromCharCode( reader.readBytes( 1 ) ) );

    // }

    reader.skip(extraFieldLength);
    // for ( i = 0; i < extraFieldLength; i ++ ) {

    // 	extraField.push( reader.readBytes( 1 ) );

    // }

    reader.skip(fileCommentLength);
    // for ( i = 0; i < fileCommentLength; i ++ ) {

    // 	fileComment.push( reader.readBytes( 1 ) );

    // }
};

/**
 * @class ZipLoader
 * @classdesc A class for loading and extracting files from a ZIP archive.
 */
const ZipLoader = class ZipLoader {
    /**
      * @function
      * @description Loads a zip archive from a File or Blob object and returns a Promise that resolves with a new ZipLoader instance
      * @param {Blob|File} blobOrFile - The Blob or File object to load
      * @returns {Promise<ZipLoader>}
      */
    static unzip(blobOrFile) {
        return new Promise(resolve => {
            const instance = new ZipLoader();
            const fileReader = new FileReader();
            fileReader.onload = event => {
                const arrayBuffer = event.target.result;
                instance.files = parseZip(arrayBuffer);
                resolve(instance);
            };
            if (blobOrFile instanceof Blob) {
                fileReader.readAsArrayBuffer(blobOrFile);
            }
        });
    }

    /**
     * @constructor
     * @param {string} url
     */
    constructor(url) {
        /** @private */
        this._listeners = {};

        /** @type {String|undefined} */
        this.url = url;

        /** @type {import('./types.ts').Files | null} */
        this.files = null;
    }

    /**
     * Loads the ZIP archive specified by the url property.
     * Returns a Promise that resolves when the ZIP archive has been loaded and extracted.
     *
     * @async
     * @returns {Promise<Files>} A Promise that resolves when the ZIP archive has been loaded and extracted.
     */
    load() {
        this.clear();
        return new Promise(resolve => {
            const startTime = Date.now();
            const xhr = new XMLHttpRequest();
            xhr.open('GET', this.url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onprogress = e => {
                this.dispatch({
                    type: 'progress',
                    loaded: e.loaded,
                    total: e.total,
                    elapsedTime: Date.now() - startTime
                });
            };
            xhr.onload = () => {
                this.files = parseZip(xhr.response);
                this.dispatch({
                    type: 'load',
                    elapsedTime: Date.now() - startTime
                });
                resolve(this.files);
            };
            xhr.onerror = event => {
                this.dispatch({
                    type: 'error',
                    error: event
                });
            };
            xhr.send();
        });
    }

    /**
     * Extracts a file from the loaded ZIP archive and returns it as a Blob URL.
     *
     * @param {string} filename - The name of the file to extract.
     * @param {string} type - The MIME type of the file.
     * @returns {string} The Blob URL of the extracted file.
     */
    extractAsBlobUrl(filename, type) {
        if (this.files[filename].url) {
            return this.files[filename].url;
        }
        const blob = new Blob([this.files[filename].buffer], {
            type: type
        });
        this.files[filename].url = URL.createObjectURL(blob);
        return this.files[filename].url;
    }

    /**
     * @param {string} filename
     * @returns {string|undefined}
     */
    extractAsText(filename) {
        const buffer = this.files[filename].buffer;
        if (typeof TextDecoder !== 'undefined') {
            return new TextDecoder().decode(buffer);
        }
        let str = '';
        for (let i = 0, l = buffer.length; i < l; i++) {
            str += String.fromCharCode(buffer[i]);
        }
        return decodeURIComponent(escape(str));
    }

    /**
     * @param {string} filename
     * @returns {*}
     */
    extractAsJSON(filename) {
        return JSON.parse(this.extractAsText(filename));
    }

    /**
     * Adds the specified event listener.
     * @param {string} type event name
     * @param {import('./types.ts').Listener} listener handler function
     */
    on(type, listener) {
        if (!this._listeners[type]) {
            this._listeners[type] = [];
        }
        if (this._listeners[type].indexOf(listener) === -1) {
            this._listeners[type].push(listener);
        }
    }

    /**
     * Removes the specified event listener
     * @param {string} type event name
     * @param {import('./types.ts').Listener} listener handler function
     */
    off(type, listener) {
        const listenerArray = this._listeners[type];
        if (!!listenerArray) {
            const index = listenerArray.indexOf(listener);
            if (index !== -1) {
                listenerArray.splice(index, 1);
            }
        }
    }
    dispatch(event) {
        const listenerArray = this._listeners[event.type];
        if (!!listenerArray) {
            event.target = this;
            const length = listenerArray.length;
            for (let i = 0; i < length; i++) {
                listenerArray[i].call(this, event);
            }
        }
    }

    /** @param {string=} filename */
    clear(filename) {
        if (!!filename) {
            URL.revokeObjectURL(this.files[filename].url);
            delete this.files[filename];
            return;
        }
        for (let key in this.files) {
            URL.revokeObjectURL(this.files[key].url);
        }
        this.files = null;
    }
};
