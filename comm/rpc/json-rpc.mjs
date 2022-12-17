/*
Copyright 2021 HolyCorn Software
This defines a simple JSON-RPC 2.0 Client, that ensures that we don't have to explicitly register methods
At the time the method is being called, the stub object is checked to see the availability of the method.
This module is adapted to work in the client browser

Updated 2022 to support ACK messages
*/

import crypto from 'node:crypto'
import { EventEmitter } from 'events'
import { Platform } from '../../platform.mjs';
import { WildcardEventEmitter } from '../utils/wildcard-events.mjs';
// import { getCaller } from '../../util/util.js';
const uuid = crypto.randomUUID

/** @type {typeof import('../../errors/backend/exception.js').Exception} */
let Exception;
//If not, there'll be a cyclic dependency
import('../../errors/backend/exception.js').then(e => Exception = e.Exception);
//import { Exception } from '../errors/backend/exception.js'
/** @type {typeof import('../../lib/libFaculty/platform.mjs').FacultyPlatform} */
let FacultyPlatform
import('../../lib/libFaculty/platform.mjs').then(x => FacultyPlatform = x.FacultyPlatform);

const stubSymbol = Symbol('JSONRPC.prototype.stub')
const defaultStubSymbol = Symbol(`JSONRPC.prototype.defaultStub`)
let getCaller = (await import('../../util/util.js')).getCaller;

/**
 * Supports bi-directional JSON requests
 * There are four(4) important points when using this class
 *  - The rpc.stub
 *  - The rpc.ondata settable function
 *  - The rpc.accept callable
 *  - The rpc.remote object
 * @template DataType
 */
export class JSONRPC {

    constructor() {

        /**
         * This object is where the methods to be called will be lookep up.
         * You can set it to anything, as well as append methods to it using the ```register()``` method
         * @type {object}
        */
        this.stub = {}
        /** @type {JSONRPCManager} */
        this.manager = new JSONRPCManager(this)

        /**
         * Use this object to call remote methods at the _other_ side
         * For example ```myRPC.remote.printRemote('Displayed this remotely!')```
         * @type {JSONRPCRemote& DataType}
         */
        let remote = new JSONRPCRemote(this);
        /** @type {object} */ this.remote
        Reflect.defineProperty(this, 'remote', {
            get: () => remote
        })

        /** Store additional information here, so as to prevent interference with the JSON RPC module */
        this.meta = {}

        /**@type {function(string):undefined} Override this method to receive json data that will be transmitted */this.ondata



        this.transmission_manager = new TransmissionManager(this)

        this.flags = {
            //For each method that is called locally, which objects should be inserted as the first argument ?
            first_arguments: [this],
            expose_stack_traces: true,
            stripColors: false
        }

        this[defaultStubSymbol] = new JSONRPCDefaultStub(this);

        this.id = uuid()

        /** @type {JSONRPCDefaultStub} */ this.$rpc
        Reflect.defineProperty(this, '$rpc', {
            get: () => this[defaultStubSymbol],
            configurable: true,
            enumerable: true
        })
    }

