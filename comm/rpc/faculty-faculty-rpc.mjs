/*

Copyright 2021 HolyCorn Software
This class enables a Faculty to set up a server socket to locally listen for other Faculties

*/


import net from 'net';
import { EventEmitter } from 'events';
import { SocketCommInterface } from '../interface/socket-interface.mjs';
import fs from 'fs'
import { callWithRetries } from '../../util/util.js';
import JSONRPC from './json-rpc.mjs';

/**
 * @typedef {function(('connect'))} FacultyFacultyRPCServerEventsFunction
 */

export class FacultyFacultyRPCServer extends EventEmitter {


    /**
     * @param {import('../../lib/libFaculty/faculty-connection-manager.mjs').FacultyConnectionManager} faculty_connection_manager 
     * @param {net.Socket} server_socket 
     */
    constructor(faculty_connection_manager, server_socket) {
        super()

        this.platform = faculty_connection_manager
        this.serverSocket = server_socket;


        this.serverSocket.on('connection', async (socket) => {

            try {
                let _interface = new FacultyFacultyInterface(socket, FacultyPlatform.get())
                await _interface.handshake()
                this.emit('connect', _interface) //To the listeners. Let them know a new client connected
                console.log(`${FacultyPlatform.get().descriptor.label.green} received a connection from ${_interface.rpc.meta.remoteDescriptor.label.blue}`);

            } catch (e) {
                console.log(`A new faculty tried to connect, but failed\n`, e)
            }
        })

        /** @type {FacultyFacultyRPCServerEventsFunction} */ this.on
        /** @type {FacultyFacultyRPCServerEventsFunction} */ this.addListener


    }

    /**
     * 
     * @param {import('../../lib/libFaculty/faculty-connection-manager.mjs').FacultyConnectionManager} faculty_connection_manager
     * @returns {FacultyFacultyRPCServer}
     */

    static async new(faculty_connection_manager) {

        //Now before starting the a server socket, let's clean up the old socket
        let socket_file = faculty_connection_manager.mainSocketPath;
        if (fs.existsSync(socket_file)) { //That is, if there's the old socket
            fs.rmSync(socket_file)
        }

        let f_f_server_socket = new net.Server() //f_f :: faculty to faculty
        f_f_server_socket.listen(socket_file);

        // console.log(`${faculty_platform.descriptor.label.blue} just created a server socket to accept inter-faculty connections at time ${Date.now().toString().blue}`)


        //Do some clean up during exit
        global.process.on('SIGINT', () => {
            f_f_server_socket.close(() => {
                if (fs.existsSync(socket_file)) {
                    fs.rmSync(socket_file)
                }
            })
        })

        return new this(faculty_connection_manager, f_f_server_socket)

    }


}


/**
 * @template DataType
 * A neat interface for how faculties view themselves
 * Hides all details of the implementations.
 */
export class FacultyFacultyInterface {

    constructor(socket) {

        /** @type {FacultyFacultyJSONRPC} */ this.rpc
        Reflect.defineProperty(this, 'rpc', {
            value: new FacultyFacultyJSONRPC(),
            enumerable: true
        });
        this.rpc.flags.expose_stack_traces = true

        new SocketCommInterface(socket, undefined, this.rpc)

        /** @type {object} */ this.descriptor

        Reflect.defineProperty(this, 'descriptor', {
            get: () => this.rpc.meta.remoteDescriptor,
            enumerable: true
        })

        Reflect.defineProperty(this, 'remote', {
            get: () => this.rpc.remote,
            enumerable: true
        })

        /** @type {object} */ this.remote
        /** @type {import('system/lib/libFaculty/types.js').FacultyDescriptor} */ this.descriptor

        /** @type {boolean} */ this.received_handshake
        /** @type {boolean} */ this.sent_handshake

        const original_stub = Reflect.getOwnPropertyDescriptor(this.rpc, 'stub');

        Reflect.defineProperty(this.rpc, 'stub', {
            get: () => {
                return {
                    $faculty_describe: this.$faculty_describe
                }
            },
            set: () => {
                console.trace(`Someone tried to set a value for stub. What do we do ?`.bgYellow)
            },
            configurable: true,
            enumerable: true
        });

        let rec;
        Reflect.defineProperty(this, 'received_handshake', {
            set: (val) => {
                rec = val;
                if (!val) return;

                Reflect.deleteProperty(this.rpc, 'stub')
                if (original_stub) {
                    Reflect.defineProperty(this.rpc, 'stub', original_stub)
                }
            },
            get: () => rec
        })

    }

    /**
     * This method is called by remote faculties to make their identities available
     * @param {FacultyFacultyJSONRPC} jsonRPC 
     * @param {import('system/lib/libFaculty/types.js').FacultyDescriptor} descriptor 
     */
    $faculty_describe = async (_null, descriptor) => {
        this.rpc.meta.remoteDescriptor = descriptor
        this.received_handshake = true;
    }




