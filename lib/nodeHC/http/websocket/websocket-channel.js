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

        this.ws_encoder_stream = new TranscoderStream.EncoderStream()


        this.setupTriggers()
    }

    /**
     * This method is called internally so that incoming messages will emit specific events
     * Other happenings such as closure will also emit respective events
     */
    setupTriggers() {

        /** @type {(frame:import('./types.js').WebSocketFrame)=>void} */
        let dataHandler;




        this.ws_decoder_stream.on('data', (chunk, type) => {
            this.emit('data', { data: chunk, type })
        })


        this.socket.on('data', dataHandler = (raw_buffer) => {
            this.ws_decoder_stream.write(raw_buffer)
        })

        this.socket.once('end', () => {
            this.emit('end')
            this.socket.removeAllListeners('data')
            this.socket = undefined;
        });


        // this.ws_encoder_stream.addListener('data', (chunk) => {
        //     this.socket?.write(chunk)
        // });

    }


    /**
     * Send a message to the client
     * @param {string|Buffer} data 
     * @param {('text'|'binary')}
     */
    send(data, type = 'text') {
        // this.ws_encoder_stream.write(data, type == 'text' ? 'ascii' : 'binary') //The stream interface will automatically convert the string to a Buffer
        this.socket?.write(TranscoderStream.EncoderStream.createWritableSocketData(data, type));
    }



}