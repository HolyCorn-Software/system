/**
 * Copyright 2022 HolyCorn Software
 * The CAYOFED People System Project
 * This module (wildcard-events) allows for creating event emitters whereby all the events can be listened to 
 */

import EventEmitter from "node:events";


export class WildcardEventEmitter extends EventEmitter {
    constructor() {
        super()
    }


    emit(type, ...data) {
        super.emit('*', type, ...data)
        super.emit(type, ...data);
    }
}