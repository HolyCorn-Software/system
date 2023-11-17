/*
Copyright 2021 HolyCorn Software
This is a part of the http module
This is an abstract representation of anything that can perform routing based on paths, end-points, e.t.c
*/

import { SuperResponse } from './super-response.js';



export class Router {



    /**
     * 
     * @param {boolean} isHalted 
     */
    constructor(isHalted) {

        /**@type {{regexp:RegExp, path:string,point:string, vPath:string, callback:function(SuperRequest, SuperResponse)}[]} */
        this.contracts = []
        /** @type {{callback:function(SuperRequest, SuperResponse)}[]} */
        this.middleware = []
        this.realClass = new.target;
        /** @type {boolean} This property tells the server to suspend receiving requests */ this.isHalted = isHalted
    }

    /**
     * Find the best contract that matches the url
     * @param {string} url
    */
    bestContract(url) {
        //First start by finding the contract that is on point
        let clean_url = /^([^?]+)/.exec(url)[1] //Remove all those querystring parameters e.g ?name=tom&id=4&etc
        return this.contracts.filter(c => c.point == clean_url)[0]
            //Then the one whose url matches a certain pattern
            || this.contracts.filter(c => c.regexp?.test(clean_url))[0]
            //Then finally, the one in the path
            || this.contracts.filter(c => clean_url.startsWith(c.path))[0]
    }

    /**
     * Returns a url that is relative to the parameters of the contract
     * @param {object} contract 
     * @param {string} url 
     * @returns {string}
     */
    transformURL(contract, url) {
        return url.replace(contract.path, contract.vPath || contract.path)
    }


    /**
     * This is used internally to decide upon the fate of a request
     * @param {import('node:http').IncomingMessage} request
     * @param {...any} others
     */
    doRoute = async (request, ...others) => { //This method is called by the default receiver of requests (it could be firebase)
        //And then find the appropriate handler the request

        while (this.isHalted) {
            await new Promise(x => setTimeout(x, 100));
        }

        request.url = decodeURI(request.url)

        //Go through the middleware first
        for (var mid of this.middleware) {
            try {
                let done = await mid.callback(request, ...others);
                //If a middleware return true, then its over
                if (done) {
                    return done;
                };
            } catch (e) {

                console.log(`The middleware ${mid.callback.name} threw error\nMiddleware should not throw errors`, e)
                throw e;
            }

        }

        let contract = this.bestContract(request.url)

        if (contract) {

            if (contract.path) {
                //Return a path relative to the contract
                request.originalURL = request.url
                request.url = this.transformURL(contract, request.url)
            }

            try {
                return (await contract.callback(request, ...others)) || true
            } catch (e) {
                console.error(e)
            }
        }



    }




    /**
     * Channel requests via a specific path to a given endpoint
     * You are free to specify one or more of these parameters.
     * During runtime, any incoming request that matches any of the creteria will be routed.
     * @param {object} param0
     * @param {RegExp} param0.regexp This refers to the pattern every url must match before being accepted. 
     * @param {string} param0.path The path to be matched
     * @param {string} param0.point For a specific request e.g /user/neba
     * @param {string} param0.vPath The virtual path the requests will be mapped to. (Optional)
     * @param {function(SuperRequest, SuperResponse)} param0.callback 
     * @param {string} param0.host Specify this if you want routing to be done only for a particular sub-domain or Host
     * @returns {[{regexp:RegExp, path:string,point:string, vPath:string, callback:function(SuperRequest, SuperResponse)}]}
     */
    route({ regexp, path, host, point, vPath, callback } = {}) {

        if (!callback) {
            throw new Error('callback is missing from the parameters')
        }

        let options = ['path', 'host', 'point']

        if (options.every(x => typeof arguments[0][x] == 'undefined')) {
            throw new Error(`Specify either ${options.join(' or')}`)
        }




        if (path && !path.endsWith('/')) {
            throw new Error('For clarity, a path must end in /')
        }

        if (path && point) {
            throw new Error(`Specify either 'path' or 'point'`)
        }

        const contract = { path, regexp, host, point, vPath: vPath || path, callback };

        //Now, if a call is made with the exact same details as another, let's allow the system to override the previous
        const existing = this.contracts.findIndex(x => options.every(op => x[op] === contract[op]))
        if (existing !== -1) {
            this.contracts[existing] = contract
        } else {
            this.contracts.push(contract)
        }

        this.contracts = this.contracts.sort(({ path: p1 }, { path: p2 }) =>
            p1 < p2 ? 1 : p2 < p1 ? -1 : 0 //Sort them in ASCII order descending order
        )
        //This sorting is important so that a path like /home should receive requests before a path like /
        //If not, / will override everything every time.

        return contract
    }

    /**
     * This method cancels a routing decision
     * @param {object} param0 
     * @param {string} param0.path
     * @param {string} param0.point
     * @param {string} param0.host
     * @returns {void}
     */
    deRoute({ path, point, host }) {
        let options = ['path', 'host', 'point']
        this.contracts = this.contracts.filter(x => !options.every(op => x[op] === arguments[0][op]))
    }





}