    set stub(stub) {
        this[stubSymbol] = stub
    }
    get stub() {

        const defaultStub = this[defaultStubSymbol]

        return new Proxy(this[stubSymbol], {
            get: (target, property, receiver) => {
                if (property === '$rpc' && !(property in target)) {
                    return defaultStub
                }
                return Reflect.get(target, property, receiver)

            }
        })
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
                    // console.log('JSONRPC could not parse ', chunk)
                } else {
                    console.error(e, `\nFor input: '${chunk}'`)
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


/**
 * This defines the interface we have access to when invoking remote methods.
 * 
 * The methods called on this interface apply remotely
 */
export class JSONRPCRemote {

    /**
     * 
     * @param {JSONRPC} json_rpc 
     * @returns {Proxy<JSONRPC>}
     */

    constructor(json_rpc) {

        let creation_stack = `Creation stack\n${getCaller({ offset: 2 })}`//new Error().stack.split('\n').slice(4,).join('\n') + `\n${'.'.repeat(process.stdout.columns)}`

        /** @type {JSONRPC} */ this.$jsonrpc

        const _this = this;

        return new Proxy({}, {

            /**
             * 
             * @param {JSONRPC} target 
             * @param {string} property 
             * @returns {Promise<function>}
             */
            get: (target, property) => {

                // Here, we are returning a function that when it gets called, the remote
                // object will receive the request to call the same function
                // The mechanism is to establish a message to be sent to the remote destination
                // Then keep a promise that will be fulfilled when the response comes back

                if (property === '$jsonrpc') {
                    return json_rpc.$rpc
                }

                if (property === 'then') {
                    // console.trace(`Not returning a function for the property 'then'. Then was probably requested by an async function.`)
                    return undefined
                }

                return new JSONRPCRemoteObject(property, json_rpc, { stack: creation_stack })
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
    constructor(methodName, json_rpc, { stack = '' } = {}) {

        /** @type {Function<Promise<any>> | Object<string, JSONRPCRemoteObject>} */
        let proxy = new Proxy(() => 1, {

            get: (target, property) => {
                return new JSONRPCRemoteObject(`${methodName}.${property}`, json_rpc, { stack: `${stack}\n${getCaller({ offset: 0 })}` })
            },
            set: (target, property, value) => {
                throw new Error(`For now, we cannot yet set a property on a remote object`)
            },

            apply: function (target, _this, args) {

                stack += new Error().toString().split('\n').slice(1,).join('\n');
                const creation_stack = '\n' + stack + '\n'

                return new Promise(async (ok, failed) => {
                    let id = crypto.randomUUID();
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


                    //What happens when the response has been given ?
                    json_rpc.manager.once(`resolve-${id}`, function (result) {
                        ok(result)
                    })


                    // And what happens if it has been rejected
                    json_rpc.manager.once(`reject-${id}`, function (error) {
                        if (error) {
                            switch (error.code) {
                                case -32601:
                                    {
                                        let exception = new Exception(`The remote method ${methodName.red} is not available!`, { code: 'error.system.unplanned' })
                                        exception.stack = `${exception.stack}\n${creation_stack}`;
                                        console.error(exception);
                                        failed(exception)
                                        break;
                                    }

                                default:
                                    {

                                        let exception = new Exception()
                                        exception.code = error.message.code
                                        exception.id = error.message.id
                                        exception.message = `${error.message.message}`
                                        exception.stack = (error.message.stack ? ` ${error.message.stack}\n-----------------\n` : '') + stack + `\n\t${`Call was made from ` + (Platform.get() instanceof FacultyPlatform ? Platform.get().descriptor.label : 'BasePlatform')}`;
                                        failed(exception)
                                        if(!error.message.code){
                                            console.error(exception)
                                        }
                                    }
                            }
                            return;
                        }
                        failed('unknown error')
                    })
                });
            }
        })

        return proxy;

    }

}


class JSONRPCManager extends EventEmitter {


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
     * @param {boolean} tolerance When a remote method is not found, this accept() method is called back later in the hopes that the method will be available later. It is called back with the tolerance parameter set to true, to prevent it from calling itself again.
     */
    async accept(object, tolerance) {

        //Determining if this is a return message, or a request
        if (object.method) {
            //Then its a call

            //Now, since we are dealing with nested properties, let's go down object by object
            let parts = object.method.split(/\./);
            let method = this.json_rpc.stub;
            let lastParts = []

            for (var part of parts) {
                //If the remote caller wants a method located at $rpc and $rpc is (luckily) not overridden by the value of stub...
                if (part === '$rpc' && lastParts.length === 0 && typeof method[part] !== 'function') {
                    method = this.json_rpc.$rpc
                } else {
                    method = method?.[part]
                }
                lastParts.push(method)
            }
            // We're doing this because, we want to maintain context (the value of this). For example, when calling animals.cat.meow(). We want meow to be bind to cat (the last part)
            const lastPart = lastParts.at(-2) || this.json_rpc.stub;

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
                    //Give it another try
                    if (!tolerance) {
                        console.log(`Calling back method ${object.method} again after 5s`)
                        return setTimeout(() => this.accept(object, true), 5000)
                    }
                    console.log(`Tried to call ${JSON.stringify(method)} as ${object.method}${`. Call was made in ` + (Platform.get() instanceof FacultyPlatform ? Platform.get().descriptor.label : 'the BasePlatform')}\nHere are stub methods\n`, this.json_rpc.stub)

                    //Temporal code
                    console.log(`internal methods\n`, FacultyPlatform.get().remote.internal)
                    // end temporal code

                    throw new Exception(`${object.method} is not a function.\n${`\tCall was made to ` + (Platform.get() instanceof FacultyPlatform ? Platform.get().descriptor.label : 'BasePlatform')}`, { code: `error.system.unplanned` })
                }


                let promise = method.apply(lastPart, args);

                //Now, wait for when

                let result = await promise ?? null;
                //If no issue
                this.json_rpc.transmission_manager.onOutput({
                    jsonrpc: '2.0',
                    id: object.id,
                    result,
                    src_method: object.method
                });


                //Now emit an event for the call done. This event is to be used internally
                this.emit(`resolve-${object.id}`, result)

            } catch (e) {

                if (typeof e === 'string') {
                    e = new Exception(`Auto generated by JSONRPCManager`, { code: e })
                }

                if ((typeof e !== 'string') && !(e instanceof Exception)) {
                    let { stack, message } = e;
                    e = new Exception("System Error", { code: 'error.system.unplanned' })
                    e.stack = this.json_rpc.flags.expose_stack_traces ? stack : e.stack;
                    let full_error = new Exception(message, { code: 'error.system.unplanned', stack: stack })
                    console.warn(`The method ${object.method?.blue} created the following error.\n\t--------------------\n`, full_error)
                }

                if (!this.json_rpc.flags.expose_stack_traces) {
                    e.stack = '';
                }

                this.json_rpc.transmission_manager.onOutput({
                    jsonrpc: '2.0',
                    id: object.id,
                    error: {
                        code: -32000,
                        message: { ...e, stack: this.json_rpc.flags.stripColors ? e.stack?.strip : e.stack, message: this.json_rpc.flags.stripColors ? e.message?.strip : e.message }
                    }
                });


                this.emit(`reject-${object.id}`, { ...e, stack: e.stack, message: e.message })
            }


            return;
        }


        //Well, but if its the returns of a method that was called
        if (typeof object.result != 'undefined') {
            this.emit(`resolve-${object.id}`, object.result)
        }

        if (typeof object.error != 'undefined') {
            this.emit(`reject-${object.id}`, object.error)
        }

        if (object.special?.action === 'CALL_ACK' || object.special?.action === 'RETURN_ACK') {
            this.emit(`${object.special.action}-${object.special.id}`)
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
                if (target.length > 64) {
                    target.shift();
                }
                return true;
            }

        })

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
                return //console.trace(`Double calling the ${object.method} method has been prevented`)
            } else {
                this.pendingCalls.push(object.id);
            }
        }

        this.json_rpc.manager.accept(object);

        let calls_removed = false;
        let cleanup = () => {
            if (!calls_removed) {
                this.pendingCalls.filter(call => call !== object.id)
                calls_removed = true;
            }
        }



        // So, if the incoming message was denoting the returns of a function
        if (typeof object.src_method !== 'undefined') {
            //Then we can send an ACK for the message return
            this.onOutput0({
                id: crypto.randomUUID(),
                special: {
                    action: 'RETURN_ACK',
                    id: object.id
                },
                jsonrpc: '2.0'
            })
            //We don't need to try re-sending this ACK because if no RETURN_ACK is received by the server, then it will re-send the return, and we will re-send an ACK
        }

        //Now, if it is a function call,
        if (typeof object.method !== 'undefined') {

            let resolve_time;

            //First thing, send an ACK if it takes more than 2s (Transmissionmanager.expectedMethodTimeLocal)
            new Promise((resolve, reject) => {
                const on_resolve = () => {
                    resolve();
                    cleanup();
                    resolve_time = performance.now()
                }
                //So if the function call is completed before timeout. Whether failed or resolved, complete the promise and abort sending the ACK packet
                this.json_rpc.manager.once(`resolve-${object.id}`, on_resolve)
                this.json_rpc.manager.once(`reject-${object.id}`, on_resolve)
                setTimeout(() => reject(`Dangerous method ${object.method.red}, it's taking too long`), TransmissionManager.expectedMethodTimeLocal);
            }).catch((e) => {

                //An error means there was a timeout, so therefore send an ACK first
                this.onOutput0({
                    id: crypto.randomUUID(),
                    jsonrpc: '2.0',
                    special: {
                        action: 'CALL_ACK',
                        id: object.id
                    }
                });

                // console.log(`Sending CALL_ACK because: `, e)
            }).finally(() => {
                cleanup()
            })
        } else {
            cleanup();
        }

    }

