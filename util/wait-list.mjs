/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This utility provides the ability to delay a given task, untill a list of other tasks have been 
 * completed
 */


const tasks = Symbol()

const createPromise = Symbol()

const promise = Symbol()

const resolvePromise = Symbol()

const virgin = Symbol()



export default class WaitList {

    constructor() {

        /** @type {string[]} */
        this[tasks] = []

        this[createPromise]()

        this[virgin] = true

    }

    /**
     * This method adds a task to the wait list
     * @param {string} task 
     * 
     */
    add(task) {
        this[virgin] = false
        this[tasks].push(task)
    }

    /**
     * This method removes a task from the list, effectively saying, it is finished
     * @param {string} task 
     */
    remove(task) {
        this[tasks] = this[tasks].filter(x => x !== task)
        if (this[tasks].length === 0) {
            this[resolvePromise]()
        }
    }
    /**
     * This method waits till the tasks in the list have been completed
     */
    wait() {
        return this[tasks].length > 0 ? this[promise] : Promise.resolve()
    }
    /**
     * This method waits till the tasks in the list are complete.
     * If there have never been tasks in the list, it waits till a task is added.
     */
    zeroWait() {
        return !this[virgin] && this[tasks].length === 0 ? Promise.resolve() : this[promise]
    }

    [createPromise]() {
        (this[promise] = new Promise((resolve) => {
            this[resolvePromise] = resolve
        })).then(() => {
            this[createPromise]()
        })
    }

    entries() {
        return [...this[tasks]]
    }

}