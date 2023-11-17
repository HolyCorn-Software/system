/*
Copyright 2021 HolyCorn Software
This class provides means of connecting to remote faculties, as well as re-using previous connections
*/
import { WildcardEventEmitter } from '../../comm/utils/wildcard-events.mjs';
import { FacultyFacultyRPCClient, FacultyFacultyRPCServer, FacultyFacultyInterface } from "../../comm/rpc/faculty-faculty-rpc.mjs";
import { callWithRetries } from "../../util/util.js";


const connections_symbol = Symbol(`FacultyConnectionManager.prototype.connections`)
const pending_connections_symbol = Symbol(`FacultyConnectionManager.prototype.pending_connections`)
const faculty_platform_symbol = Symbol(`FacultyConnectionManager.prototype.faculty_platform`)

const faculty_faculty_rpc_symbol = Symbol(`FacultyConnectionManager.prototype.faculty_faculty_rpc`)

export class FacultyConnectionManager {


    /**
     * 
     * @param {import('./platform.mjs').FacultyPlatform} faculty_platform
     */
    constructor(faculty_platform) {
        this[faculty_platform_symbol] = faculty_platform;


        /**
         * @type {FacultyFacultyInterface[]}
         */
        this[connections_symbol] = []


        // Implement custom event emitter that extends wildcard
        this.events = new ConnectionManagerEventEmitter(this)


        /** @type {string} This is created to prevent duplicate connections that sometimes lead to hanging sockets*/
        this[pending_connections_symbol] = []


        /** @type {string} */ this.mainSocketPath
        Reflect.defineProperty(this, 'mainSocketPath', {
            get: () => `${this[faculty_platform_symbol].descriptor.path}/socket`,
            enumerable: true,
            configurable: true
        })

    }
    set rpcServer(rpc) {
        rpc.on('connect', (_interface) => {
            this.addConnection(_interface);
        })
        this[faculty_faculty_rpc_symbol] = rpc
    }
    /**
     * @returns {FacultyFacultyRPCServer}
     */
    get rpcServer() {
        return this[faculty_faculty_rpc_symbol]
    }

    addConnection(connection) {

        if (!(connection instanceof FacultyFacultyInterface)) {
            console.trace(`Attempting to add an invalid object as a connection`, connection)
            throw new Error(`This method is used to store connections with other faculties. Please pass an instance of a FacultyFacultyInterface`)
        }

        if (this[connections_symbol].some(
            x => x.descriptor.name == connection.descriptor.name
        )) {
            this[connections_symbol] = this[connections_symbol].filter(x => x.descriptor.name !== connection.descriptor.name)
        }

        this[connections_symbol].push(connection);

        //Now, if this connection fires an event, let the FacultyConnectionManager.prototype.events know
        connection.rpc.$rpc.events.addEventListener('$remote-event', ({ detail: { type, data } }) => {
            //Call a direct emit() so as to prevent recursion
            WildcardEventEmitter.prototype.emit.apply(this.events, [type, ...(data || [])])
        })

    }

    /**
     * This interface allows easier typed access to faculties
     * 
     * @returns {FacultyConnectionOverload}
     */
    get overload() {
        return new Proxy({}, {
            get: (target, str) => async () => (await this.connect(str)).remote
        })
    }

    /**
     * This method is used to connect to a remote faculty
     * @param {keyof faculty.faculties} name 
     * @returns {Promise<FacultyFacultyInterface>}
     */
    async connect(name) {

        if (this[pending_connections_symbol].some(x => x === name)) {
            //Then wait till the connection is over
            await new Promise(x => {
                const interval = setInterval(() => {
                    if (!this[pending_connections_symbol].some(x => x === name)) {
                        clearInterval(interval);
                        x();
                    }
                }, 10)
            })
        }

        let existing = this[connections_symbol].filter(x => x.rpc.meta.remoteDescriptor.name == name)[0];

        if (existing) {
            return existing;
        }

        this[pending_connections_symbol].push(name);

        try {
            let credentials;

            let getCredentials = async () => {
                credentials = await FacultyPlatform.get().base.channel.remote.getFacultyRPCInfo(name)

                if (credentials === null) {
                    throw new Error(`Credentials not found for faculty '${name}'. Perhaps faculty has not yet registered at BasePlatform`)
                }
            }

            await callWithRetries(getCredentials, {
                label: `Getting connection details for the faculty '${name}'`,
                callInterval: 100,
                maxTries: 5,
                timeout: 6000 //Normally, the BasePlatform times out searching for credentials at 5000ms. So waiting at 6000ms is okay
            })


            //console.log(`Connection credentials `, credentials)
            // Might throw an exception for faculty not found

            /*
             * credentials is something like
             * {
             * 
             *     "local":"/mnt/Data/Projects/HCTS/code/node/faculty/users/socket",
             *     "remote":{
             *          "host":"10.15.90.218",
             *          "port":"5498"
             *      }
             * }
             * 
             * Note that local is preferred to remote
             */



            const conn = async () => {
                return await FacultyFacultyRPCClient.connect(credentials)
            }

            let _interface = await callWithRetries(conn, { label: `Actual connection from ${this[faculty_platform_symbol].descriptor.label} to ${credentials.local}`, callInterval: 500, maxTries: 15, timeout: 5000 })
            this.addConnection(_interface);
            this[pending_connections_symbol] = this[pending_connections_symbol].filter(x => x !== name)
            return _interface
        } catch (e) {
            this[pending_connections_symbol] = this[pending_connections_symbol].filter(x => x !== name)
            throw e
        }



    }



    /**
     * 
     * @param {FacultyPlatform} faculty_platform 
     */
    static async new(faculty_platform) {
        let connection_man = new this(faculty_platform)
        let f_f_rpc = await FacultyFacultyRPCServer.new(connection_man)
        connection_man.rpcServer = f_f_rpc;

        // When the base sends an event, dispatch it here
        faculty_platform.base.channel.rpc.$rpc.events.addEventListener('$remote-event', (event) => {
            const { type, data } = event.detail
            WildcardEventEmitter.prototype.emit.apply(connection_man.events, [type, ...(data || [])])
        })

        return connection_man
    }

}


const faculty_connection_manager_symbol = Symbol(`ConnectionManageEventEmitter.prototype.faculty_connection_manager`)
/**
 * @extends faculty.FacultyConnectionManagerEventEmitter
 */
export class ConnectionManagerEventEmitter extends WildcardEventEmitter {
    constructor(faculty_connection_manager) {
        super()
        /** @type {FacultyConnectionManager} */
        this[faculty_connection_manager_symbol] = faculty_connection_manager;
    }


    async emit(type, ...data) {
        for (let connection of this[faculty_connection_manager_symbol][connections_symbol]) {
            setImmediate(() => connection.rpc.$rpc.events.dispatchEvent(new CustomEvent(type, { detail: data }))); //For some reason, if we don't wait, not all faculties get the event
        }
        // After dispatching the event to the fellow faculties, dispatch to the BasePlatform
        this[faculty_connection_manager_symbol][faculty_platform_symbol].base.channel.rpc.$rpc.events.dispatchEvent(
            new CustomEvent(type, { detail: data })
        )
        super.emit(type, ...data)
    }
}