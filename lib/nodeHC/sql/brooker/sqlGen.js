/*
Copyright 2021 HolyCorn Software
This module is simply meant to generate SQL code, so that sub-classes may override it and introduce minor differences in the SQL code generated
For example BIGINT makes no sense in Postgres, and by overriding certain methods in this class, the possibility of converting BIGINT into INT is created
*/


class SQLGen {


    /**
     * This method is called when generating code to allow that data types be named differently if need be
     * 
     * For example, this method is overriden, extra logic could be added to map data types that make no sense in a particular database regime to a valid one
     * 
     * For example we could do: return type=='BIGINT' ? 'INT' : type
     * @param {string} type
     * @returns {string}
     */
    get_final_type_name(type) {
        return type;
    }

    /**
     * This is used when determining the quote that will sorround the name of a table.
     * A table name could be: users
     * Then quoted as `users` or "users"
     * @returns {string}
     */
    get tableNameQuote() {
        return "`"
    }

    /**
     * Used to determine the quote to be used around field names
     * @returns {string}
     */
    get fieldNameQuote() {
        return "`"
    }

    /**
     * Used when determining the quotes to cover value names to be inserted into the database
     * @return {string}
     */
    get valuesQuote() {
        return '"'
    }

    /**
     * Used to create an SQL condition, based on the fields of the object
     * 
     * For example:
     *      {id:3, age:4}
     * will likely yield
     *      `id`="3" AND `age`="4"
     * @param {object} object 
     */
    createCondition(object={}, joiner = 'AND ', operation='=') {

        //Skip this conditional statement first
        if(object instanceof Array){ //This is to allow callers to create a more real-life or complex condition where they could pass an array of condition objects instead of just a single object
            return object.map(x=>this.createCondition(x, joiner)).join(joiner)
        }
        
        let fQted = Reflect.ownKeys(object).map(x => `${this.fieldNameQuote}${x}${this.fieldNameQuote}`) //fieldsQuoted :: ["`id`", "`age`"]
        let vQted = Object.values(object).map(x => `${this.valuesQuote}${x}${this.valuesQuote}`) //valuesQuoted :: ["'3'", "'4'"]

        return fQted.map((x, i) => `${x} ${operation} ${vQted[i]}`) //At this point we have ["`id`='3'", "`age`='4'"]
            .join(joiner) //At this point... ["`id`='3' AND `age`='4'"]
    }




    /**
     * 
     * @param {string} param0.table The table we are selecting from
     * @param {Array<string>} param0.fields The fields that will be selected from the table. This can be omitted, so that all fields are selected
     * @param {string} param0.where An object used to construct a condition governing the query
     * @param {string} param0.whereRaw A direct conditional statement that will override the outcome of the 'where' parameter, to be used directly. E.g `id`=3
     */
    select({ table, fields, where, whereRaw } = {}) {
        return `SELECT ${fields ? fields.map(f => `${this.fieldNameQuote}${f}${this.fieldNameQuote}`).join(", "): '*'} FROM ${this.tableNameQuote}${table}${this.tableNameQuote} ${(whereRaw || this.createCondition(where)) ? `WHERE ${(whereRaw || this.createCondition(where))}` : ''} `
    }

    /**
     * Generate an SQL statement for performing an insert
     * @param {string} param0.table
     * @param {object} param0.value
     * @returns {string}
     */
    insert({ table, value } = {}) {
        return `INSERT INTO ${this.tableNameQuote}${table}${this.tableNameQuote} (${SQLGen.keysQuoted(value, this.fieldNameQuote)}) VALUES (${SQLGen.valuesQuoted(value, this.valuesQuote)})`
    }


