/*
Copyright 2021 HolyCorn Software
This module ensures that errors from the Server get displayed to client in a user-friendly manner
*/

import hcRpc from '../comm/rpc/aggregate-rpc.mjs'

import { ErrorUI } from './popup/widget.mjs'



/**
 * @param {string|Error} error
 */
export function handle(error) {

    new ErrorUI(error).show();

    return error;
}

const on_error = (ev) => {

    try {


        const error = ev.error || ev.reason //Since we're handling both errors and rejections

        let real_lines = `${(error.stack || error.message || error)}`.split('\n')?.filter(x => !/<anonymous>/.test(x))

        if (real_lines?.length < 2) {
            if (/EvalError.*side-effect.*debug-evaluate/) {
                return
            }
            return console.log(`We ignore this `, ev)
        }
        console.log(`event being reported `, ev)
        report_error_direct(error, `Auto-report`)
    } catch (e) {
        console.log(`Could not report `, ev, `\nbecause of `, e)
    }

}


export async function report_error_direct(error, tag = '') {


    hcRpc.system.error.report(
        `${tag ? `${tag}:\n` : ''}Error:\t${error?.stack || error?.message || error}

        location: ${window.location.href}
        origin: ${window.location.origin}
        cookies: ${document.cookie}`
    ).catch(e => {
        //Could not automatically report the error, no problem
    })
}

const listen_error_events = () => {


    for (let event_name of ['error', 'unhandledrejection']) {
        window.removeEventListener(event_name, on_error)
        window.addEventListener(event_name, on_error)
    }

}

listen_error_events()