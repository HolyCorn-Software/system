/*
Copyright 2021 HolyCorn Software
Common Interface between sockets. Useful for connecting BasePlatform to BasePlatform or FacultyPlatform to FacultyPlatform
*/

import { default as net } from 'net'
import { CommInterface } from './interface.mjs';
import JSONRPC from '../rpc/json-rpc.mjs';


export class SocketCommInterface extends CommInterface {
    //Common interface that defines communications between client and server

    /**
     * 
     * @param {net.Socket} socket
     * @param {object} methods An object containing methods that will automatically be registered once the the interface is created
     * @param {JSONRPC} rpc Optional argument, that specifies the rpc object where the methods will looked up from
     */
    constructor(socket, methods = {}, rpc) {

        super(methods, rpc);
        this.socket = socket;

        this.busy = false; //This object is used to serialize access to the ondata method
        socket.setDefaultEncoding('utf-8')
        socket.setNoDelay(true)


        let socket_data_buffer = []
        let on_socket_data = (d) => {
            if (socket !== this.socket) {
                //Then this socket is no longer the one we're using
                socket.off('data', on_socket_data)
                return;
            }
            d = d.toString()
            socket_data_buffer.push(d)
            if (d.endsWith('\n')) {
                this.rpc.accept(socket_data_buffer.join(''))
                socket_data_buffer = []
            }
        }
        socket.on('data', on_socket_data)


        this.rpc.ondata = async d => {
            socket.write(d)
        }


    }

    /**
     * ipv4 address that the interface is bound to
     * @returns {string}
     */
    get remoteAddress() {
        //You know we are dealing with ipv4 addresses in the ipv6 plain
        return this.socket.remoteAddress.replace(`::ffff:`, '');

    }


}



/**
 * This logic of this is just to ensure only one object has access to the lock at time.
 * Now, in addition to that, objects state their max time. After this, if the lock hasn't been released, it'll be done
 * forcefully and automatically.
 */
class Lock {

    constructor(base, timeout) {
        this.base = base
        this.timeout = timeout
        //console.log(`acquired a ${timeout}ms lock at ${Date.now()}`)
    }
    set timeout(timeout) {
        if (this.__timeout_key__) {
            clearTimeout(this.__timeout_key__)
        }
        this.__timeout__ = timeout

        this.__timeout_key__ = setTimeout(() => {
            //If after the time limit, the lock was not released by this object...
            if (!this.released && this.base.busy) {
                //Release forcefully
                console.log('Force release !'.red)
                this.base.busy = false
                this.released = true;
            }
        }, timeout)

    }
    get timeout() {
        return this.__timeout__
    }
    release = () => {
        this.base.busy = false
        this.released = true;
    }

    /**
     * 
     * @param {object} base 
     * @param {Number} time - How long to hold the lock, before forcefully discarding
     * @returns {Lock}
     */
    static async new(base, time) {

        await new Promise((ok) => {
            if (!base.busy) {
                ok()
            }
            let doIt = () => {
                if (!base.busy) {
                    clearInterval(interval)
                    ok()
                }
            }
            let interval = setInterval(() => {
                if (!base.busy) {
                    setTimeout(doIt, Math.random() * 10) //Sleeping for a random amount of time is how we resolve conflicts
                }
            }, 1)
        })


        base.busy = true; //Lock it so that others don't grab the lock before time

        return new this(base, time)
    }

}
