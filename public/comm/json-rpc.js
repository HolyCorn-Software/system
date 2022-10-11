/*
Copyright 2021 HolyCorn Software
This defines a simple JSON-RPC 2.0 Client, that ensures that we don't have to explicitly register methods
At the time the method is being called, the stub object is checked to see the availability of the method.
*/

import { CalculatedError } from '../errors/error.mjs';
import * as uuidAll from './uuid/index.js'
const uuid = uuidAll.v4


/**
 * Supports bi-directional JSON requests
 */


export class JSONRPC extends EventTarget {

    constructor() {

        super();

        /**
         * This object is where the methods to be called will be lookep up.
         * You can set it to anything, as well as append methods to it using the ```register()``` method
         * @type {object}
        */
        this.stub = {}
        this.manager = new JSONRPCManager(this)

        /**
         * Use this object to call remote methods at the _other_ side
         * For example ```myRPC.remote.printRemote('Displayed this remotely!')```
         * @type {JSONRPCRemote}
         */
        let remote = new JSONRPCRemote(this);
        let methodStore = {} //

        /** @type {object} */ this.remote
        Reflect.defineProperty(this, 'remote', {
            get: () => {
                return remote;
            }
        })

        /** Store additional information here, so as to prevent interference with the JSON RPC module */
        this.meta = {}

        /**@type {function(string):undefined} Override this method to receive json data that will be transmitted */this.ondata



        this.transmission_manager = new TransmissionManager(this)

        this.flags = {
            //For each method that is called locally, which objects should be inserted as the first argument ?
            first_arguments: [this],
            expose_stack_traces: true
        }
    }

    /** 
     * Defined so that JSON serializer may avoid it.
     * This object is usually a cause for cyclic property errors with JSON serialization, though unfortunately, it doesn't contain any valuable raw data
     *
    */
    toJSON() {
        return {}
    }


    /**
     * Accept JSON-formated data
     */
    accept(json_text) {
        //The reason the \n was added in the first place during transmission is to prevent collisions when two processes transmit json text which concatenates to something unelligible


        let chunks = json_text.split('\n');

        for (let chunk of chunks) {
            if (chunk === '') continue;
            try {
                let json = JSON.parse(chunk)
                this.transmission_manager.onData(json)
            } catch (e) {
                if (/unexpected token.*JSON/gi.test(e.message)) {
                    console.log('JSONRPC could not parse ', chunk, `. It is ${typeof chunk}`)
                    window.unparsable = chunk
                } else {
                    console.log(`Error\n`, e, `\nFor input: '${chunk}'`)
                    console.log(`this.stub `, this.stub)
                }
            }
        }

    }


    /**
     * 
     * @param {string} name 
     * @param {function(JSONRPC,...any)} method 
     * Register a method that will be called remotely by the client.
     * 
     * Take note that when the method is called, the first argument will be reference to the JSONRPC object.
     * Which means
     * @example hello(name){
     *      
     * } 
     * //becomes
     * hello(rpc, name){
     *      
     * }
     */
    register(name, method) {
        Object.defineProperty(this.stub, name, {
            value: method,
            configurable: true,
            enumerable: true
        })
    }


}



class JSONRPCRemote {

    /**
     * 
     * @param {JSONRPC} json_rpc 
     * @returns {Proxy<JSONRPC>}
     */

    constructor(json_rpc) {

        let getter_stack = /^ *(.+)/s.exec(new Error().stack.split('\n').slice(3,).join('\n'))[1]


        return new Proxy({}, {

            /**
             * 
             * @param {JSONRPC} target 
             * @param {string} property 
             * @returns {Promise<function>}
             */
            get: (target, property) => {
                if (property === 'then') {
                    // console.trace('NO to await')
                    return undefined;
                }

                // Here, we are returning a function that when it gets called, the remote
                // object will receive the request to call the same function
                // The mechanism is to establish a message to be sent to the remote destination
                // Then keep a promise that will be fulfilled when the response comes back

                return new JSONRPCRemoteObject(property, json_rpc, { stack: getter_stack })
            }
        })

    }

}


/**
 * This represents an object that's residing remotely
 * This class allows that we can have nested properties, without ever remotely querrying them
 * Instead of the simple model of someObject.remote.hello() we can have someObject.remote.greetings.english.hello()
 */

export class JSONRPCRemoteObject {

