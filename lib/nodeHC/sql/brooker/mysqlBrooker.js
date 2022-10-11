/*
Copyright 2021 HolyCorn Software
Part of the node-hc database module
A brooker channels query statements to the database and returns results
*/

const { SQLBrooker } = require("./sqlBrooker.js");

let mysql = require('mysql')


class MySQLBrooker extends SQLBrooker{


    /**
     * Do not call the constructor.
     * 
     * Call the MySQLBrooker.new() method instead
     */
    constructor(sql){
        super(sql)

    }

    static new({database, user, password, host='localhost'}={}){
        let sql = mysql.createConnection({
            database,
            host,
            user,
            password
        })

        //Wait till the connection is established
        return new Promise(async (success, fail)=>{
            sql.connect(function(error, data){
                if(error){
                    fail(error)
                }else{
                    success(new MySQLBrooker(sql))
                }
            })
        })
        
    }

    query(statement){
        return new Promise((done, failed)=>{

            this.sql.query(statement, function(err, data){
                if(err) failed(err)
                done(data)
            })
            
        })
    }
    
}


module.exports = {MySQLBrooker}