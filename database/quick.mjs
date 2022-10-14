/*
Copyright 2021 HolyCorn Software
This module offers a quick way to connect to the database, with just one line of code

*/


import { MongoClient, Db }  from 'mongodb'


/**
 * 
 * @param {{connection_uri:string, database:string}} credentials 
 * @returns {Promise<Db>}
 */
export default async function (credentials) {
    let brooker = new MongoClient(credentials.connection_uri)
    await brooker.connect()
    return brooker.db(credentials.database)
}

