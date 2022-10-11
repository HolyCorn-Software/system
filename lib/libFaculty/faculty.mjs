/*
Copyright 2021 HolyCorn Software
This module contains useful functions for creating and utilizing faculties
This is the representation of a faculty to the base platform
That is... a model of a faculty that is still to be started and executed

*/



import { fork } from 'child_process'
import libPath from 'path'
import { fileURLToPath } from 'url'
import { BasePlatform } from '../../base/platform.mjs'
import { FacultyBaseCommInterface } from '../../comm/interface/process-interface.mjs'
import { FacultyDescriptor } from './faculty-descriptor.mjs'





export class Faculty {
    constructor(path) {

        //The descriptor does the work of verifying the faculty.json file, as well as parsing it
        this.descriptor = new FacultyDescriptor(path);
        this.flags = {
            networkEnabled: false
        }
    }



    /**
     * 
     * @param {BasePlatform} base_platform 
     * @returns {NodeJS.Process}
     */
    start = async (base_platform) => {


        //If already started before, then we can't continue
        if (this.running) return console.trace(`Attempting to start a faculty twice`)

        const args = {
            env: JSON.stringify(process.env),
            server_domains: base_platform.server_domains,

        }


        let faculty_process = fork(libPath.resolve(libPath.dirname(fileURLToPath(import.meta.url)), './nursery.mjs'), { env: { path: this.descriptor.path, port: base_platform.port, args: JSON.stringify(args) } })

        this.comm_interface = new FacultyBaseCommInterface(base_platform.faculty_remote_methods, faculty_process, base_platform)

        Reflect.defineProperty(this, 'running', { get: () => true }) //To prevent this script for being started even a second time
        return this.process = faculty_process
    }


}
