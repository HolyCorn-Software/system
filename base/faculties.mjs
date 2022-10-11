/*
Copyright 2021 HolyCorn Software
This is used by the base platform, to manage faculties
It allows faculties to be added, and removed
It calls the Faculty object to start the particular faculty
*/

import { JSONRPC }  from '../comm/rpc/json-rpc.mjs';
import { Faculty }  from '../lib/libFaculty/faculty.mjs';


export class BasePlatformFacultiesAPI {

    /**
     * 
     * @param {import('./platform.mjs').BasePlatform} base 
     */
    constructor(base) {
        this.base = base;

        /**@type {[Faculty]} */
        this.members = [] //An array containing all the individual faculties

        this[Symbol.iterator] = function*(){
            for(var member of this.members){
                yield member
            }
        }

    }

    add = async (path) => {
        //Start a faculty
        let faculty = new Faculty(path);
        await faculty.start(this.base);

        this.members.push(faculty) //Include in the list of faculties
    }

    remove(process) {
        //TODO: Implement this
        //To stop the faculty, and remove from the list of faculties
        this.process = this.members?.filter(x => x.process != process)
    }

    find(process) {
        return this.members?.filter(x => x.process == process)[0]
    }

    findByName(name) {
        return this.members.filter(x => x.descriptor.name == name)[0]
    }

    /**
     * 
     * @param {JSONRPC} json_rpc 
     * @returns 
     */
    findByJSONRPC(json_rpc) {
        return this.members?.filter(x => x.comm_interface.rpc == json_rpc)[0]
    }



}