    /**
     * 
     * @param {string} methodName The name of the method that will be called
     * @param {JSONRPC} json_rpc The interface for communication
     * @returns 
     */
    constructor(methodName, json_rpc, { stack: getterStack = '' } = {}) {

        /** @type {Function<Promise<any>> | Object<string, JSONRPCRemoteObject>} */
        let proxy = new Proxy(() => 1, {

            get: (target, property) => {
                if (property === 'then') return;
                return new JSONRPCRemoteObject(`${methodName}.${property}`, json_rpc, { getterStack: new Error().stack.split('\n')[1] + getterStack })
            },
            set: (target, property, value) => {
                throw new Error(`For now, we cannot yet set a property on a remote object`)
            },

            apply: function (target, _this, args) {

                const stack =
                    getterStack //Previous lines of how the handle to the connection (remote method) was gotten in the first place
                    + '\n' +
                    //Then the stack trace from calling this method
                    new Error().stack.split('\n').slice(3,).join('\n');

                return new Promise(async (ok, failed) => {
                    let id = uuid();
                    let message = {
                        jsonrpc: '2.0',
                        id,
                        method: methodName,
                        params: args
                    };

                    try {

                        json_rpc.transmission_manager.onOutput(message)
                    } catch (e) {
                        console.log(`Could not handle call to ${methodName} because:`, e)
                        failed(`System Error`)
                    }

                    let settled_promise_resolve;
                    let settled_promise = new Promise((resolve, reject) => {
                        settled_promise_resolve = resolve
                        // setTimeout(reject, 2000);
                    })

                    settled_promise.catch(() => {
                        //Seems like any method can take too long
                        //Therefore solving the problem of hanging sockets is a synchronization problem
                        console.warn(`Call ${message.method}() took long. id: ${message.id}`)
                    })


                    //What happens when the response has been given ?
                    json_rpc.manager.addEventListener(`resolve-${id}`, function ({ detail: result }) {
                        settled_promise_resolve()
                        ok(result)
                    }, { once: true })


                    // And what happens if it has been rejected
                    json_rpc.manager.addEventListener(`reject-${id}`, function ({ detail: error }) {
                        settled_promise_resolve()
                        if (error) {
                            switch (error.code) {
                                case -32601:
                                    {
                                        let exception = new CalculatedError({ message: `The method ${methodName} is not available!`, code: 'error.system.unplanned' });
                                        exception.stack = `${exception.message}\n${stack}`;
                                        console.log(exception)
                                        failed(exception)
                                        break;
                                    }

                                default:
                                    {

                                        let exception = {}
                                        exception.code = error.message.code
                                        exception.id = error.message.id
                                        exception.message = `${error.message.message}`
                                        exception.stack = `${exception.message}\n${(error.message.stack ? `${error.message.stack}\n-----------------\n` : '') + stack.split('\n').reverse().join('\n')}`;
                                        // console.log(`new Error().stack\n`, new Error().stack)
                                        console.log(exception)
                                        failed(new CalculatedError(exception));
                                    }
                            }
                            return;
                        }
                        failed('unknown error')
                    }, { once: true });

                    setTimeout(() => failed(new Error(`Timeout reaching server`)), 300_000)
                });
            }
        })

        return proxy;

    }

}


class JSONRPCManager extends EventTarget {


    /**
     * 
     * @param {JSONRPC} json_rpc 
     */
    constructor(json_rpc) {
        super();

        this.json_rpc = json_rpc
    }


