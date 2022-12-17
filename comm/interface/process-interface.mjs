/*
Copyright 2021 HolyCorn Software
This defines the interface between a BasePlatform and FacultyPlatform using process node-native ipc channel
*/


import { BaseToFacultyRemoteMethods, FacultyToBaseRemoteMethods } from '../rpc/faculty-base-remote-methods.mjs'
import { CommInterface } from './interface.mjs'


export class FacultyBaseCommInterface extends CommInterface {
    //Common interface that defines communications between client and server

    /**
     * @param {object} methods An object containing methods that will automatically be registered once the the interface is created
     * @param {NodeJS.Process|undefined} process The process to communicate with
     * @param {import('../../base/platform.mjs').BasePlatform} basePlatform
     */
    constructor(methods = {}, process = global.process, basePlatform) {

        super();

        process.on('message', (d) => {
            this.rpc.accept(d.toString())
        })

        this.rpc.ondata = d => {
            process.send(d)
        }

        this.rpc.stub = methods;

        //If in Faculty Platform
        if (process === global.process) {
            this.rpc.flags.first_arguments = [] //Don't inject the default JSON RPC Object as first argument
            this.rpc.sub = new FacultyToBaseRemoteMethods()
        } else {
            this.rpc.flags.first_arguments = [basePlatform.faculties.findByJSONRPC(this.rpc)]
            Reflect.defineProperty(this.rpc.flags, 'first_arguments', {
                get: () => {
                    const faculty = basePlatform.faculties.findByJSONRPC(this.rpc)
                    if (!faculty) {
                        throw new Error(`Cannot invoke method on BasePlatform without being a registered faculty`)
                    } else {
                        return [faculty]
                    }
                }
            })
        }
    }
    /**
     * This is an interface that you can use to call methods residing on the other end of the communication link (remote methods)
     * For example, assuming the method exists, you can do  await this.remote.serverWake()
     * @returns {BaseToFacultyRemoteMethods & import('../rpc/json-rpc.mjs').JSONRPCRemote}
     */
    get remote() {
        return this.rpc.remote
    }
    /**
     * @returns {FacultyToBaseRemoteMethods}
     * This interface is the same as `this.remote`, but it is done differently so that it can give more clarity
     */
    get serverRemote() {
        return this.rpc.remote
    }

}