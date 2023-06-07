/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This script is part of the bundle-cache module, and is responsible for doing the 
 * browser client-side work
*/


async function init() {

    if (navigator.serviceWorker) {

        const loader = new LoadWidget()

        try {



            loader.load()
            const control = new SWControllerServer()
            new SWLoaderServer(loader)


            let updated = false
            for (const reg of await navigator.serviceWorker.getRegistrations()) {
                updated = true
                await reg.update()
            }


            if (!updated) {
                await navigator.serviceWorker.register('/$bundle_cache/public/service-worker.mjs', {
                    scope: "/",
                });
                setTimeout(() => loadNormally(), 5000) //In case the service-worker signal fails to reach
            } else {
                loadNormally()
            }

            control.sendUpdates()

        } catch (e) {
            console.error(`Could not install service worker\n`, e)
        }
        loader.unload()
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
            }
        })
    }

    async sendUpdates() {

        const object = {}
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            object[key] = localStorage.getItem(key)
        }
        this[channel].postMessage({ type: 'setStorage', data: object })
    }
}

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
                transition:0s;
                opacity:0;
                transition:0s;
            }
            body.showing >*:not(.hc-sw-spinner){
                opacity:1;
                transition:1s;
            }

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
            setTimeout(() => document.body.classList.remove('showing'), 15_000)
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

        if (this.onloading || !this.html.isConnected) {
            return;
        }
        this.onloading = true
        LoadWidget.hideBody()
        Promise.race(
            [
                new Promise(resolve => {
                    window.addEventListener('transitionend', resolve, { once: true, passive: true })
                    window.addEventListener('animationend', resolve, { once: true, passive: true })
                }),
                new Promise(x => setTimeout(x, 1500))
            ]
        ).then(() => {
            LoadWidget.showBody()
            this.html.remove()
        }).finally(() => this.onloading = false)

    }

}

let hasLoaded = false
async function loadNormally() {
    if (hasLoaded) {
        window.location.reload()
    }
    hasLoaded = true
    // The service worker cache
    document.querySelectorAll('script').forEach(script => {
        const srd = script.getAttribute('srd')
        if (srd) {
            script.setAttribute('src', srd)
            script.removeAttribute('srd')
        }
    })
}
init()