/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module contains type definitions for it's parent module (collection-proxy)
 */

import { Collection } from "mongodb"


declare global {


    type ToCollection<MAP> = {
        [K in keyof MAP]: MAP[K] extends object ? MAP[K] : Collection
    }
}


export type CollectionProxyValues = { [key: string]: string | CollectionProxyValues }

export type CollectionProxyInputMap = {
    [key: string]: string
};
