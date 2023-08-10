/*
Copyright 2021 HolyCorn Software
This node-hc module contains code to provide the system with basic functionalities for handling client requests
To make use of this, when you get a regular response do this
function(regular_response){
    //regular response came in as an argument to this function
    let super_response = new SuperResponse(regular_response)
    super_response.endJSON('thank you !')
}
*/

import { SuperObject } from '../super-object/super-object.js';
import http from 'node:http'
import { SuperRequest } from './super-request.js';

const req = Symbol()


/**
 * @augments http.ServerResponse
 */
export class SuperResponse extends SuperObject {
    //This method takes all a normal http.ServerRespone response and transforms it to something with more capabilities

    /**
     * 
     * @param {http.OutgoingMessage} response 
     * @returns 
     */
    constructor(response) {
        super(response)
    }
    endJSON(object, headers = {}, code = 200, flags = { stringifyString: false }) {
        let data = typeof object === 'string' && !flags.stringifyString ? object : JSON.stringify(object);
        headers = { 'Content-Length': data ? Buffer.from(data).byteLength : 0 + "", 'Content-Type': 'application/json', ...headers, }

        for (var key in headers) {
            if (this.writable && !this.headersSent) {
                this.setHeader(key, headers[key])
            }
        }
        this.writeHeader(code);
        this.end(Buffer.from(data))
    }
    get req() {
        return this[req] ||= new SuperRequest(super.req)
    }
    get cookies() {
        return this.req.cookies
    }
}