    /**
     * This method is called when the JSONRPCManager wants to send some data for transmission
     * @param {JSONRPCMessage} object 
     */
    onOutput(object) {


        //First things first, send the data
        this.onOutput0(object);

        //Now, if what we just sent was a function call, we should be receiving an ACK, a resolve, or a reject in less than 5s
        if (typeof object.method !== 'undefined') {
            new Promise((resolve, reject) => {
                let on_resolve = () => {
                    resolve()

                    //Proper memory management
                    //The reason is because, it takes only one event to call this method
                    //The one event will trigger clean up for itself
                    //What about the clean up for the other methods
                    this.json_rpc.manager.off(`resolve-${object.id}`, on_resolve)
                    this.json_rpc.manager.off(`reject-${object.id}`, on_resolve)
                    this.json_rpc.manager.off(`CALL_ACK-${object.id}`, on_resolve)

                }
                this.json_rpc.manager.once(`resolve-${object.id}`, on_resolve)
                this.json_rpc.manager.once(`reject-${object.id}`, on_resolve)
                this.json_rpc.manager.once(`CALL_ACK-${object.id}`, on_resolve)
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

        const resend = () => {
            //TODO: Make resending more efficient
            this.onOutput0(object);
        }

    }

    static get expectedMethodTimeLocal() {
        return 500;
    }

    static get expectedMethodTimeRemote() {
        return 2000;
    }

}


class JSONRPCDefaultStub {

    constructor(json_rpc) {
        this.events = new JSONRPCEventsStub(json_rpc)
    }

}

const json_rpc_symbol = Symbol(`JSONRPCEventsStub.json_rpc`)

class JSONRPCEventsStub extends WildcardEventEmitter {

    /**
     * 
     * @param {JSONRPC} json_rpc 
     */
    constructor(json_rpc) {
        super();
        /** @type {JSONRPC} */
        this[json_rpc_symbol] = json_rpc

    }
    emit(rpc, type, ...data) {
        if (typeof rpc === 'string') { //If called locally
            type = arguments[0]
            data = Array.prototype.slice.call(arguments, 1)
            super.emit(type, ...data);
            this[json_rpc_symbol].remote.$rpc.events.emit(type, ...data);
        } else {
            super.emit(`$remote-event`, type, ...data)
        }

        // console.trace(arguments);
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