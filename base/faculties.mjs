/*
Copyright 2021 HolyCorn Software
This is used by the base platform, to manage faculties
It allows faculties to be added, and removed
It calls the Faculty object to start the particular faculty
*/

import { Faculty } from '../lib/libFaculty/faculty.mjs';

const faculties = Symbol()

const promiseTimeout = Symbol()

const promises = Symbol()

const initDoneResolve = Symbol()


export class BasePlatformFacultiesAPI {

    /**
     * 
     * @param {import('./platform.mjs').BasePlatform} base 
     */
    constructor(base) {
        this.base = base;

        /**@type {Faculty[]} */
        this.members = [] //An array containing all the individual faculties

        this[Symbol.iterator] = function* () {
            for (var member of this.members) {
                yield member
            }
        };

        this.events = new FacultiesEventAPI(this)


        this.initDone = new Promise((resolve) => {
            this[initDoneResolve] = resolve
        })

        /** @type {Promise[]} */
        this[promises] = []

    }

    async add(path) {
        //Start a faculty
        let faculty = new Faculty(path);
        const promise = faculty.start(this.base);


        // Let's postpone the initDone promise to resolve after the this faculty has initialized
        this[promises].push(faculty.initPromise)
        clearTimeout(this[promiseTimeout])
        await promise

        // Let's postpone to it when all other faculties (including this), are done completely initializing
        this[promiseTimeout] = setTimeout(() => {
            Promise.allSettled(this[promises]).then(() => {
                this[initDoneResolve]()
            })
        }, 500)

        faculty.descriptor.resolveVariables()

        this.members.push(faculty) //Include in the list of faculties

        //Then watch for events
        faculty.comm_interface.rpc.$rpc.events.addEventListener('$remote-event', (event) => {
            const { type, data } = event.detail
            EventTarget.prototype.dispatchEvent.call(
                this.events,
                new CustomEvent(type, { detail: data })
            )
        })
    }

    remove(process) {
        //To stop the faculty, and remove from the list of faculties
        this.members = this.members?.filter(x => x.process != process)
    }

    find(process) {
        return this.members?.filter(x => x.process == process)[0]
    }

    findByName(name) {
        return this.members.filter(x => x.descriptor.name == name)[0]
    }

    /**
     * 
     * @param {JSONRPC} json_rpc 
     * @returns 
     */
    findByJSONRPC(json_rpc) {
        return this.members?.filter(x => x.comm_interface.rpc == json_rpc)[0]
    }



}




class FacultiesEventAPI extends EventTarget {

    /**
     * 
     * @param {BasePlatformFacultiesAPI} facultiesAPI 
     */
    constructor(facultiesAPI) {
        super()
        this[faculties] = facultiesAPI
    }


    /**
     * 
     * @param {Event|CustomEvent} event 
     */
    dispatchEvent(event) {
        this[faculties].members.forEach(faculty => {
            faculty.comm_interface.rpc.$rpc.events.dispatchEvent(new CustomEvent(event.type, { detail: event.detail }))
        });
        super.dispatchEvent(event)
    }

}