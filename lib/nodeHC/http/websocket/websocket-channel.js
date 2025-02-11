/*
Copyright 2021 HolyCorn Software
The WebSocket module
This generally abstracts the action of sending and receiving data on a WebSocket
*/

import EventEmitter from 'node:events';
import net from 'node:net'
import TranscoderStream from './transcoder-stream.mjs';



export class WebSocketChannel extends EventEmitter {

    /**
     * 
     * @param {net.Socket} socket 
     */
    constructor(socket) {
        super()

        this.socket = socket;



        /** @type {import('./types.js').WebSocketChannelEventParams} */ this.on
        /** @type {typeof this.on} */ this.addListener
        /** @type {typeof this.on} */ this.removeListener
        /** @type {typeof this.on} */ this.off
        /** @type {import('net').Socket} **/ this.socket


        this.ws_decoder_stream = new TranscoderStream.DecoderStream()

        this.setupTriggers()
    }

    /**
     * This method is called internally so that incoming messages will emit specific events
     * Other happenings such as closure will also emit respective events
     */
    setupTriggers() {

        this.ws_decoder_stream.on('data', (chunk, type) => {
            this.emit('data', { data: chunk, type })
        })


        this.socket.on('data', (raw_buffer) => {
            this.ws_decoder_stream.write(raw_buffer)
        })

        this.socket.once('end', () => {
            this.emit('end')
            if (!this.ws_decoder_stream.destroyed) {
                this.ws_decoder_stream.destroy()
            }
            this.socket.removeAllListeners()
            this.removeAllListeners()
            this.socket = undefined;
        });

        this.ws_decoder_stream.once('close', () => {
            this.socket?.end()
        })


    }


    /**
     * Send a message to the client
     * @param {string|Buffer} data 
     * @param {('text'|'binary')} type
     */
    send(data, type = 'text') {
        if (!(this.socket?.closed ?? true)) {
            this.socket.write(TranscoderStream.EncoderStream.createWritableSocketData(data, type));
        }
    }



}