    /**
     * 
     * @returns {FacultyFacultyInterface<DataType>}
     */
    handshake() {

        return new Promise(async (success, failure) => {

            const failed = (e) => {
                failure(e)
                cleanup()
            }
            const cleanup = () => {
                clearInterval(doChecksKey)
            }

            let doChecks = () => {
                if (this.received_handshake && this.sent_handshake) {
                    success(this);
                    cleanup()
                }
            }

            const doChecksKey = setInterval(doChecks, 1)



            let doDescribe = async () => {
                try {
                    await new Promise(x => setTimeout(x, Math.random() * 10))
                    await this.remote.$faculty_describe(FacultyPlatform.get().descriptor)
                    this.sent_handshake = true
                } catch (e) {
                    failure(e)
                    console.log(`${this.sent_handshake ? 'Sent without receiving' : 'Failed to send and receive'} descriptor\n`, e)
                }
            }

            try {
                await callWithRetries(doDescribe, {
                    label: `Sending description of ${FacultyPlatform.get().descriptor.label} to another faculty`,
                    callInterval: 200,
                    maxTries: 50,
                    timeout: 1500
                })
            } catch (e) {
                failed(e);
            }

        })

    }







}



export class FacultyFacultyRPCClient {

    /**
     * 
     * @param {{
     *      local:string,
     *      remote:{port:Number, host:string}
     * }} credentials 
     * @returns {SocketCommInterface}
     */
    static async connect(credentials) {
        let socket = new net.Socket();

        try {

            let doConnect = () => {
                return new Promise((resolve, reject) => {

                    socket.connect(credentials.local ? { path: credentials.local } : { port: credentials.remote.port, host: credentials.remote.address });
                    socket.once('error', reject)
                    socket.once('connect', resolve)

                })
            }

            await callWithRetries(doConnect, {
                label: `Connecting a socket to endpoint ${credentials.local || (`${credentials.remote.host}:${credentials.remote.port}`)}`,
                maxTries: 5,
                callInterval: 500,
                timeout: 100
            })

            let _interface = new FacultyFacultyInterface(socket)
            await _interface.handshake()

            return _interface;
        } catch (e) {
            socket.destroy();
            throw e
        }

    }
}



/**
This defines a class containing methods residing in faculties that are called by other faculties (far and wide)
Only one copy of this object should be through out the platform
That's because the faculty will register methods that are to be called remotely on it.

One easy way to use this class is to create an instance of it, then set it to facultyPlatform.remote.internal
For example

```js
import {FacultyPlatform} from '../../lib/libFaculty/platform.mjs' //Don't forget this changes

class MyInternalMethods extends FacultyFacultyRemoteMethods{
    
        async sayHello(){
            console.log('Someone said hello')
            return 'Hello'
        }
}

const platform = FacultyPlatform.get()

platform.remote.intenal = new MyInternalMethods()
//Assuming the name of your faculty is 'testfaculty'

//Now another Faculty can say 
const anotherFaculty = FacultyPlatform.get()
const testFac = await anotherFaculty.connectionManager.connect('testfaculty')
testFac.remote.sayHello();
```
*/
export class FacultyFacultyRemoteMethods {


    constructor() {

        return new FacultyFacultyRemoteObject(this);
    }



}


/**
 * This object works with the following simple rules
 * Getting any property will return a proxy (FacultyFacultyRemoteObject) that's wrapped arround the object
 * If the object is a function, then the way the function is called will be altered, so that the first parameter to the real function will be a descriptor of the calling faculty
 */
class FacultyFacultyRemoteObject {

    /**
     * 
     * @param {any} object 
     * @param {FacultyFacultyRPCServer} server 
     * @returns 
     */
    constructor(object) {

        if (!object) {
            return
        }

        return new Proxy(object, {
            get: (target, property) => {
                if (typeof target[property] === 'function') {
                    return function () {
                        let [{ meta: { remoteDescriptor: descriptor } }, ...args] = arguments
                        return target[property]({ descriptor, remote: arguments[0].remote }, ...args)
                    }
                }
                return new FacultyFacultyRemoteObject(target[property]);
            }
        })

    }

}


/**
 * This class is just for more clarity
 * It provides information about the faculty on the other end that is using RPC
 */
export class FacultyFacultyJSONRPC extends JSONRPC {
    constructor() {
        super()

        /** @type {{remoteDescriptor:import('system/lib/libFaculty/types.js').FacultyDescriptor}} */
        this.meta

        this.flags.error_transform = x => x
    }
    get stub() {
        return (FacultyPlatform.get()).remote.internal
    }
    set stub(val) {
        //No modifications
    }

}