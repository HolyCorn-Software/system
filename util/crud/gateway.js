
/*
Copyright 2021 HolyCorn Software
This module allows other components to create simple crud interfaces from a collection
*/

import { Collection } from "mongodb";
import { checkArgs } from "../util.js";
import shortUUID from "short-uuid";



export class CRUDGateway {

    #collection;
    #structure;

    /**
     * 
     * @param {Collection} collection 
     * @param {object} structure What are the fields that are required before any piece of data be inserted
     * `structure` could be
     * ```js
     * {
     *  id:'string',
     *  name:'string',
     *  age:'number',
     *  contact:{
     *      email:'string',
     *      phone:'number'
     *  }
     * }
     * ```
     */
    
    constructor(collection, structure) {

        this.#collection = collection
        this.#structure = structure; //This tells us how to check for inputs
    }

    /**
     * 
     * @param {object} data 
     * @returns {string} id of the newly created item
     */
    create = async(data)=> {
        data.id = shortUUID.generate();

        checkArgs(
            data,
            this.#structure
        );
        await this.#collection.insertOne(data);
        return data.id;
    }
    find = async(documentKey)=> {
        return await (await this.#collection.find(documentKey)).toArray()
    }
    update = async(data)=> {
        return this.#collection.updateOne({ id: data.id }, { $set: { ...data } })
    }
    delete = async(data)=> {
        return this.#collection.deleteOne({ id: data.id })
    }

}
