/*
Copyright 2021 HolyCorn Software
Part of Node-HC database module
This allows the system to interact with SQLite databases

*/

const { SQLBrooker } = require("./sqlBrooker.js");
let sqlite3 = require('sqlite3');

class SQLiteBrooker extends SQLBrooker{

    /**
     * 
     * Don't call the constructor
     * 
     * Go through @method SQLiteBrooker.new()
     */
    constructor(sql){
        super(sql)
    }

    /**
     * Call this method to create a new SQLiteBrooker
     * @param {string} file Path to the file
     * @returns 
     */
    static  new(file){
        return new Promise((done, failed)=>{

            let sqlite3db = new sqlite3.Database(file, (err)=>{
                if(err) failed(err)
                done(new SQLiteBrooker(SQLiteBrooker.adapt_sqlite_db(sqlite3db)) )
            })
        })

    }


    /**
     * This function is called to make an sqlite database suitable to be used in a tradition SQL brooker object. It creates a query method
     * @param {sqlite3.Database} sqlitedb 
     * @returns {sqlite3.Database}
     */
	static adapt_sqlite_db(sqlitedb) {
		//This is important because sqlite3 distinguishes between queries (SELECT) and 'commands' (like INSERT, UPDATE, DELETE)
		//qeries go through a different path, while 'commands' go through run()
		sqlitedb.query = function (statement) {
			return new Promise(async (ok, echec) => {

                if (/^ *(insert)|(update)|(delete)|(create)/i.test(statement)) {
					await this.run(statement)
				}else{
					sqlitedb.all(statement, function(error, data){
						if(error) echec(error)
						ok(data)
					})
				}
			})
		}.bind(sqlitedb)

		return sqlitedb;
	}
    
}


module.exports = {SQLiteBrooker}