    /**
     * Now we are processing the return types of 
     * @param {JSONRPCMessage} object 
     */
    async accept(object) {

        //Determining if this is a return message, or a request
        if (object.method) {
            //Then its a call

            //Now, since we are dealing with nested properties, let's go down object by object
            let parts = object.method.split(/\./);
            let method = this.json_rpc.stub;

            for (var part of parts) {
                method = method?.[part]
            }

            // First see if the method that is to be called even exists
            if (typeof method === 'undefined') {
                //If not, then its an error
                this.json_rpc.transmission_manager.onOutput({
                    jsonrpc: '2.0',
                    id: object.id,
                    error: {
                        code: -32601,
                        message: `The method ${object.method} was not found`
                    }
                })
                return
            }
            try {
                let args = []
                if (this.json_rpc.flags.first_arguments) {
                    args.push(...this.json_rpc.flags.first_arguments)
                }
                args.push(...object.params)
                if (typeof method !== 'function') {
                    console.log(`Tried to call %o as %s. Call was made on ${window.location.href} page `, method, object.method);
                    throw { stack: `${object.method} is not a function.\n\tCall was made to client at ${window.location.href}`, code: `error.system.unplanned` }
                }

                let promise = method(...args)

                //Now, wait for when

                let result = await promise ?? null;
                //If no issue
                this.json_rpc.transmission_manager.onOutput({
                    jsonrpc: '2.0',
                    id: object.id,
                    result,
                    src_method: object.method
                })

            } catch (e) {

                if (typeof e === 'string') {
                    e = new Exception(`Auto generated by JSONRPCManager`, { code: e })
                }

                if ((typeof e !== 'string') && !(e instanceof Exception)) {
                    console.log(`e did not fall into a normal category.\n\t\te is\n\t--------------------\n%o\n----------------------------------`, e)
                    e = new Exception(e.message, { code: 'error.system.unplanned' })
                }

                if (!this.json_rpc.flags.expose_stack_traces) {
                    e.stack = '';
                }

                this.json_rpc.transmission_manager.onOutput({
                    jsonrpc: '2.0',
                    id: object.id,
                    error: {
                        code: -32000,
                        message: { ...e, stack: e.stack, message: e.message }
                    }
                });
            }

            return;
        }


        //Well, but if its the returns of a method that was called
        if (typeof object.result != 'undefined') {
            this.dispatchEvent(new CustomEvent(`resolve-${object.id}`, { detail: object.result }))
        }

        if (typeof object.error != 'undefined') {
            this.dispatchEvent(new CustomEvent(`reject-${object.id}`, { detail: object.error }))
        }

        if (object.special?.action === 'CALL_ACK' || object.special?.action === 'RETURN_ACK') {
            this.dispatchEvent(new CustomEvent(`${object.special.action}-${object.special.id}`))
        }

    }


}




class TransmissionManager {


    /**
     * @param {JSONRPC} json_rpc
     */
    constructor(json_rpc) {

        /** @type {JSONRPC} */
        this.json_rpc = json_rpc;

        /** @type {[string]} Contains a list of id's of the last 512 function calls. This helps prevent double calling of a function, all in the name of transmission error */
        this.pendingCalls = new Proxy([], {

            set: (target, property, value) => {
                Reflect.set(target, property, value);
                if (target.length > 512) {
                    target.shift();
                }
                return true;
            }

        })

        /** Calls that are going to the server */
        this.outboundCalls = [];

        /** @type {function(JSONRPCMessage)} This method is used internally to prepare data and eventually send it*/ this.onOutput0
        Object.defineProperty(this, 'onOutput0', {
            value: (d) => {
                let error = new Error();
                try {
                    if (!this.json_rpc.ondata) {
                        return console.trace('JSON RPC did not respond to a request because this.ondata was not defined')
                    }
                    this.json_rpc.ondata(JSON.stringify(d) + '\n') //This is to avoid conflicts (when two processes transmit at the same time and the JSON concatenates to something unwanted.)
                } catch (e) {

                    console.log(`JSONRPC Unexpected Error\n${e.stack || e.message || e}\nStack: ${error.stack}`, d)
                    throw e
                }
            }
        })
    }



