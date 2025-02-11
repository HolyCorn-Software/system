/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module (types) contains type definitions useful for allowing faculties support plugins
 */

import { Collection } from "mongodb"
import PluginModelModel from "./model.mjs";
import _PluginModelModel from "./model.mjs"


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
    form: htmlhc.widget.multiflexform.MultiFlexFormDefinitionData
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

interface PluginLoadResult<PluginModelType extends PluginModelModel = PluginModelModel> extends PluginPreLoadResult {
    instance: PluginModelType
}

type PluginLoadResultMap<PluginNamespaceMap> = { [plugin: string]: PluginLoadResult<PluginNamespaceMap[keyof PluginNamespaceMap]> }


declare global {
    const PluginModelModel = _PluginModelModel
}

type PluginStatus = Pick<PluginLoadResult, "state" | "descriptor" | "enabled"> & {
    error: string
}


type ArrayUnpacked<T> = T extends Array<infer X> ? X : T extends Array<Array<infer DX>> ? ArrayUnpacked<DX> : T


type DefaultNamespaceMap = {
    [key: string]: PluginModelModel<{}>
}
type AllPlugins<M> = (M[keyof M])[]


type NamespaceInterfaces<T> = {
    [K in keyof T]: NamespaceInterfaceType<ArrayUnpacked<T[K]>>
}


type NamespaceInterfaceType<PluginModelType extends PluginModelModel> = Array<PluginLoadResult<PluginModelType>> & {
    callback: NamespaceCallbackType<PluginModelType>
    findByName: (name: string) => PluginModelType
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