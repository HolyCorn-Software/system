/**
 * Copyright 2024 HolyCorn Software
 * The soul system
 * This module contains type definitions for the secure-db-query module
 */


import { Collection, Filter, UpdateFilter } from "mongodb"


global {
    namespace soul.util.secure_db_query {

        type Search<Input> = Filter<Input>

        type Update<Input> = UpdateFilter<Input>

        interface Options<Input = {}> {
            fields: {
                update: (keyof Input)[]
                search: (keyof Input)[]
            }
            /** If set to true, the user won't be allowed to update at all. */
            disableUpdate?: boolean
            /** If set to true, the user won't be delete documents. */
            disableDelete?: boolean
            /** 
             * This field tells us where to permit the use of wildcard search queries, which are normally discouraged
             * 
            */
            allowWildcardSearch?: {
                all?: boolean
                update?: boolean
                create?: boolean
                read?: boolean
                delete?: boolean
            }

            /** 
             * This method is called when the module wants to verify a user's input, before updating the database.
             * Feel free to modify the fields of data object directly, so that the final outcome would be used for the stated intent 
            */
            dataCheck?: (arg: { data: Input, intent: "create" | "update" }) => Promise<void>
            /**
             * It is highly recommended to define this method.
             * 
             * This method would be called, in order to make final touches to any query supplied by the user, before it is ran.
             * 
             * Directly make changes to the input.
             */
            transformQuery?: (input: TransformQueryInput<Input>) => Promise<void>

            collection: Collection<Input>
        }

        /**
         * CAUTION!
         * 
         * Only one of these parameters is passed at a time.
         */
        type TransformQueryInput<Input> = {
            search?: Search<Input>
            update?: Update<Input> | Input
            intent: Intent
        }

        type Intent = 'create' | 'read' | 'update' | 'delete'
    }
}