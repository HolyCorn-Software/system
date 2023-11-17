
import { FacultyPlatform } from '../../lib/libFaculty/platform.mjs'

/*
Copyright 2021 HolyCorn Software
This component is simply for the purpose of nursing new faculties
It therefore provides a rich environment for running the actual script
*/
import colors from 'colors'
import { logLineNumbers } from '../../lib/libFaculty/nursery-utils.mjs'
import FacultyStaticHTTPManager from '../../lib/libFaculty/http/static.mjs'
import { FacultyPublicRPCServer } from '../../comm/rpc/faculty-public-rpc.mjs'
import worker_threads from 'node:worker_threads'
import nodeUtil from 'node:util'
import { WildcardEventEmitter } from '../../comm/utils/wildcard-events.mjs'

colors.enable()

//console.log(`nusery called with the following params: `, process.argv);

//Basically, we just want the script to start

/**
 * argv looks like this:
 * 0 --> node
 * 1 --> nursery.js
 * 2 --> <path to new faculty>
 */

let startNursery = async () => {


    let descriptor
    try {

        /** @type {import('./faculty.global.js').SoulArgs} */
        const soulArgs = worker_threads.workerData.soulArgs
        descriptor = soulArgs.descriptor

        process.stdout.columns = soulArgs.columns

        //Prevent unexpected errors from crashing the server
        process.addListener('unhandledRejection', (reason, promise) => {
            console.log(`An unhandled rejection\n`, reason, `\n`, nodeUtil.inspect(promise, { colors: true, depth: null, compact: false }))
        })
        process.addListener('uncaughtException', (err, origin) => {
            console.log(`Uncaught Error\n`, err, `\nFrom`, origin)
        })

        //Initialize the platform upon which the faculty will run
        const faculty = await FacultyPlatform.create({
            descriptor,
            server_domains: soulArgs.server_domains
        }) //After this, we can use FacultyPlatform.get()

        console.log(`Nursery started faculty ${descriptor.label.blue}`)

        logLineNumbers.status = true;


        //Now, actually start the new faculty
        const modul = await import(descriptor.init);

        if (modul.init) {
            console.warn(`Exporting a function called 'init' is deprecated.\nJust export a default function.\nMake corrections to ${descriptor.init.blue}`)
        }

        const init = modul.default || modul.init


        //Now, should in case the connection with the base disconnects, automatically quit the Faculty

        const httpServer = await HTTPServer.new(true)

        //Let's provide managed access to publicly available rpc methods of this faculty
        await new FacultyPublicRPCServer(httpServer).claimRemotePoint()

        await init();

        /**
         * This method checks if the base platform was ready before this faculty started, and goes ahead to dispatch the platform-ready event,
         * for components that depend on it.
         * 
         */
        async function processReadyEvent() {
            try {
                if (!await faculty.base.channel.remote.isReady()) {
                    return
                }
            } catch { }
            setTimeout(() => WildcardEventEmitter.prototype.emit.apply(faculty.connectionManager.events, ['platform-ready']), 2000)
        }

        processReadyEvent()

        //Our faculty is up and running.
        //Let's setup routing of static files
        const staticMan = new FacultyStaticHTTPManager()
        await staticMan.init()

        httpServer.isHalted = false

        //Now, let's handle the idea of plugin load
        await faculty.pluginManager.init()

    } catch (e) {
        console.log(`
    ${'Nursery could not start faculty !!!'.red}
    ${(descriptor?.label || descriptor?.name)?.blue}
--------------------------------------------
        ${e.stack || e.message || e || 'Unknown Error !'}
            `)
        //We can do this safely stop this instance of node. At least, it won't affect the base platform
    }



}

startNursery()