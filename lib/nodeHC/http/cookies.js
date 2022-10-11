/*
Copyright 2021 HolyCorn Software 
Small module for managing cookies
A node-hc module for reading and writing cookies

Revised 2022 to create a special attribute called 'data' which stores the cookie values.
This solved a bug that if exploited would crash servers, given that cookie values were stored directly on the object.
A client could send a cookie called writeKey or write, which are the names of methods relied on internally.
*/

import http from 'http'

/**
 * Properties are directly stored on the cookie object
 */
export class Cookies {
    //This class represents a collection of cookies
    //E.g {id:'adfadf', lang:'en', node_hc_session_id:'32142341234'}

    constructor(args) {
        //'args' represents an object e.g {alphabet:'abc', numbers:'123'}

        //Set all arguments on this object
        /** @type {Object<string, string>} */ this.data={}
        Object.assign(this.data, args)
    }

    static parseCookieString(string = "") {
        //Returns an object like {lang:'en'} from a string like 'lang=en;', otherwise known as a cookie string
        let cookies = {};
        let cookieReg = /([^= ]+)=([^= ]+)/;
        string.split(/[; ]|$/).forEach(x => cookieReg.test(x) && (cookies[cookieReg.exec(x)[1]] = cookieReg.exec(x)[2]));
        return cookies;
    }

    static getCookies(request) {
        //This method returns the cookies (As an Object of the Cookies class)
        if (!(request instanceof http.IncomingMessage)) {
            throw Error(`Please pass an object of type http.IncomingMessage`)
        }

        //Parsing the cookies will return an object like {'ab':'cd', 'hello':'hi'}
        //Some browsers use the 'cookie' header and Others use the 'Cookie' header, and we need to provide compliance for both
        //The constructor 'Cookies' automatically assign the key-value pairs to the object
        return new Cookies(Cookies.parseCookieString(request.headers.cookie || request.headers.Cookie))
    }

    static get defaultDuration() {
        return 72 * 60 * 60 * 1000; //72 hours
    }

    /**
     * Write only one key to a response
     * @param {string} key 
     * @param {http.ServerResponse} response 
     * @param {{expires:Number, path:string}} param2 
     */
    writeKey(key, response, { expires = Date.now() + Cookies.defaultDuration, path = '/' }) {
        //Writes the value of a particular cookie specified by 'key' to the response object, with an expiry date
        //The 'expires' parameter is a positive whole number, not a date object
        if (!(response instanceof http.OutgoingMessage)) {
            throw new Error(`Please pass an object of type http.OutgoingMessage as the second parameter`)
        }

        //HTTP specifications can tell why we use the 'set-cookie' header and why the string is 'key'='value';expires=Date;path=path;
        response.setHeader('set-cookie', `${key}=${this.data[key]}; expires=${new Date(expires)}; path=${path};`)

    }

    /**
     * Send the cookies to an HTTP server response
     * @param {http.ServerResponse} response 
     * @param {object} param1 
     * @param {Number} param1.expires
     * @param {string} param1.path
     */
    write(response, { expires, path = '/' }) {
        let keys = Reflect.ownKeys(this.data)
        for (var key of keys) {
            this.writeKey(key, response, arguments[1])
        }
    }


}
