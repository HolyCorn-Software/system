/*
Copyright 2022 HolyCorn Software

This
*/

/**
 * 
 * @typedef {Object.<string, Number>} Arbit
 */


/**
 * @class
 * @augments Type
 * @template Type
 * 
 * The event side of this object fires a change event each time a field is set. The change event includes details of which field was changed
 * 
 */
export class AlarmObject extends EventTarget {

    /**
     * @returns { string}
     */
    constructor() {
        super();

        let dataStore = {}
        /** @type {Type} */ this.$0data

        /** 
         * @type {{
         *      addEventListener: function(('change'), function ({detail: { field:string, value: string } } & Event) )
         * } & EventTarget}
        */ this.$0

        let object = this;


        return new Proxy(dataStore, {
            set: (target, property, value, receiver) => {
                if (value !== dataStore[property]) {
                    dataStore[property] = value;
                    object.dispatchEvent(new CustomEvent('change', { detail: { field: property, value } }))
                }
                return true;
            },
            get: (target, property, receiver) => {
                if (property === '$0') {
                    return object;
                }
                if (property === '$0data') {
                    return JSON.parse(JSON.stringify(dataStore));
                }

                let value = dataStore[property]
                if (typeof value === 'function') {
                    return value.bind(target)
                }
                return value
            }
        })
    }

}