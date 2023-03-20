/**
 * Copyright 2023 HolyCorn Software
 * The Soul System
 * This module (types), is part of the settings module, which allows faculties to have managed settings.
 * This module contains type definitions to facilitate that process
 */

import { Collection } from "mongodb"
import { MultiFlexFormFieldData } from "/$/system/static/html-hc/widgets/multi-flex-form/types"


global {
    namespace faculty.managedsettings {

        type InputDetails = Omit<MultiFlexFormFieldData, "value">

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

        class SettingDescriptorsCollection extends Collection<SettingDescriptor>{ }

        class SettingValuesCollection extends Collection<SettingValue>{ }
    }
}