    /**
     * This message is called the JSONRPC receives data 
     * @param {JSONRPCMessage} object 
     */
    onData(object) {

        //First things first, pass on the message
        if (typeof object.method !== 'undefined') {
            if (this.pendingCalls.some(x => x === object.id)) {
                return console.log(`Double calling the ${object.method} method has been prevented`)
            } else {
                this.pendingCalls.push(object.id);
            }
        }

        this.json_rpc.manager.accept(object);



        // So, if the incoming message was denoting the returns of a function
        if (typeof object.src_method !== 'undefined') {
            //Then we can send an ACK for the message return
            setTimeout(() => this.onOutput0({
                id: uuid(),
                special: {
                    action: 'RETURN_ACK',
                    id: object.id
                },
                jsonrpc: '2.0'
            }), 1000)
            //We don't need to try re-sending this ACK because if no RETURN_ACK is received by the server, then it will re-send the return, and we will re-send an ACK
        }

        //Now, if it is a function call,
        if (typeof object.method !== 'undefined') {

            //First thing, send an ACK if it takes more than 2s (Transmissionmanager.expectedMethodTimeLocal)
            new Promise((resolve, reject) => {
                const cleanup = (...args) => {
                    resolve(...args);

                    //Proper clean up
                    this.json_rpc.manager.removeEventListener(`resolve-${object.id}`, cleanup)
                    this.json_rpc.manager.removeEventListener(`reject-${object.id}`, cleanup)
                }
                this.json_rpc.manager.addEventListener(`resolve-${object.id}`, cleanup, { once: true })
                this.json_rpc.manager.addEventListener(`reject-${object.id}`, cleanup, { once: true })
                setTimeout(reject, TransmissionManager.expectedMethodTimeLocal);
            }).catch(() => {
                //An error means there was a timeout, so therefore send an ACK first
                console.log(`Sending CALL_ACK for method `, object.method)
                this.onOutput0({
                    id: uuid(),
                    jsonrpc: '2.0',
                    special: {
                        action: 'CALL_ACK',
                        id: object.id
                    }
                })
            })
        }

    }

    /**
     * This method is called when the JSONRPCManager wants to send some data for transmission
     * @param {JSONRPCMessage} object 
     */
    async onOutput(object) {

        let startTime = Date.now();

        if (this.outboundCalls.length > 32) { //Let's not have too many concurrent calls
            await new Promise((done, failed) => {
                let interval = setInterval(() => {
                    if (this.outboundCalls.length < 30) {
                        done();
                        clearInterval(interval);
                    }
                    setTimeout(() => {
                        failed(new Error(`Timeout reaching server`))
                        clearInterval(interval)
                    }, 2000)
                }, 2)
            })
        }

        if (this.__last_call_time - Date.now() < 1) {
            await new Promise(x => setTimeout(x, 3));
        }

        this.__last_call_time = Date.now();


        //First things first, send the data
        this.onOutput0(object);

        this.outboundCalls.push(object.id)

        //Now, if what we just sent was a function call, we should be receiving an ACK, a resolve, or a reject in less than 5s
        if (typeof object.method !== 'undefined') {
            new Promise((resolve, reject) => {
                const cleanup = (...args) => {
                    resolve(...args);

                    //Proper clean up
                    this.json_rpc.manager.removeEventListener(`resolve-${object.id}`, cleanup)
                    this.json_rpc.manager.removeEventListener(`reject-${object.id}`, cleanup)
                    this.json_rpc.manager.removeEventListener(`CALL_ACK-${object.id}`, cleanup)

                    this.outboundCalls = this.outboundCalls.filter(x => x !== object.id);

                    let endTime = Date.now();

                    let duration = endTime - startTime;
                    if (duration > 25) {
                        // console.log(`${object.method} took ${endTime - startTime}ms`)
                    }
                }

                this.json_rpc.manager.addEventListener(`resolve-${object.id}`, cleanup, { once: true })
                this.json_rpc.manager.addEventListener(`reject-${object.id}`, cleanup, { once: true })
                this.json_rpc.manager.addEventListener(`CALL_ACK-${object.id}`, cleanup, { once: true })
                setTimeout(reject, TransmissionManager.expectedMethodTimeRemote)

            }).catch(() => {
                //Now that no ACK was received, and we have neither a resolve or a reject, then well, the server didn't see the message
                resend()
            })
        }

        //and if it was a return, but no ACK for the return was received...
        if (typeof object.src_method !== 'undefined') {
            new Promise((resolve, reject) => {
                this.json_rpc.manager.once(`RETURN_ACK-${object.id}`, resolve)
                setTimeout(reject, TransmissionManager.expectedMethodTimeRemote)
            }).catch(() => {
                resend()
            })
        }

        const resend = () => {//TODO: Improve the efficiency of the auto-retry
            this.onOutput0(object);
        }

    }

    static get expectedMethodTimeLocal() {
        return 500;
    }

    static get expectedMethodTimeRemote() {
        return 1000;
    }

}



/**
 * @typedef {{
 * jsonrpc:'2.0',
 * 
 * id: string,
 * method: string,
 * params: [any],
 * 
 * src_method: string,
 * error: any
 * 
 * 
 * special:{
 *      action:('CALL_ACK'|'RETURN_ACK'),
 *      id: string|undefined
 * },
 * }} JSONRPCMessage
 */