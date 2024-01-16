/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This script is part of the bundle-cache module (part of frontend-manager), and is responsible for doing the 
 * browser client-side work
*/

let pageCompleteValue;
function pageComplete() {
    const compute = () => {
        if ([...document.body.children].filter(x => (x.tagName !== 'SCRIPT') && x != loader.html).length > 0) {
            return pageCompleteValue = true
        }
    }
    return pageCompleteValue || compute()
}


async function init() {

    if (navigator.serviceWorker) {


        loader.load('sw')
        try {



            const control = new SWControllerServer()
            new SWLoaderServer(loader)


            let updated = false
            for (const reg of await navigator.serviceWorker.getRegistrations()) {
                updated = true
                await reg.update()
            }


            if (!updated) {
                await navigator.serviceWorker.register('/$/system/frontend-manager/bundle-cache/public/service-worker.mjs', {
                    scope: "/",
                });
            }

            control.sendUpdates()

            if (updated) {
                loadNormally()
            }
            // The service-worker will ask this page to continue loading normally
            //But, if it fails, we have a plan B
            setTimeout(() => loadNormally(), 500)

            control.scheduleForcedUpdate()

        } catch (e) {
            console.error(`Could not install service worker\n`, e)
            loadNormally()
        }
    } else {
        loader.load('page-content')
        loadNormally()
        const checker = () => {
            const children = [...document.body.children].filter(x => (x.tagName !== 'SCRIPT') && x != loader.html)
            if (children.length > 0) {
                const abort = new AbortController()
                Promise.race(
                    [
                        new Promise(resolve => {
                            window.addEventListener('transitionend', resolve, { signal: abort.signal, once: true })
                            window.addEventListener('animationend', resolve, { signal: abort.signal, once: true })
                        }),
                        new Promise(resolve => setTimeout(resolve, 3000))
                    ]
                ).then(() => {
                    loader.unload('page-content')
                    abort.abort()
                })
                return true;
            }
        }
        if (!checker()) {
            new MutationObserver(checker).observe(document.body, { childList: true })
        }

    }
}



class SWLoaderServer {

    /**
     * 
     * @param {LoadWidget} loader 
     */
    constructor(loader) {
        const channel = new BroadcastChannel('page-load')
        /** @type {LoadWidget} */
        channel.addEventListener('message', (event) => {
            if (event.data?.origin != window.location.href) {
                return;
            }
            if (event.data?.load) {
                if (!loader) {
                    loader = new LoadWidget()
                }
                if (pageComplete()) {
                    return;
                }
                loader.load(event.data.load)
            }
            if (event.data?.unload) {
                loader.unload(event.data.unload)
            }
        })
    }

}


const channel = Symbol()

class SWControllerServer {

    constructor() {
        this[channel] = new BroadcastChannel('serviceworker-control')

        this[channel].addEventListener('message', (event) => {
            switch (event.data?.type) {

                case 'continue': {
                    loadNormally()
                    break;
                }

                case 'reload': {
                    console.log(`About to reload origin `, event.data.origin)
                    if (window.location.href !== event.data.origin) {
                        return
                    }
                    try {
                        reloadConfirm.show()
                    } catch (e) {
                        console.log(`Error reloading...\n`, e)
                    }
                    break;
                }

                case 'getStorage': {
                    this.sendUpdates()
                    break;
                }

                case 'setStorage': {
                    const object = event.data?.data || {}
                    for (const key in object) {
                        localStorage.setItem(key, object[key])
                    }
                    break;
                }

                case 'setServerVersion': {
                    const version = event.data?.data;
                    const lastVersion = new Number(localStorage.getItem('serverVersion')).valueOf() || 0

                    if (version > lastVersion) {
                        localStorage.getItem('serverVersion', version)
                        window.dispatchEvent(
                            new CustomEvent('server-version-change', { detail: version })
                        )
                        localStorage.setItem('serverVersion', version)
                    }
                    break;
                }
            }
        })
    }

    async scheduleForcedUpdate() {
        // Put a task in the background, to forcefully get the latest version of the page
        setTimeout(() => {
            this[channel].postMessage(
                {
                    type: 'forcedUpdate',
                    origin: window.location.href.replace(window.location.hash, "").replace(window.location.search, '')
                }
            );

            // And then subsequently, check for updates every 10mins.
            setTimeout(() => this.scheduleForcedUpdate(), 10 * 60_000)
        }, 75_0) // 1min, 15s, after page load, we ask the service worker to forcefully check if there's an update
    }

    async sendUpdates() {

        clearTimeout(this[sendUpdatesTimeout])
        this[sendUpdatesTimeout] = setTimeout(() => {
            const object = {}
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                object[key] = localStorage.getItem(key)
            }
            this[channel].postMessage({ type: 'setStorage', data: object })
        }, 250)
    }
}

const sendUpdatesTimeout = Symbol()
const items = Symbol()


class LoadWidget {

