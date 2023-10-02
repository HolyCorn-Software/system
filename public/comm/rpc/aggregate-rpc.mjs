
/*
Copyright 2021 HolyCorn Software
This module sits in the front end providing an easy-to-use rpc interface with all faculties

*/

import CookieManager from '../../html-hc/lib/cookies/manager.mjs';
import GrowRetry from '../../html-hc/lib/retry/retry.mjs';
import DelayedAction from '../../html-hc/lib/util/delayed-action/action.mjs';
import ClientJSONRPC from './websocket-rpc.mjs';


//Retrieve the list of faculties with public methods

const established_connections = Symbol('get [connections]');
let pending_connections_symbol = Symbol(`Pending connnections for AggregateRPCProxy`)

/**
 * @extends rpc.HcAggregateRPC
 */
export class AggregateRPCProxy extends Object {

    constructor() {

        super()

        this[pending_connections_symbol] = {}

        /** @type {Object<string, Object<string, function():Promise>} */
        this[established_connections] = {}


        return new Proxy(this, {
            get: (target, property, receiver) => {

                if (typeof target[property] !== 'undefined') {
                    return target[property]
                }
                if (property === 'then') {
                    return undefined;
                }

                return new RemoteFacultyRPCObject({ name: property }, this)
            },
            set: (target, property, value, receiver) => {
                // Initially, we're getting an rpc connection to a faculty
                // That RPC connection will later serve as a portal for calling remote methods
                throw new Error("Can't set anything")
            }
        })

    }



}

//Continue down the chain till a method is called
//When a method is called, that's when the connection is established
//The established connection is stored back at the main object for subsequent use
//If a sub attribute is requested, it returns another RemoteFacultyRPCObject which can be called as a method, or recursively traverserved till a method is called

class RemoteFacultyRPCObject {

    /**
     * 
     * @param {object} param0 
     * @param {string} param0.name
     * @param {string} param0.path
     * @param {AggregateRPCProxy} aggregate 
     * @returns 
     */
    constructor({ name, path }, aggregate) {

        return new Proxy(() => 1, {
            get: (target, property) => {
                if (property === 'then') {
                    return undefined;
                }
                if (!path && property === '$jsonrpc') {
                    return aggregate[established_connections][name]
                }
                return new RemoteFacultyRPCObject({ name, path: !path ? property : `${path}.${property}` }, aggregate)
            },
            apply: (target, thisArg, argArray) => {


                const stack = new Error().stack.split('\n').slice(1).join('\n')

                return new Promise(async (fxn_done, fxn_failed) => {


                    /** @type {import('./types.js').Connection}*/
                    let connection = aggregate[established_connections][name]

                    const call_method = async () => {
                        if (!path) {
                            throw new Error('Cannot call root object as a method.')
                        }
                        //By now, a connection must have been retrieved or established
                        //So, we call the remote method
                        try {
                            fxn_done(await connection?.remote[path](...argArray));
                        } catch (e) {
                            e.stack = `${e.message || (e.stack.split('\n').slice(0, 2).join('\n'))}\n${stack}`;
                            fxn_failed(e);
                        }
                    }

                    //There are two possibilities, either there's no previous connection to the target where we intend to call the method
                    //Or there's already a connection

                    //So if there's a connection
                    if (connection) {
                        return call_method()
                    }

                    /**
                     * ==========================================================================================================================
                     * Throughout this section the action of connecting will refer to both establishing a connection and authenticating a session
                     * ==========================================================================================================================
                     */


                    /**
                     * 
                     * When a connection to an rpc endpoint is done, this method is used to store a reference to that connection
                     * @param {import('./types.js').Connection} connection
                    */
                    const store_connection = (connection) => {
                        let connection_name = name;
                        aggregate[established_connections][connection_name] = connection;
                    }


                    /* This method creates a new connection and avoids duplicate connections */
                    const establish_new_connection = async () => {

                        //This method will establish and store a completely new connection
                        const fresh_connect = async () => {

                            await (aggregate[pending_connections_symbol][name] = (async () => {
                                try {
                                    let url_point = name === 'system' ? `/$/system/rpc` : `/$/rpc/${name}`
                                    if (!url_point) {
                                        throw new Error(`We made a request to the server but it could not complete because the feature ('${name}') we requested was non-existent`)
                                    }
                                    connection = await connect_and_auth(url_point)
                                    //And when we're done connecting, we store the connection
                                    store_connection(connection)
                                    //And then we call the method
                                    if (!connection) {
                                        console.log(`How could this be ?`)
                                    }
                                    call_method()
                                    return connection
                                } catch (e) {
                                    // A problem with connection, and authentication.
                                    // In that case, let's check the cache
                                    try {
                                        const cachedData = await localStorageCache.get(path, argArray)
                                        if (cachedData) {
                                            return fxn_done(cachedData.value)
                                        }
                                    } catch { }
                                    fxn_failed(e)
                                    throw e;
                                }
                            })());

                            delete aggregate[pending_connections_symbol][name];
                        }

                        //When establishing a new connection, let's be careful not to have duplicates
                        //So we check for pending connections

                        if (aggregate[pending_connections_symbol][name]) {
                            //And if there's a pending connection
                            try {
                                //Wait for it to finish
                                connection = await aggregate[pending_connections_symbol][name]
                                //And if successful, then we're done
                                store_connection(connection);
                                return call_method()
                            } catch {
                                //But if the previous attempt failed, we'll try connecting anew
                                return await fresh_connect();
                            }
                        }

                        //So if this is the first attempt to call a remote method (no previous connections)
                        return await fresh_connect()

                    }

                    await establish_new_connection()


                })
            }
        })

    }

}


