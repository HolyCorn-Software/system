/*
Copyright 2021 HolyCorn Software
This module contains useful functions for creating and utilizing faculties
This is the representation of a faculty to the base platform
That is... a model of a faculty that is still to be started and executed

*/



import libPath from 'path'
import { fileURLToPath } from 'url'
import { BasePlatform } from '../../base/platform.mjs'
import { FacultyDescriptor } from './faculty-descriptor.mjs'
import libUrl from 'node:url'
import { FacultyBaseCommInterface } from '../../comm/interface/process-interface.mjs'
import worker from 'node:worker_threads'



export class Faculty {
    constructor(path) {

        //The descriptor does the work of verifying the faculty.json file, as well as parsing it
        this.descriptor = new FacultyDescriptor(path);
        this.flags = {
            networkEnabled: false,
            active: false
        }
    }



    /**
     * 
     * @param {BasePlatform} base_platform 
     */
    async start(base_platform) {


        //If already started before, then we can't continue
        if (this.running) return console.trace(`Attempting to start a faculty twice`)

        const nurseryPath = libPath.resolve(libPath.dirname(fileURLToPath(import.meta.url)), './nursery.mjs')


        this.channel = new worker.Worker(libUrl.pathToFileURL(nurseryPath), {
            name: nurseryPath,
            workerData: {
                /** @type {import('./faculty.global').SoulArgs} */
                soulArgs: {
                    descriptor: JSON.parse(JSON.stringify(this.descriptor)),
                    server_domains: BasePlatform.get().server_domains,
                    columns: process.stdout.columns
                },
            }
        })

        this.comm_interface = new FacultyBaseCommInterface(base_platform, this)


        Reflect.defineProperty(this, 'running', { get: () => true }) //To prevent this script for being started even a second time

    }


}


