/*
Copyright 2021 HolyCorn Software
This defines the interface between a BasePlatform and FacultyPlatform using process node-native ipc channel
*/


import { BasePlatform } from '../../base/platform.mjs';
import { BaseToFacultyRemoteMethods, FacultyToBaseRemoteMethods } from '../rpc/faculty-base-remote-methods.mjs'
import { CommInterface } from './interface.mjs'
import worker_threads from 'node:worker_threads'


export class FacultyBaseCommInterface extends CommInterface {
    //Common interface that defines communications between client and server

    /**
     * @param {import('../../base/platform.mjs').BasePlatform} basePlatform
     * @param {import('system/lib/libFaculty/faculty.mjs').Faculty} faculty
     */
    constructor(basePlatform, faculty) {


        super();

        if (BasePlatform.get() instanceof BasePlatform) {
            // In base platform
            faculty.channel.addListener('message', (data) => this.rpc.accept(data))
            this.rpc.flags.first_arguments = [faculty]
            this.rpc.ondata = d => faculty.channel.postMessage(d)
            this.rpc.stub = new BaseToFacultyRemoteMethods(basePlatform)


        } else {

            //If in Faculty Platform

            worker_threads.parentPort.addListener('message', (data) => {
                this.rpc.accept(data)
            })



            this.rpc.ondata = d => {
                worker_threads.parentPort.postMessage(d)
            }


            this.rpc.flags.first_arguments = [] //Don't inject the default JSON RPC Object as first argument
            this.rpc.sub = new FacultyToBaseRemoteMethods()

        }
    }
    /**
     * This is an interface that you can use to call methods residing on the other end of the communication link (remote methods)
     * For example, assuming the method exists, you can do  await this.remote.serverWake()
     * @returns {soul.comm.rpc.AggregateRPCTransform<BaseToFacultyRemoteMethods> & import('../../public/comm/rpc/json-rpc/remote.mjs').default}
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