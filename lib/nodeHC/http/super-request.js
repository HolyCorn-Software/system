/*
Copyright 2021 HolyCorn Software
Node-hc module
This represents an functionally augmented request object (http.IncomingMessage)

*/


import { SuperObject } from '../super-object/super-object.js'
import http from 'http';
import { Cookies } from './cookies.js';
import { SuperResponse } from './super-response.js';

const cookies = Symbol()

const res = Symbol()

/**
 * @augments http.IncomingMessage
 */

export class SuperRequest extends SuperObject {
    /**
     * 
     * @param {http.IncomingMessage} request 
     * @param {http.OutgoingMessage} response
     * @returns 
     */
    constructor(request, response) {
        super(request)
    }
    async text() {
        if (this.text_data) return this.text_data; //So that the text() method can be called over and over, without dealing with the issue of non-repeating events like on('data')
        let full = '';
        const on_data = chunk => full += chunk
        this.on('data', on_data);
        return await new Promise((ok) => {
            this.once('end', () => {
                ok(this.text_data = full)
                this.off('data', on_data)
            })
        })
    }
    async json() {
        return JSON.parse(await this.text());
    }

    /**
     * @returns {Cookies}
     */
    get cookies() {
        if (this[cookies]) {
            return this[cookies]
        }
        return this[cookies] = Cookies.getCookies(this)
    }
    get res() {
        return this[res] ||= new SuperResponse(super.res)
    }

}