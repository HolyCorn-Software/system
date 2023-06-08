
/*
Copyright 2021 HolyCorn Software
This module is a part of node-hc
It functions by allowing the server to securely keep track of user session variables
*/

let http = require('http');
const { v4: uuid } = require('uuid');
const { Cookies } = require('./cookies');
const { FlexObject } = require('../db/flexObject/flex.js');




class Session extends FlexObject {

    //What a session does is...
    //It allows an id to be stored on the user's PC while his credentials are stored on the server. These credentials are called session variables and are backed by the session id


    constructor({ session_id, expires, brooker } = {}) {
        super({ table: Session.table, idFields: Session.tableStructure, brooker }); //Create tables in the database
    }

    static async create(expires = new Date(Date.now() + Session.DEFAULT_DURATION)) {
        let session = new Session({ session_id: uuid(), expires: expires });
        await session.upload();
        return session;
    }
    static get DEFAULT_DURATION() {
        return 72 * 60 * 60 * 1000; //3 days for a session
    }

    static get prefix() {
        return 'node-hc-session'; //The prefix to be used in user cookies
    }
    static get tableStructure() { //Structure of the primary table (Session.tables[0])
        return {
            '#session_id': 'VARCHAR(36)',
            'expires': 'TEXT' //Actually, a very long number. But for the sake of differences like BIGINT, it is better to go with TEXT
        }
    }
    static get table() { //The table which store information of sessions in the database
        return 'node_hc_session'
    }


    static async getSession(request) {
        //This returns a Session object representing the session associated with the request

        if (!(request instanceof http.IncomingMessage)) {
            throw new Error(`Please pass an object of type http.IncomingMessage`)
        }
        //Session ID's are stored in cookies
        let cookies = Cookies.getCookies(request); //Since session id's come from cookies
        let session_id = cookies[Session.prefix];
        //Blank session id
        if (!session_id) throw new SessionNotFoundErr()

        let session = new Session({ session_id: session_id });

        //Check for existence in the database
        if (!await session.download()) {
            throw new SessionNotFoundErr(session_id);
        }

        //Check for expiration
        if (new Number(session.expires).valueOf() <= Date.now()) {
            throw new SessionExpiredErr(session_id);
        }

        return session; //All is well

    }

    write(response) {
        //This method writes the session id to the user, via cookies

        if (!(response instanceof http.OutgoingMessage)) throw Error(`Please pass an object of type http.OutgoingMessage`)

        let cookies = new Cookies({ [`${Session.prefix}`]: this.session_id });
        cookies.writeKey(Session.prefix, response, { expires: this.expires })
    }

    static async createOrGet(request, expires) {
        //This method creates session where there is none.
        //Such is important in ensuring that the system has a reference to the user's session, but should not override an existing one
        try {
            return await Session.getSession(request);
        } catch (e) {
            //An empty session is the only 'normal' error
            if (!(e instanceof SessionNotFoundErr) && !(e instanceof SessionExpiredErr)) throw e;
        }
        return await Session.create(expires)
    }




}

class SessionNotFoundErr extends Error {
    constructor(id) {
        super(`We could not find the session ${id}`)
    }
}


class SessionExpiredErr extends Error {

    constructor(id) {
        super(`The session ${id} expired!`)
    }

}


module.exports = {
    Session,
    SessionExpiredErr,
    SessionNotFoundErr
}