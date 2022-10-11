/*
Copyright 2021 HolyCorn Software
This module is part of the database module of the node-hc library
This defines an important structure for database brookers, as well as useful functions needed by them
*/


class Brooker {

    /**
     * This method is called by external objects to have an instance of the brooker, instead of calling the constructor
     * @param {object} params 
     */

    constructor(sql) {
        this.sql = sql;

        //Add to the list of brookers, so that other objects can call upon it
        if (!global.nodeHC_brookers) {
            global.nodeHC_brookers = []
        }
        global.nodeHC_brookers.push(this)


    }

    async new(params) {

    }

    /**
     * 
     * @param {sting} param0.table The table we are selecting from
     * @param {string} param0.where An object used to construct a condition governing the query
     * @param {string} param0.whereRaw A direct conditional statement that will override the outcome of the 'where' parameter, to be used directly. E.g `id`=3
     * @returns {Array<object>}
     */
    async select({ table, where, whereRaw }) {
        this.implError()

    }

    /**
     * This method is called to insert something into the database
     * @param {string} param0.table Table where the data will go to
     * @param {object} param0.value An object that will be inserted. E.g {id:3, name:'Orange'}
     */
    async insert({ table, value } = {}) {
        this.implError()

    }

    /**
    * This method is called to insert something into the database, while overriding the query method
    * @param {string} param0.table Table where the data will go to
    * @param {object} param0.value An object that will be inserted. E.g {id:3, name:'Orange'}
    */
    async insertDirect({ table, value } = {}) {
        this.implError()

    }

    /**
     * This method is called when we wish to change the value of a row on a table
     * @param {string} param0.table The table to be updated
     * @param {string} param0.value The object to be used to determine what will be inserted into the database
     * @param {object} param0.where An object that will be used to generate the condition. E.g {id:4} translates in SQL to WHERE `id` = "4"
     * @param {string} param0.whereRaw (optional) A string that represents exactly the condition to be passed to SQL e.g `username`="jimmy"
     */
    async update({ table, value, where, whereRaw } = {}) {
        this.implError()

    }


    /**
     * This method is used to delete an item from the table
     * @param {object} param0
     * @param {string} param0.table The table from which the data will be deleted
     * @param {string} param0.where An object that will be used to generate the condition for deleting. E.g {matricule:'UB17R030'}
     * @param {string} param0.whereRaw A direct and optional (when 'where' is missing) parameter that will be directly included in the final query statement. E.g `matricule`="UB12U003"
     */
    async delete({ table, where, whereRaw } = {}) {
        this.implError()
    }

    /**
     * This method creates a new table
     * @param {string} param0.table The name of the new table
     * @param {string} param0.fields An object describing the structure of the new table. E.g {'#id': 'INT', 'name':'TEXT NOT NULL', age:'INT'}
     */
    async create({ table, fields } = {}) {
        this.implError()

    }

    /**
     * All methods pass through the query method to make requests to the database
     * 
     * The reason is for control and optimization
     * @param {string} statement 
     */
    query(statement) {
        this.implError()
    }
    implError() {
        throw new Error(`Implement this method !`)

    }

    

}

module.exports = { Brooker }