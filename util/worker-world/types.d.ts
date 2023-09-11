/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (types), contains type definitions for the worker-world module
 */


import { Collection } from "mongodb"


global {
    namespace soul.util.workerworld {
        interface Params<T = {}> {
            /**
             * This information must be passed in order of hierarchy.
             * The first stage, to tast stage.
             * 
             * At least two stages must be passed
             */
            stages: Stage<T>[]
            /** This is the function that executes a task */
            execute: ExecuteFunction<T>
            /** This defines the maximum number of tasks to be executed concurrently */
            width: number
        }
        interface Stage<T = {}> {
            name: string
            label: string
            collection: TaskCollection<T>
        }
        interface Task<T = {}> {
            id: string
            data: T
            stage: string
            hibernation: number
            created: number
            expires: number
            dead: boolean
        }
        type ExecuteFunction<T = {}> = (input: Task<T>) => Promise<TaskResults>

        /**
         * This object represents the outcomes of executing a task
         */
        interface TaskResults {
            /** Did the task fail ? */
            error: {
                /** The error message */
                message: string
                /** Is it impossible to retry */
                fatal: boolean
            }
            /**
             * Was the task simply ignored, so that we can get back to it later? The value of this field tells us
             * when to get back to the task
             * 
             */
            ignored: number

            /** Optionally, if we want to directly move this task to a given stage, we specify here */
            newStage: string
        }

        type TaskCollection<T = {}> = Collection<Task<T>>

        interface TaskGroupParams<T = {}> extends Params<T> {
            stageIndex: number

        }
    }
}