    /**
    * This method is called when we wish to change the value of a row on a table
    * @param {string} param0.table The table to be updated
    * @param {string} param0.value The object to be used to determine what will be inserted into the database
    * @param {object} param0.where An object that will be used to generate the condition. E.g {id:4} translates in SQL to WHERE `id` = "4"
    * @param {string} param0.whereRaw (optional) A string that represents exactly the condition to be passed to SQL e.g `username`="jimmy"
    * @returns {string}
    */
    update({ table, value, where, whereRaw } = {}) {
        let condition = whereRaw || this.createCondition(where, ' AND '); 
        return `UPDATE ${this.tableNameQuote}${table}${this.tableNameQuote} SET ${this.createCondition(value, ', ')} ${condition &&= `WHERE ${condition}`}`
    }

    /**
    * This method is used to delete an item from the table
    * @param {string} param0.table The table from which the data will be deleted
    * @param {string} param0.where An object that will be used to generate the condition for deleting. E.g {matricule:'UB17R030'}
    * @param {string} param0.whereRaw A direct and optional (when 'where' is missing) parameter that will be directly included in the final query statement. E.g `matricule`="UB12U003"
    * @returns {string}
    */
    delete({ table, where, whereRaw } = {}) {
        let condition = whereRaw || this.createCondition(where, ' AND '); 
        return `DELETE FROM ${this.tableNameQuote}${table}${this.tableNameQuote}  ${condition &&= `WHERE ${condition}`}`
    }


    /**
     * This method creates a new table
     * @param {string} param0.table The name of the new table
     * @param {string} param0.fields An object describing the structure of the new table. E.g {'#id': 'INT', 'name':'TEXT NOT NULL', age:'INT'}
     */
    create({ table, fields, if_not_exists=true } = {}) {
        let primary_keys = []
        let fieldNames = Reflect.ownKeys(fields)
            .map(field => { //The reason we are mapping field names is to distinguish and remember the primary key fields. (The ones that start with '#')
                let prim_regexp = /^#(.+)$/ //The pattern of field names that are primary keys
                if (prim_regexp.test(field)) {
                    let real_name = prim_regexp.exec(field)[1]
                    primary_keys.push(real_name)
                    return real_name
                } else {
                    return field
                }

            }) //So we have ["id", "name"]

        let fieldTypes = Object.values(fields)
            .map(type => this.get_final_type_name(type)); //The reason for mapping field types is because we want the possibility where a datatype could be changed to another

        let sql = fieldNames.map((x, i) => `${this.fieldNameQuote}${x}${this.fieldNameQuote} ${fieldTypes[i]}`).join(', ') //We have something like "`id` INT, `name` TEXT NOT NULL"

        return `CREATE TABLE ${if_not_exists ? 'IF NOT EXISTS' : ''} ${this.tableNameQuote}${table}${this.tableNameQuote} (${sql} ${primary_keys.length!=0 ? `, PRIMARY KEY(${primary_keys.map(k=>`${this.fieldNameQuote}${k}${this.fieldNameQuote}`)})` : ''})` //CREATE TABLE `users` (`id` INT, `name` TEXT NOT NULL, PRIMARY KEY (id))

    }







    /**
     * 
     * @param {object} object The object whose fields will be quoted
     * @param {string} quote The quote to sorround each field
     * @returns {string}
     */
    static keysQuoted(object, quote) {
        return this.quote(Reflect.ownKeys(object), quote)
    }

    /**
     * This produces a string representing just the values of an object, sorrounded wht quotes
     * @param {object} object The object whose values will be quoted
     * @param {string} quote The quote to sorround each value
     * @returns {string}
     */
    static valuesQuoted(object, quote) {
        return this.quote(Object.values(object), quote);
    }


    /**
     * This method returns a contatenated string of the elements when quoted
     * 
     * E.g input:
     *      ([1,2,3], "`")
     * Output
     *      `1`, `2`, `3`
     * @param {Array<string>} array 
     * @param {string} quote 
     * @returns {string}
     */
    static quote(array, quote) {
        return array.map(e => `${quote}${e}${quote}`).join(`, `)
    }

}

module.exports = {SQLGen}