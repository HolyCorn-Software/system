/**
 * Copyright 2023 HolyCorn Software
 * The soul system.
 * This module (auto-run), is part of the frontend-manager, and brings about the possibility of having scripts automatically injected into every page.
 */

import { BasePlatform } from "../../../../platform.mjs"
import DelayedAction from "../../../../../public/html-hc/lib/util/delayed-action/action.mjs"
import libPath from 'node:path'


const injectionData = Symbol()


export default class AutoRunManager {

    constructor() {


    }
    get fileManager() {
        return BasePlatform.get().frontendManager.fileManager
    }

    updateInjection = new DelayedAction(() => {

        /** @type {string[]} */
        const autorun = []
        for (const entry in this.fileManager.frontendConfig) {
            autorun.push(...((this.fileManager.frontendConfig[entry].autorun || []).map(x => libPath.resolve(entry, '../', x))))
        }

        // Using 'srd', instead of 'src', because, bundle-cache is going to automatically change it into 'src', in its own timing.
        this[injectionData] = autorun.map(x => `<script type='module' srd='${x}'></script>`).join('\n')

    }, 500, 2000);


    setup() {
        this.fileManager.events.addEventListener('config-change', () => this.updateInjection())

        this.updateInjection()

        BasePlatform.get().http_manager.platform_http.addMiddleWare(
            {
                callback: (req, res) => {

                    let intercepted;

                    const origWrite = res.write


                    res.write = (...args) => {

                        // Making sure we intercept only the first call to write()
                        if (intercepted) {
                            // If this is not the first write call,
                            // let's make all javascript inactive, so that the service
                            // worker can make it active

                            origWrite.call(
                                res,
                                ...args
                            )
                            return;
                        }

                        intercepted = true


                        // If this is the first write call, let's inject the 
                        // service worker script

                        const intercept = /html/gi.test(res.getHeader('content-type'))

                        if (intercept) {
                            res.setHeader(
                                'Content-Length',
                                `${new Number(res.getHeader('content-length')) + this[injectionData].length}`
                            )
                            res.write(this[injectionData])

                            res.write(...args)

                        } else {
                            res.write(...args)
                        }


                    }
                }
            }
        )

    }

}