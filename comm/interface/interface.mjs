/*
Copyright 2021 HolyCorn Software
This class defines the general structure of everything that provides communication between a platform and another.
Be it BasePlatform to FacultyPlatform, FacultyPlatform to FacultyPlatform, ...

*/


import {JSONRPC}  from '../rpc/json-rpc.mjs'


export class CommInterface {
    //Common interface that defines communications between client and server

    /**
     * @param {object} methods An object containing methods that will automatically be registered once the the interface is created
     */
    constructor( methods = {}, rpc=new JSONRPC()) {
        this.rpc = rpc

        //Now that everything is set, register the new methods

        for (var method in methods) {
            if (methods[method] instanceof Function) {

                ((method) => {
                    this.rpc.register(method, async function () {
                        return await methods[method].apply(this, [...arguments])
                    }.bind(this))
                })(method)
            }
        }
    }
    /**
     * This is an interface that you can use to call methods residing on the other end of the communication link (remote methods)
     * For example, assuming the method exists, you can do  await this.remote.serverWake()
     * @returns {object}
     */
    get remote() {
        return this.rpc.remote
    }

}