    constructor() {
        this.html = document.createElement('div')
        this.html.classList.add('hc-sw-spinner')
        this.html.innerHTML = `
            <div class='container'>
                
            </div>
            <div class='logo'>
                <img src='/$/shared/static/logo.png'>
            </div>
        `;

        for (let i = 0; i < 7; i++) {
            const unit = document.createElement('div')
            unit.classList.add('unit')
            unit.style.setProperty(`animation-delay`, `${i * 0.15}s`)
            this.html.querySelector('.container').appendChild(unit)
        }

        const style = document.createElement('style')
        style.innerHTML = `
            /*
            Copyright 2023 HolyCorn Software
            This stylesheet allows us to display a loading page when the servie worker is
            loading a page

            */

            body.hidden >*:not(.hc-sw-spinner){
                opacity:0;
            }
            body.showing >*:not(.hc-sw-spinner){
                opacity:1;
            }

            .hc-sw-spinner {
                width: calc(100vw + 16px);
                height: calc(100vh + 16px);
                z-index: 2000;
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


            .hc-sw-spinner.removing {
                opacity:0;
                transition:0.75s 0.125s;
            }

            @keyframes spin {
                0% {
                    transform: rotate(0deg);
                }

                100% {
                    transform: rotate(355deg);
                }
            }
        `

        document.head.appendChild(
            style
        )

        const meta = document.createElement('meta')
        meta.setAttribute('name', 'viewport')
        meta.setAttribute('content', 'width=device-width,initial-scale=1.0,user-scalable=no')
        document.head.appendChild(
            meta
        )
        this[items] = []
    }
    static hideBody() {

        document.body.classList.add('hidden')

    }

    static showBody() {
        if (document.body.classList.contains('hidden')) {
            document.body.classList.remove('hidden')
            document.body.classList.add('showing')
            setTimeout(() => document.body.classList.remove('showing'), 5_000)
        }
    }

    load(name) {
        this[items].push(name)
        if (!this.html.isConnected) {
            document.body.prepend(this.html)
        }
    }
    unload(name) {

        this[items] = this[items].filter(x => x !== name)

        if (this[items].length > 0) {
            return;
        }

        if (this.unloading || !this.html.isConnected) {
            return;
        }

        // In case all reasons to keep the page loading are removed, then it's time to remove the loader
        this.unloading = true
        LoadWidget.hideBody()
        new Promise(done => {
            const interval = setInterval(() => {
                if (pageComplete()) {
                    clearInterval(interval)
                    done()
                }
            }, 20)
        }).then(() => Promise.race(
            [
                new Promise(resolve => {
                    window.addEventListener('transitionend', resolve, { once: true, passive: true })
                    window.addEventListener('animationend', resolve, { once: true, passive: true })
                }),
                new Promise(x => setTimeout(x, 500))
            ]
        ).then(() => {
            LoadWidget.showBody()
            this.html.classList.add('removing')
            setTimeout(() => {
                this.html.remove()
                this.html.classList.remove('removing')
            }, 500)
        }).finally(() => this.unloading = false))

    }

}

const loader = new LoadWidget()

let hasLoaded = false
async function loadNormally() {
    if (hasLoaded) {
        return;
    }
    loader.unload('sw')
    hasLoaded = true
    document.querySelectorAll('script').forEach(script => {
        const srd = script.getAttribute('srd')
        if (srd) {
            script.setAttribute('src', srd)
            script.removeAttribute('srd')
        }
    })
}



class ReloadConfirmWidget {

    constructor() {
        this.html = document.createElement('div')
        this.html.classList.add('hc-sw-reload-confirm')
        this.html.innerHTML = `
            <div class='container'>
                <div class='top'>
                    <div class='message'>Some things have changed. Please reload to enjoy the update.</div>
                </div>
                <div class='actions'>
                    <div class='reload action'>Reload</div>
                    <div class='ignore action'>Ignore</div>
                </div>
            </div>

            <style>
                .hc-sw-reload-confirm{
                    position: fixed;
                    z-index: 5;
                    top: calc(100vh - var(--height));
                    left: 2.5em;
                    --height: 8em;
                }

                .hc-sw-reload-confirm >.container{
                    display: inline-flex;
                    flex-direction: column;
                    max-width: 200px;
                    background-color: #e9881d;
                    color: black;
                    box-shadow: 0px 0px 12px lightblue;
                    gap: 1em;
                    font-family: k2dThin;
                    padding: 1em;
                }

                .hc-sw-reload-confirm >.container >.actions{
                    display: flex;
                    justify-content: space-between;
                    gap: 1em;
                    color: white;
                    font-family: comfortaa;
                    font-weight: bolder;
                }

                .hc-sw-reload-confirm >.container >.actions >.action{
                    cursor: pointer;
                }

                /** Now, for the logic of showing, and hiding */
                .hc-sw-reload-confirm >.container{
                    transform: translateY(10em);
                    transition: 0.5s 0.125s !important;
                }
                .hc-sw-reload-confirm.showing >.container{
                    transform: translateY(0em);
                }
            </style>
        `

        this.html.querySelector('.container >.actions >.ignore').addEventListener('click', () => {
            this.hide()
        })

        this.html.querySelector('.container >.actions >.reload').addEventListener('click', () => {
            window.location.reload()
        })
    }

    show() {
        if (Date.now() - (this.lastDismiss || 0) < 20_000) {
            // If the user refused to reload less than 20s ago, no need to bother him again.
            return;
        }
        document.body.appendChild(this.html)
        setTimeout(() => this.html.classList.add('showing'), 250)
    }
    async hide() {
        this.lastDismiss = Date.now()
        this.html.classList.remove('showing')
        await new Promise(x => setTimeout(x, 100))
        await Promise.race(
            [
                new Promise((x) => this.html.addEventListener('transitionend', x)),
                new Promise(x => setTimeout(x, 2000))
            ]
        );
        this.html.remove()
    }
}

const reloadConfirm = new ReloadConfirmWidget()




init()