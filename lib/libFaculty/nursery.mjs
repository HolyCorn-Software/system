
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

        const soulArgs = worker_threads.workerData.soulArgs
        descriptor = soulArgs.descriptor

        //Prevent unexpected errors from crashing the server
        process.addListener('unhandledRejection', (reason) => {
            console.log(`An unhandled rejection\n`, reason)
        })
        process.addListener('uncaughtException', (err, origin) => {
            console.log(`Uncaught Error\n`, err, `\nFrom `, origin)
        })

        //Initialize the platform upon which the faculty will run
        const faculty = await FacultyPlatform.create({
            descriptor,
            server_domains: soulArgs.server_domains
        }) //After this, we can use FacultyPlatform.get()

        console.log(`Nursery started faculty ${descriptor.label.blue}`)

        logLineNumbers.status = true;

        await new Promise(x => setTimeout(x, 100))


        //Now, actually start the new faculty
        const modul = await import(descriptor.init);

        if (modul.init) {
            console.warn(`Exporting a function called 'init' is deprecated.\nJust export a default function.\nMake corrections to ${descriptor.init.blue}`)
        }

        const init = modul.default || modul.init


        //Now, should in case the connection with the base disconnects, automatically quit the Faculty

        const httpServer = await HTTPServer.new()
        httpServer.isHalted = true
        //Let's provide managed access to publicly available rpc methods of this faculty
        await new FacultyPublicRPCServer(httpServer).claimRemotePoint()

        await init();

        //Our faculty is up and running.
        //Let's setup routing of static files
        const staticMan = new FacultyStaticHTTPManager()
        await staticMan.init()

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