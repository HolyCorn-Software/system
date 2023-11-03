/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module contains type definitions related to session management in general
 */



export class SessionObjectEvents extends (await import('node:events')).EventEmitter {
    addListener(eventName: 'renew', listener: (...args: any[]) => void): this;
    on(eventName: 'renew', listener: (...args: any[]) => void): this;

    off(eventName: 'renew', listener: (...args: any[]) => void): this;
    once(eventName: 'renew', listener: (...args: any[]) => void): this;
}