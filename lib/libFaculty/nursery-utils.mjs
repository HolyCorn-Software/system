/*
Copyright 2022 HolyCorn Software
This module provides useful functionalities that are usually called by the nursery module (when starting up new faculties)
*/

const originalConsoleMethods = {

}

const modifiedMethods = ['log', 'error', 'warn',]

for (let method in console) {
    originalConsoleMethods[method] = console[method]
}

class LogLineNumbersSetting {

    constructor() {

    }
    /**
     * Setting this variable determines if line numbers should be logged with the console.log method
     * @param {boolean} status
     */
    set status(status) {
        for (let _method of modifiedMethods) {
            const method = _method;
            if (status) {


                console[method] = function (...data) {
                    const stack = new Error().stack.split('\n')[2]
                    try {
                        let callingLine;

                        let label = method === 'warn' ? LogLineNumbersSetting.warningLabel : method === 'error' ? LogLineNumbersSetting.errorLabel : ''

                        if (method === 'error' && stack.indexOf('trace') !== -1) {

                            callingLine = soulUtils.getCaller({ hideFunction: false, offset: 1 })
                            label = `${'Trace!!'.yellow.underline}\n\n`

                        } else {
                            callingLine = soulUtils.getCaller({ hideFunction: false });
                        }

                        const transformed = []
                        data.push('\n')
                        for (let i = 0; i < data.length; i++) {
                            transformed.push(
                                i == data.length - 1 ?
                                    `${data[i]}\x1B[0m\x1B[48;5;233m\n${[...('-'.repeat(process.stdout.columns))].map((x, i) => i % 3 == 0 ? `${x}`.yellow : i % 3 == 1 ? `${x}`.magenta : `${x}`.green).join('')}\n${LogLineNumbersSetting.rightAlign(callingLine)}\n${LogLineNumbersSetting.rightAlign(new Date().toString()).cyan}\n${LogLineNumbersSetting.rightAlign((FacultyPlatform.get()?.descriptor.label || "system").yellow)}\n`.dim.blue + `\x1B[0m\n`
                                    : data[i]
                            )
                        }

                        originalConsoleMethods[method](
                            //empty line, plus space to separate the log from the previous one
                            `\n\n\x1B[48;5;233m${' '.repeat(process.stdout.columns)}\n`,
                            //warning label if any
                            label,
                            //data to be logged
                            ...transformed,
                            //Caller information

                        );
                    } catch (e) {
                        originalConsoleMethods[method](`error from ${stack}\n`, ...data, '\n', e)
                    }
                }.bind(console)

                console[`_${method}`] = originalConsoleMethods[method]
            } else {
                console[method] = originalConsoleMethods[method]
            }
        }


    }

    static rightAlign(text = '<unknown caller>') {
        const consoleWidth = process.stdout.columns;
        const numOfSpaces = Math.max(0, Math.floor((consoleWidth - text.stripColors.length)) - 1);
        return `${' '.repeat(numOfSpaces)}${text}`

    }

    /**
     * A piece of decorated text added to warning messages
     */
    static get warningLabel() {
        return `${'Warning'.yellow.underline}\n\n`
    }

    /**
     * A piece of decorated text added to error messages
     */
    static get errorLabel() {
        return `${'** Error **'.red.underline}\n\n`
    }

}


export let logLineNumbers = new LogLineNumbersSetting();