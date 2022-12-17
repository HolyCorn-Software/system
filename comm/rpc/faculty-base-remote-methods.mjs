/*
Copyright 2021 HolyCorn Software
This module creates an interface for remote clients (faculties) to call methods on the BasePlatform

*/

import fs from 'fs'
import LanguageInternalMethods from '../../base/lang/terminals/internal.mjs';
import BasePluginAPIMethods from '../../base/plugin/terminal.mjs';
import FacultyManagementRemote from '../../lib/libFaculty/management/manager.mjs';

/**
 * @typedef BasePlatform
 * @property {object} BasePlatform.http
 * @property {function({rpcPort:Number, localPath:string, remotePath:string, remotePort:Number})} BasePlatform.http.course
 * @property {BasePlatformFacultiesAPI} BasePlatform.faculties
 */

const basePlatform = Symbol()

export class BaseToFacultyRemoteMethods {
    //Now define methods that will be available to all clients connecting to the base platform

    /**
     * 
     * @param {import('../../base/platform.mjs').BasePlatform} platform 
     */
    constructor(platform) {

        /**@type {import('../../base/platform.mjs').BasePlatform} */

        this[basePlatform] = platform





        /** @type {typeof platform.faculty_http_api} */ this.http


        this.errors = new BaseToFacultyErrorAPIMethods(this[basePlatform])

        this.lang = new LanguageInternalMethods()
        this.plugin = new BasePluginAPIMethods()

    }


    /**
     * @deprecated
     * Use errors.errorMap() insteads
     * @returns {Promise<import('system/errors/handler.mjs').ErrorMapV2>}
     */
    errorMap() {
        console.warn(`basePlatform.errorMap() is deprecated. Use basePlatform.errors.getMap() instead`)
        return platform.errors.map
    }


    /**
     * This method is used by the client to route over requests
     * @deprecated
     * @param {{localPath:string, remotePath:string, remotePort:Number}} param0
     */
    courseHTTP(faculty, { serverPath, clientPath, clientPort } = {}) {
        console.warn(`The BaseToFacultyRemoteMethods.courseHTTP() method is deprecated. Use BaseToFacultyRemoteMethods.http.course()`)
        platform.faculty_http_api.course(faculty, { remotePort: clientPort, localPath: serverPath, remotePath: clientPath })
    }


    get http() {
        return this[basePlatform].faculty_http_api
    }


    /**
     * The FacultyPlatform calls this to get credentials to connect to another faculty platform
     * @param {string} name name of the faculty
     */
    async getFacultyRPCInfo(calling_faculty, name) {
        let faculty = this[basePlatform].faculties.findByName(name)
        if (!faculty) {
            throw new Error(`There's no faculty called ${name}. Make sure you are using the name, not the label\nCurrently remote faculties are not supported`)
        }


        let details
        const timeout = 5000; //The maximum time to get connection credentials

        // continuously check for the connection details 
        await Promise.race([
            new Promise(resolve => {
                const done = () => {
                    resolve();
                }

                const interval = setInterval(() => {
                    if (fs.existsSync(`${faculty.descriptor.path}/socket`) && faculty.flags.networkEnabled) {
                        details = {
                            local: `${faculty.descriptor.path}/socket`
                        }
                        clearInterval(interval);
                        setTimeout(() => done(), 100);
                    }
                }, 10)
            }),
            new Promise(resolve => setTimeout(resolve, timeout))
        ])


        return details;
    }

    exit() {
        this[basePlatform].exit()
    }




    serverHello() {
        return 'Hi !';
    }

    /**
     * Called by clients who want to get a list of faculties of the platform
     */
    faculties() {
        return this[basePlatform].faculties.members.map(x => x.name);
    }

    /**
     * 
     * @returns 
     */
    getDatabaseCredentials() {
        return this[basePlatform].database.credentials
    }

    /**
     * Faculties use this to report unhandled errors that have led to a crash (shutdown)
     * @param {Error} error 
     */
    async reportUnexpectedCrash(error) {
        let faculty = arguments[0]
        error = arguments[1]
        console.log(`\n\n\t${faculty.descriptor.label} has crashed unexpectedly\n`)
    }

    /**
     * This method is called by remote faculties to tell other faculties if they can or can't connect to the faculty at that moment.
     * Note that this method doesn't affect faculties that have already connected.
     * @param {boolean} state 
     */
    setNetworkingEnabled = async function (state) {
        state = arguments[1]
        const faculty = arguments[0];

        let localFaculty = this[basePlatform].faculties.findByName(faculty.descriptor.name)

        localFaculty.flags.networkEnabled = state;

    }.bind(this)





}



class BaseToFacultyErrorAPIMethods {

    /**
     * 
     * @param {import('../../base/platform.mjs').BasePlatform} base 
     */
    constructor(base) {
        this[basePlatform] = base
    }
    /**
     * This method returns error information for the system
     * @returns {Promise<import('system/errors/handler.mjs').ErrorMapV2>}
     */
    getMap() {
        return this[basePlatform].errors.map
    }

    /**
     * Use this method to add error information to the entire system at runtime
     * @param  {import('system/errors/handler.mjs').ErrorMapV2} args 
     * @returns {Promise<void>}
     */
    setCustomErrors(callerFaculty, errors) {
        return this[basePlatform].errors.setCustomErrors(errors);
    }


}



/**
 * This class represents the methods that are availabe to the BasePlatform, that come from the FacultyPlatform
 * This class is constructed by the FacultyPlatform, and used by the BasePlatform
 */
export class FacultyToBaseRemoteMethods {

    /**
     * 
     * @param {import('../../lib/libFaculty/platform.mjs').FacultyPlatform} faculty_platform 
     */
    constructor(faculty_platform) {

        /** @type {object} */ this.internal
        /** @type {object} */ this.public
        /** @type {FacultyManagementRemote} */ this.management

        for (let source of ['internal', 'public', 'management']) {
            Reflect.defineProperty(this, source, {
                get: () => (faculty_platform || FacultyPlatform.get()).remote[source],
                configurable: true,
                enumerable: true,
                set: () => {
                    throw new Error(`Nope! You can't set ${source}.`)
                }
            })
        }


    }

}

const pluginRemote = Symbol()