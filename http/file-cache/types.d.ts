/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module contains type definitions for the file-cache module
 */

import { Collection } from "mongodb";
import chokidar from 'chokidar'


global {
    namespace soul.http.filecache {

        type ObjectTable = {
            [path: string]: {
                accessed: number
                created: number
                size: number
                data: Buffer
                score: number
            }
        }

        interface CacheState extends Options {
            items: ObjectTable
            size: number
            count: number
        }

        interface Options {
            max_size: number
            watcher: chokidar.FSWatcher
        }

    }
}