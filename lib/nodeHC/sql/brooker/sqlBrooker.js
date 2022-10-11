/*
Copyright 2021 HolyCorn Software
Part of the node-hc database module
A reminder... A brooker is an object responsible for channeling database queries to the database
Also responsible for providing an instance of the database
*/

const { SQLGen } = require("./sqlGen.js");
const { Brooker } = require('./brooker.js')


/**
 * We don't expect that you use this class.
 * It is barely a blueprint of how SQL brooker classes should look like.
 * You may use other classes like MySQLBrooker, or SQLiteBrooker
 */
class SQLBrooker extends Brooker {


    constructor(channel) {
        super()
        //The channel is something that has a query() method that returns results.
        if (!channel.query) {
            throw new Error(`This object is incompatible. Please pass an object where the method query() is defined. The query method is intended to transport SQL statements to the database, and return results as objects or arrays.`)
        }
        this.sql = channel;
        this.sqlGen = new SQLGen(); //The object responsible for creating properly structured SQL statements

        //Instead of manually implementing the create(), insert(), update(), delete(), select() methods
        //We approach the problem tactfully by dynamically generating the methods when needed
        //Afterall, what we have to do for each method is... find the corresponding command, execute it and return the results
        return this.__proxy__ = new Proxy(this, {
            get: (target, property) => {
                //If an external object wants to call a method like insert()
                if(property=='then'){
                   //return undefined;
                }
                if (['create', 'insert', 'update', 'delete', 'select'].indexOf(property) != -1) {
                    return async function () {
                        return await this.query(target.sqlGen[property](...arguments) ) //Generate the SQL query, and query it
                    }.bind(target)
                }

                if (['insertDirect', 'createDirect'].indexOf(property) != -1) {
                    return async function () {
                        let real_name = /^([a-z]+)/.exec(property)[1]
                        return await this.sql.query(target.sqlGen[real_name](...arguments) ) //Generate the SQL query, and query it
                    }.bind(target)
                }
                
                
                //Then for every other function that is being retrieved
                if (target[property] instanceof Function) {
                    return target[property].bind(target);
                }

                //Then for everything else being retrieved
                return Reflect.get(target, property)
            },
            
        })
    }

    query(sql){
        return this.sql.query(sql)
    }



}

module.exports = { SQLBrooker }