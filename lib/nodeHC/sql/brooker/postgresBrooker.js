/*
Copyright 2021 HolyCorn Software
This allows the system to make use of PostgreSQL databases
*/

const { SQLBrooker } = require("./sqlBrooker.js");
let PostgresClient = require('pg').Client


class PostgresBrooker extends SQLBrooker{

    
    static async new({user, database, host, port, connection_uri, ssl=false}){
        let client = new PostgresClient(connection_uri ?{connectionString:connection_uri, ssl:{rejectUnauthorized:ssl}}:{user, database, host, port, ssl:{rejectUnauthorized:ssl} })
        await client.connect()
        return new this(client);
    }
    
}

module.exports = {PostgresBrooker}