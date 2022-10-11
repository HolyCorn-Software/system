/*
Copyright 2021 HolyCorn Software
This module allows the server to quickly find a client, by id, or perform a multi-cast
*/


export class WebSocketClientList {

    /**
     * 
     * @param {import('./websocket').WebSocketServer} server 
     */
    constructor(server) {

        /** @type {[import('./websocket.js').WebSocketIncomingClient]} */
        this.objects = []
        this.server = server


    }
    get length() {
        return this.objects.length;
    }

    [Symbol.iterator]() {
        for (var object of this.objects) {
            yield object
        }
    }

    /**
     * 
     * @param {{id:string}} param0 
     * @returns {import('./websocket.js').WebSocketIncomingClient}
     */
    find({ id }) {
        return this.objects.filter(x => x.id == id)[0]
    }


    /**
     * 
     * @param {{id:string}} param0 
     */    
    remove({ id }) {
        return this.objects = this.objects.filter(x => x.id !== id)
    }

    /**
     * 
     * @param {import('./incoming-client.js'). WebSocketIncomingClient} client 
     */
    add(client){

        if(!client.id){
            throw new Error(`Cannot add a client that has no id`)
        }

        if(this.find({id:client.id})){
            throw new Error(`Client ${client.id} already exists`)
        }
        
        this.objects.push(client);

        client.once('end', ()=>{
            this.remove({id:client.id})
        })
        
    }

}