/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (types), contains type definitions for the bundle-cache module
 */

import { Collection } from "mongodb"


global {
    namespace soul.http.bundlecache {

        interface URLInternalMap {
            [url: string]: {
                links: string[]
                version: VersionInfo
            }
        }
        interface VersionInfo {
            emperical: number
            grand: number
        }
        type RequestMapCollection = Collection<URLInternalMap>


        interface VersionReporterHooks {
            /**
             * This method will be called when the reporter wants to add a URL
             * to the list of URLs the server knows
             * @param url The url
             * @returns {void}
             */
            addURL: (url: string) => void

            /**
            * This method will be called when the reporter wants to remove a URL
            * from the server's watch
            * @param url The url to be removed
            * @returns {void}
            */
            removeURL: (url: string) => void

            /**
             * This method is called whenever the empirical version of URL changes
             * @param url The url
             * @returns {void}
             */
            updateVersion: (url: string) => void
        }
    }
}

