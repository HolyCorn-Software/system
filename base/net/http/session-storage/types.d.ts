/*
Copyright 2022 HolyCorn Software
The Soul System
This module (types.js) contains a formal definition of the data types used by the session-storage grand module
*/

export interface SessionData extends SessionPublicData {
    store: { [key: string]: string }
}

export interface SessionPublicData {
    id: string
    cookie: string
    expires: number
}