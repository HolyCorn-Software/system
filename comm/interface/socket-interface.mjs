/*
Copyright 2021 HolyCorn Software
Common Interface between sockets. Useful for connecting BasePlatform to BasePlatform or FacultyPlatform to FacultyPlatform
*/

import { default as net } from 'net'
import { CommInterface } from './interface.mjs';

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