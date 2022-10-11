/*
Copyright 2021 HolyCorn Software
This is the core of the Error Handler Module
It does the work of retrieving the details of an error, given a short string.
*/


export class ErrorEngine {

    /**
     * 
     * @param {import("../../errors/handler.mjs").ErrorMap} map 
     */
    constructor(map) {
        this.map = {
            ...map,
            ...ErrorEngine.universalErrors
        }

    }

    /**
     * Resolves an error code to an actual error object
     * @param {string} string 
     * @returns {import("../../errors/handler.mjs").ErrorV2}
     */
    resolve(string) {
        //string is something like error.competition.providerError
        //Or something like error.competition.providerError("Flutterwave")

        //To transform into something like We have issues with our payment gateway
        //Or something like, We have issues with our Flutterwave payment gateway

        let parts = /^([^(]+)\({0,1}((.(?!$))*)/s.exec(string)

        if (!parts) {
            throw Error(`Invalid Error code!\nA valid error could be error.competition.providers`) //That's our last resort
        }

        //custom is whatever appears in brackets
        //code is the actual error code
        let [, code, custom] = parts;

        let error = this.map[code]

        if (!error) {
            if (typeof string === 'string') {
                return string
                // throw Error(`The error ${code} was not found.\nNote that that errors follow the format error.<faculty>.errorName`)
            } else {
                console.log(`\n"${(string.message || string).toString()}"\n\tis not a proper error\n`);
                return string;
            }
        }

        //Now we have distilled the custom arguments into an array
        //that looks like "'Hey'","'Hi'"  or '"Hey"', '"Hi"'
        let args = custom.split(/,[^'"]*/).map(x => /[^"']+/.exec(x)?.[0] || '');


        let resolve = (message)=>{
            //Now we are replacing occurrences like $0 with the zeroth argument, $1 with the first argument, $2 with the second. And so on
            return message.replaceAll(/\$(\d+)/g, index => args[/\d+/.exec(index)[0]])
        }

        for( var zone in error){
            error[zone].message = resolve(error[zone].message)
        }

        if(error){
        }

        return { ...error }

    }

    static get universalErrors() {
        return this.convertV1MapToV2({
            'error.http.bad_request': {
                message: 'The last request that was made to the server was unsuccessful, because the request was faulty. Please check to see that any information entered was correctly formatted.',
                code: 400
            },
            'error.http.not_found': {
                message: 'A request was made to the server, and the server responded saying it could not find what we were looking for. What you can do about this is to check the information you entered (depending on whether you even entered something).',
                code: 404,
            },
            'error.http.403': {
                message: 'It\'s not possible to perform such an action',
                code: 403
            },
            'error.system.unplanned': {
                message: "Unexpected Error with our systems.",
                code: 500
            },
            'error.input.validation': {
                message: "$0",
                code: 400
            }
        })
    }

    /**
     * Converts an error map defined with v1 standards to a v2 form
     * @param {ErrorMap} map 
     * @returns {ErrorMapV2}
     */
    static convertV1MapToV2(map) {

        let v2Map = {}

        for (var error in map) {
            map[error].httpCode = map[error].code;
            //delete map[error].code;

            let v2 = {
                backend: map[error],
                frontend: {
                    message: map[error].message
                }
            }

            v2Map[error] = v2

        }

        return v2Map

    }
}