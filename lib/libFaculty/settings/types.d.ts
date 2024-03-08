/**
 * Copyright 2023 HolyCorn Software
 * The Soul System
 * This module (types), is part of the settings module, which allows faculties to have managed settings.
 * This module contains type definitions to facilitate that process
 */

import { Collection } from "mongodb"

global {
    namespace faculty.managedsettings {

        type InputDetails = Omit<htmlhc.widget.multiflexform.MultiFlexFormFieldData, "value">

        /**
         * This type defines the data that faculties need to pass in when defining
         *  the settings that will be automatically managed by the faculty.
         * 
         * It is a key-map, with the keys referring to namespaces, and values pointing to 
         * data about the namespace
         */
        type SettingsDefinition = {
            [namespace: string]: SettingNamespace
        }

        interface SettingDescriptor {
            /** This is a unique name for this setting in this namespace */
            name: string
            /** This is a human-friendly name for the setting */
            label: string
            /** This is a text field that describes the setting to the engineer */
            description: string
            /** A URL path to an icon, that will be used to represent this setting */
            icon: string
            /** This field defines how data for this setting is collected. Is it a number, string, enum, etc.. */
            input: InputDetails
            /** This field determines if the setting will be accessible from the public web. */
            public: boolean
        }

        interface SettingNamespace {
            /** A human-friendly name for this namespace of settings */
            label: string
            /** A URL path to the icon used to represent this namespace on UIs */
            icon: string
            /** This field determines if clients can access this setting namespace from the front end */
            public: boolean
            /** This array deals with the various settings in the namespace */
            items: SettingDescriptor[]
            /** This field holds a text that is meant to describe the use, and items of the given namespace */
            description: string
        }

        /**
         * This refers to data about a setting stored in the db
         */
        interface SettingValue<T = {}> {
            namespace: string
            name: string
            value: T
        }

        type SettingDescriptorsCollection = Collection<SettingDescriptor>

        type SettingValuesCollection = Collection<SettingValue>

        interface all {
            exampleSetting: {
                faculty: 'web'
                namespace: 'widgets'
                data: { name: string, id: string }[]
            }
            example2Setting: {
                faculty: 'engTerminal'
                namespace: 'default'
                data: {
                    currency: string
                    value: number
                }
            }

        }

        type FilterByFacultyAndName<Faculty, Name extends keyof all> = {
            [K in keyof all[Name]]: all[Name]['faculty'] extends Faculty ? all[Name][K] : never
        }['data']

        type SettingsUpdateType<FacultyNameEnum extends keyof faculty.faculties, Setting, Namespace> = GetKeys<{
            [K in keyof all]: K extends Setting ? (
                all[K]['faculty'] extends FacultyNameEnum ? {
                    name: K
                    namespace: Namespace
                    value: all[K]['data']
                } : never
            ) : never
        },>

        type Namespaces<FacultyName> = GetKeys<{
            [K in keyof all]: all[K]['faculty'] extends FacultyName ? all[K]['namespace'] : never
        }>

        type Names<FacultyName, Namespace = any> = GetKeys<{
            [K in keyof all]: all[K]['faculty'] extends FacultyName ? all[K]['namespace'] extends Namespace ? K : never : never
        }>

        type GetKeys<T, K = keyof T> = T[K]
    }
}