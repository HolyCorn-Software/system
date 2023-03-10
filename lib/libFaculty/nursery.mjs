import { FacultyDescriptor } from './faculty-descriptor.mjs'
import { FacultyPlatform } from './platform.mjs'

/*
Copyright 2021 HolyCorn Software
This component is simply for the purpose of nursing new faculties
It therefore provides a rich environment for running the actual script
*/
import colors from 'colors'
import { logLineNumbers } from './nursery-utils.mjs'
import FacultyStaticHTTPManager from './http/static.mjs'
import { FacultyPublicRPCServer } from '../../comm/rpc/faculty-public-rpc.mjs'

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
        const args = JSON.parse(process.env.args)

        Object.assign(process.env, JSON.parse(args.env))

        descriptor = new FacultyDescriptor(process.env.path)




        //Prevent unexpected errors from crashing the server
        process.on('unhandledRejection', (e, origin) => {
            console.error(`\n\n\t${descriptor.label.bold} has an unhandled rejection! \n`, e, `\n`, origin)
        });

        process.on('uncaughtException', (e, origin) => {
            console.error(`\n\n\t${descriptor.label.bold} has an unhandled exception! \n`, e, `\n`, origin)
        });

        //Initialize the platform upon which the faculty will run
        const faculty = await FacultyPlatform.create({
            descriptor,
            server_domains: args.server_domains
        }) //After this, we can use FacultyPlatform.get()
        faculty.base.channel.remote.setNetworkingEnabled(false); //For now, turn off inter-faculty RPC, till the faculty has started


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

        process.on('disconnect', () => {
            console.log(`Exiting ${descriptor.label.bold} ${'because connection was lost'.red}`.red)
            setImmediate(() => process.exit());
        })

        //Let's provide managed access to publicly available rpc methods of this faculty
        await new FacultyPublicRPCServer(await HTTPServer.new()).claimRemotePoint()

        faculty.base.channel.remote.setNetworkingEnabled(true)
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
    ${descriptor.label.blue}
--------------------------------------------
    ${e.stack || e.message || e || 'Unknown Error !'}
    `)
        process.exit(); //We can do this safely stop this instance of node. At least, it won't affect the base platform
    }



}

startNursery()