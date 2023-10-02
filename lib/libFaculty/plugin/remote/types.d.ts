/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module contains type definitions, that are important to allowing plugins provide remote methods
 */


import ''

global {
    namespace faculty.plugin {
        interface plugins {
            /** At the level of the faculty */
            exampleNamespace: ExampleNamespace
        }

        interface ExampleNamespace {
            /** At the level of the plugin */
            examplePlugin: {
                remote: {
                    public: ExamplePluginPublicMethods
                }
            }
        }

        interface ExamplePluginPublicMethods {
            hello: () => Promise<string>
        }

        declare var PluginsPublicRemoteInterface: {
            new(): {
                [Namespace in keyof faculty.plugin.plugins]: {
                    [Plugin in keyof faculty.plugin.plugins[Namespace]]: faculty.plugin.plugins[Namespace][Plugin]['remote']['public']
                }
            }
        }

    }
}