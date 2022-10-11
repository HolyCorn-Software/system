import { FacultyDescriptor } from './faculty-descriptor.mjs'
import { FacultyPlatform } from './platform.mjs'

/*
Copyright 2021 HolyCorn Software
This component is simply for the purpose of nursing new faculties
It therefore provides a rich environment for running the actual script
*/
import colors from 'colors'
import { logLineNumbers } from './nursery-utils.js'
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
            console.warn(`\n\n\t${descriptor.label.bold} ${`has an unhandled rejection! \n${e.stack || e}\n${origin}`}`)
        });

        // process.on('uncaughtException', (e) => {
        //     console.warn(`\n\n\t${descriptor.label.bold} ${`has an uncaught error! \n${e.stack || e}`}`)
        // });

        //Initialize the platform upon which the faculty will run
        const faculty = await FacultyPlatform.create({
            descriptor,
            server_domains: args.server_domains
        }) //After this, we can use FacultyPlatform.get()
        faculty.base.channel.remote.setNetworkingEnabled(false); //For now, turn off inter-faculty RPC, till the faculty has started


        console.log(`Nursery started faculty ${descriptor.label.blue}`)

        logLineNumbers.status = true;


        //Now, actually start the new faculty
        global.FacultyPlatform = FacultyPlatform
        let { init } = await import(descriptor.init);


        //Now, should in case the connection with the base disconnects, automatically quit the Faculty

        process.on('disconnect', () => {
            console.log(`Exiting ${descriptor.label.bold} ${'because connection was lost'.red}`.red)
            setImmediate(() => process.exit());
        })

        await init();
        faculty.base.channel.remote.setNetworkingEnabled(true)



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