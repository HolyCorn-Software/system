/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (types), contains type definitions for the worker-world module
 */


import { Collection } from "mongodb"


global {
    namespace soul.util.workerworld {
        interface Params<T = {}, Ns = {}> {
            /**
             * This information must be passed in order of hierarchy.
             * The first stage, to tast stage.
             * 
             * At least two stages must be passed
             */
            stages: Stage<T, Ns>[]
            /** This is the function that executes a task */
            execute?: ExecuteFunction<T, Ns>
            /** This defines the maximum number of tasks to be executed concurrently */
            width?: number
        }
        interface Stage<T = {}, Ns = {}> {
            name: keyof Ns
            label: string
            collection: TaskCollection<T>
        }
        type Task<T = {}, Ns = {}> = T & {
            '@worker-world-task': {
                id: string
                processor: string
                stage: keyof Ns
                hibernation: number
                created: number
                expires: number
                dead: boolean
                retries: Retry[]
            }
        }
        interface Retry {
            time: number
            error: TaskResults['error']
        }
        type ExecuteFunction<T = {}, Ns = {}> = (input: Task<T, Ns>) => Promise<TaskResults<Ns>>

        /**
         * This object represents the outcomes of executing a task
         */
        interface TaskResults<Ns = {}> {
            /** Did the task fail ? */
            error: {
                /** The error message */
                message: string
                /** Is it impossible to retry */
                fatal: boolean

                stack: string
            }
            /**
             * Was the task simply ignored, so that we can get back to it later? The value of this field tells us
             * when to get back to the task
             * 
             */
            ignored: number

            /** Optionally, if we want to directly move this task to a given stage, we specify here */
            newStage: keyof Ns

            /** If this field is set to true, it'll just delete the task forever. */
            delete: boolean
        }

        type TaskCollection<T = {}> = Collection<Task<T, {}>>

        interface TaskGroupParams<T = {}> extends Params<T> {
            stageIndex: number

        }

        type Filter<T, Ns = {}> = import("mongodb").Filter<T> & {
            /** If this is set, the system would ignore the other collections, and just query the collections of the steps here listed. */
            $stages: (keyof Ns)[]
        }


        type LastItems<T> = T extends [any, ...infer Rest] ? Rest : T
    }
}