
/*
Copyright 2021 HolyCorn Software
This module sits in the front end providing an easy-to-use rpc interface with all faculties

*/

import CookieManager from '../../html-hc/lib/cookies/manager.mjs';
import GrowRetry from '../../html-hc/lib/retry/retry.mjs';
import DelayedAction from '../../html-hc/lib/util/delayed-action/action.mjs';
import ClientPublicMethods, { SESSION_COOKIE_NAME } from './stub.mjs';
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

                                    return connection
                                } catch (e) {
                                    // A problem with connection, and authentication.
                                    // In that case, let's check the cache
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
                                return
                            } catch { }
                        }

                        //So if this is the first attempt to call a remote method (no previous connections)
                        return await fresh_connect()

                    }

                    let cacheEntry;
                    try {
                        cacheEntry = await localStorageCache.get(path, argArray);
                        if (cacheEntry?.expiry >= Date.now()) {
                            return fxn_done(cacheEntry.value)
                        }
                    } catch (e) {
                        console.warn(`Problem with the cache!\n`, e)
                    }

                    // The runtime reaches this part of code, either if there was nothing in the cache, or the entry expired.
                    establish_new_connection().then(() => call_method()).catch(async (error) => {
                        if (cacheEntry) {
                            fxn_done(cacheEntry.value)
                        } else {
                            fxn_failed(error)
                        }
                    });


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
            setTimeout(() => client.reconnect().catch((e) => console.log(`Reconnection Error!!`, e)), 2000);
        })

    });

    //Now start a session
    try {
        // We provide the server with methods that can be called anytime
        client.flags.first_arguments = []
        client.stub = new ClientPublicMethods()
        await new GrowRetry(() => session_auth(connection), { maxTries: 50, startTime: 15, factor: 5, maxTime: 3000 }).execute();
    } catch (e) {
        console.log(`Session error `, e)
        throw new Error(`Failed to start a new session with server at ${url}`, { cause: e })
    }

    return client
}

/** @type {Promise<void>} */
let pending_session_auth_promise;
AggregateRPCProxy.session_auth_done = false;

const getLastSessionAuth = () => new Number(localStorage.getItem('hc-last-session-auth') ?? '0').valueOf()
const updateLastSessionAuth = () => localStorage.setItem('hc-last-session-auth', Date.now())


/**
 * 
 * @param {import('system/comm/rpc/faculty-public-methods.mjs').FacultyPublicMethods} connection 
 */
const session_auth = async (connection) => {

    if (AggregateRPCProxy.session_auth_done) {
        return true;
    }

    let cookieManager = new CookieManager();
    const cookie = cookieManager.getCookie(SESSION_COOKIE_NAME);

    try {
        if (((Date.now() - getLastSessionAuth()) < 30 * 60_000) && (typeof cookie) !== 'undefined') {
            // If the last time session authentication was done, is less than 30mins ago, then we skip it.
            return AggregateRPCProxy.session_auth_done = true
        }
    } catch (e) {
        console.warn(e)
    }


    if (pending_session_auth_promise) {
        //If another caller called the session_auth() method, wait for it to finish, or for 500ms, which ever comes first. This is to reduce collisions
        try {

            await Promise.race(
                [
                    await new Promise(x => setTimeout(x, 500)),
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


                let auth = await connection.$session.sessionAuth({
                    cookie
                });

                cookieManager.setCookie(SESSION_COOKIE_NAME, auth.cookieValue || cookie, { expires: auth.expires });

                pending_session_auth_promise = undefined;

                clearTimeout(auth_timeout_key)
                done(auth.cookieValue)
                AggregateRPCProxy.session_auth_done = true
                updateLastSessionAuth()
            }),

            //A timeout for the connection (9s)
            new Promise((ok, reject) => {
                const error = new Error('Timeout connecting to server');
                error.accidental = true
                auth_timeout_key = setTimeout(() => reject(error), 9000)
            })
        ]
    )

    return await pending_session_auth_promise;
}



const data = Symbol()
const update = Symbol()
const directUpdate = Symbol()
const update0 = Symbol()
const dirty = Symbol()

const eq = (a, b) => JSON.stringify(a) == JSON.stringify(b)

class LocalStorageCache {

    constructor() {

        /** @type {import("./types.js").LocalStorageJSONRPCCacheStorage} */
        this[data] = {};

        try {
            this[data] = JSON.parse(localStorage.getItem('jsonrpc-cache')) || {}
        } catch {
            // In case the cache data is corrupt
            localStorage.removeItem('jsonrpc-cache')
        }

        // And now, whenever we're dealing with a modern version of the server...
        window.addEventListener('server-version-change', ({ detail }) => {
            this.erase()
        })


        window.addEventListener('beforeunload', () => {
            if (this[dirty]) {
                this[directUpdate]()
            }
        })

    }

    /** @type {import("./json-rpc/types.js").JSONRPCCache['set']} */
    set(method, params, value, expiry, tag) {

        this[data][method] ||= [];

        this[data][method] = this[data][method].filter(x => !eq(x.params, params))
        this[data][method].push(
            JSON.parse(
                JSON.stringify(
                    {
                        expiry,
                        params,
                        value,
                        tag
                    }
                )
            )
        );

        this[update]();
    }

    [directUpdate] = () => {
        localStorage.setItem('jsonrpc-cache', JSON.stringify(this[data]))
        this[dirty] = false;
    }

    [update0] = new DelayedAction(this[directUpdate], 250, 3000); // If the delay is too much, then the user could navigate from one page to another with unsaved data, 
    [update] = () => {
        this[dirty] = true;
        this[update0]()
    }

    /** @type {import("./json-rpc/types.js").JSONRPCCache['get']} */
    get(method, params) {
        const item = this[data][method]?.find(x => eq(x.params, params))
        return item ? JSON.parse(JSON.stringify(item)) : item
    }

    /** @type {import('./json-rpc/types.js').JSONRPCCache['rm']} */
    rm(tags) {
        for (const item in this[data]) {
            const nwItems = []
            mainLoop:
            for (const entry of this[data][item]) {
                for (const tag of tags) {
                    // Keep a piece of data, if it doesn't match a tag in the list of tags being removed
                    if (!entry.tag || !(((tag instanceof RegExp) && tag.test(entry.tag)) || tag == entry.tag)) {
                        nwItems.push(entry)
                        continue mainLoop
                    }
                }
            }
            this[data][item] = nwItems
        }
        this[update]()
    }

    erase() {
        this[data] = {}
        this[update]()
    }

}


let localStorageCache = new LocalStorageCache()


let hcRpc = window.hcRpc = new AggregateRPCProxy();

export default hcRpc;