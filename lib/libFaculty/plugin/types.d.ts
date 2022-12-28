/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module (types) contains type definitions useful for allowing faculties support plugins
 */

import { Collection } from "mongodb"
import PluginModelModel from "./model.mjs";
import _PluginModelModel from "./model.mjs"
import { MultiFlexFormDefinitionData } from "/$/system/static/html-hc/widgets/multi-flex-form/types";

interface PluginSupportDefinition {
    plugins: {

        [namespace: string]: {
            model: string
            test: {
                module: ModuleTest
                files: DirectoryDefinition
            }
        }

    }

}

type TypeofType = ("string" | "number" | "bigint" | "boolean" | "symbol" | "object" | "function")

type GeneralObjectTest = {
    [key: string]: TypeofType & {
        [key: string]: GeneralObjectTest & TypeofType

    }
}

type ModuleTest = GeneralObjectTest


interface PluginDescriptor {
    label: string
    name: string
    version: {
        code: number
        label: string
    }
    faculty: string
    namespace: string
    credentials: PluginCredentialsDescriptor
    node_modules: string[]

}

interface PluginCredentialsDescriptor {
    form: MultiFlexFormDefinitionData
    validation: GeneralObjectTest
}


interface PluginCollections {
    settings: PluginSettingsCollection
    parameters: PluginParametersCollection
}

type PluginSettingsCollection = Collection<PluginSetting>

interface PluginSetting {
    plugin: string
    enabled: boolean
}

type PluginParametersCollection = Collection<PluginParameters>


interface PluginParameters {
    plugin: string
    parameters: object
}


interface PluginPreLoadResult {
    descriptor: PluginDescriptor
    error: Error
    path: string
    state: ("active" | "stopped" | "crashed")
    enabled: boolean
}

interface PluginLoadResult extends PluginPreLoadResult {
    instance: PluginModelModel
}


declare global {
    const PluginModelModel = _PluginModelModel
}

type PluginStatus = Pick<PluginLoadResult, "state" | "descriptor" | "enabled"> & {
    error: string
}

type PluginMap = { [plugin: string]: PluginLoadResult }


type PluginNamespaceMap<PluginType extends PluginModelModel> = { [namespace: string]: PluginType[] }


type ArrayUnpacked<T> = T extends Array<infer X> ? X : T extends Array<Array<infer DX>> ? ArrayUnpacked<DX> : T

type ObjectArrayMap<T> = T[keyof T]

type NamespaceInterfaces<T> = {
    [K in keyof T]: NamespaceInterfaceType<ArrayUnpacked<T[K]>>
}


type NamespaceInterfaceType<PluginModelType extends PluginModelModel> = Array<PluginModelType> & {
    callback: NamespaceCallbackType<PluginModelType>
}



type CollectivePluginFunction<FUNCTION, PluginModelType extends PluginModelModel> = function(ArrayUnpacked<Parameters<FUNCTION>>): Promise<
    {
        success: Array<
            {
                value: Awaited<ReturnType<FUNCTION>>;
                plugin: PluginModelType;
            }
        >

        failure: Array<
            {
                plugin: PluginModelType;
                error: Error;
            }
        >
    }
>

type NamespaceCallbackType<PluginModelType> = {
    [K in keyof PluginModelType]: CollectivePluginFunction<PluginModelType[K], PluginModelType>

}