/**
 * This method connects to an rpc endpoint, and does authentication
 * It also places listeners to automatically handle loss of connection
 * @param {string} url 
 * @returns {Promise<import('./types.js').Connection>}
 */
const connect_and_auth = async (url) => {


    const client = await ClientJSONRPC.connect(url, localStorageCache);
    let connection = client.remote;
    connection.rpc = client;

    //Now if a disconnection happens, we replace the connection, and then re-authenticate
    client.addEventListener('reconnect', () => {
        //When reconnecting, re-authenticate with the session
        session_auth(connection).then(() => {
            client.dispatchEvent(new CustomEvent('reinit'))
        }).catch(e => {
            //If during reconnection, we could not authenticate, we destroy the connection and let a new one form organically
            client.socket?.close()
            setTimeout(() => client.reconnect(), 8000);
        })

    });

    //Now start a session
    try {
        await new GrowRetry(() => session_auth(connection), { maxTries: 5, startTime: 15, factor: 2 }).execute();
    } catch (e) {
        console.log(`Session error `, e)
        throw new Error(`Failed to start a new session with server at ${url}`, { cause: e })
    }

    return client
}

/** @type {Promise<void>} */
let pending_session_auth_promise;

let SESSION_COOKIE_NAME = 'hcSession' // For now let's not even ask for the name


/**
 * 
 * @param {import('system/comm/rpc/faculty-public-methods.mjs').FacultyPublicMethods} connection 
 */
const session_auth = async (connection) => {


    if (pending_session_auth_promise) {
        //If another caller called the session_auth() method, wait for it to finish, or for 3 ms, which ever comes first. This is to reduce collisions
        try {

            await Promise.race(
                [
                    await new Promise(x => setTimeout(x, 3)),
                    await pending_session_auth_promise
                ]
            );
        } catch { }
    }

    let auth_timeout_key;

    //Here we are making a connection to the server, but on the condition that it completes before 5s
    pending_session_auth_promise = Promise.race(
        [
            //The actual act of connecting
            new Promise(async (done) => {

                let cookieManager = new CookieManager();
                // For now, let's not ask for the cookie name. Let's hard-code the default value
                // SESSION_COOKIE_NAME ||= await connection.$session.getSessionCookieName();


                let auth = await connection.$session.sessionAuth({
                    cookie: cookieManager.getCookie(SESSION_COOKIE_NAME)
                });

                cookieManager.setCookie(auth.cookieName, auth.cookieValue, { expires: auth.expires });

                pending_session_auth_promise = undefined;

                clearTimeout(auth_timeout_key)
                done(auth.cookieValue)
            }),

            //A timeout for the connection (9s)
            new Promise((ok, reject) => {
                auth_timeout_key = setTimeout(() => reject(new Error('Timeout connecting to server')), 9000)
            })
        ]
    )

    return await pending_session_auth_promise;
}



const data = Symbol()
const update = Symbol()

const eq = (a, b) => JSON.stringify(a) == JSON.stringify(b)

class LocalStorageCache {

    constructor() {

        /** @type {import("./types.js").LocalStorageJSONRPCCacheStorage} */
        this[data] = {};

        try {
            this[data] = JSON.parse(localStorage.getItem('jsonrpc-cache')) || {}
        } catch {
            localStorage.removeItem('jsonrpc-cache')
        }

    }

    /** @type {import("./json-rpc/types.js").JSONRPCCache['set']} */
    set(method, params, value, expiry) {

        this[data][method] ||= [];

        this[data][method] = this[data][method].filter(x => !eq(x.params, params))
        this[data][method].push(
            {
                expiry,
                params,
                value
            }
        );

        this[update]();
    }

    [update] = new DelayedAction(() => {
        localStorage.setItem('jsonrpc-cache', JSON.stringify(this[data]))
    }, 250, 3000);

    /** @type {import("./json-rpc/types.js").JSONRPCCache['get']} */
    get(method, params) {
        return this[data][method]?.find(x => eq(x.params, params))
    }

}


let localStorageCache = new LocalStorageCache()


let hcRpc = window.hcRpc = new AggregateRPCProxy();

export default hcRpc;