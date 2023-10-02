/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (types), contains type definitions for the frontend-manager module
 */

import { Collection } from "mongodb"


global {
    namespace soul.http.frontendManager.fileManager {

        interface VersionInfoEntry {
            links: string[]
            version: VersionInfo
            size: number
            path: string
        }

        interface VersionInfoMap {
            [url: string]: VersionInfoEntry
        }
        interface VersionInfo {
            emperical: number
            grand: number
        }
        type VersionInfoCollection = Collection<VersionInfoMap>


        interface VersionReporterHooks {
            /**
             * This method will be called when the reporter wants to add a URL
             * to the list of URLs the server knows
             * @param url The url
             * @returns {void}
             */
            addURL: (url: string, path: string, size: string) => void

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
            updateVersion: (url: string, path: string, size: string) => void
        }

        /**
         * This represents a single configuration file that a developer could put in a frontend path, alter the way files are treated.
         */
        interface FrontendConfig {
            autorun: string[]
            htmlRegistry: {
                [tag: string]: string
            }
            run: {
                [scope: string]: string[]
            }
        }
    }
}

