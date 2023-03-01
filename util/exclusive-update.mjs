/**
 * Copyright 2022 HolyCorn Software
 * The Soul System
 * This utility allows for updating fields within an object in a restrictive manner.
 * 
 * That is, you can allow a user to update certain fields and prevent him from updating others
 */


import { checkArgs } from "./util.js";


/**
 * Don't use this directly.
 * Use the soulUtils globals
 * This method allows a record to be update restrictively.
 * That is, certain fields can be updated, and must follow a certain structure
 * Updating other fields or updating specified fields with values that differ from the pattern will throw errors
 * 
 * Pattern defines a set of fields that are updatable and their expected data types, or the data types of their contained fields for composite objects.
 * 
 * For example, pattern could be
 * {
 *      name: 'string',
 *      weight: 'number',
 *      amount.currency: 'string',
 *      amount.value: 'number',
 *      height:{
 *          value: 'number',
 *          unit: 'string'
 *      }
 * }
 * 
 * 
 * Because we defined amount.currency and amount.value, a user may update a single field (value) under the field amount.
 * 
 * However, because we defined height as {value:'number', unit:'string'}, the user can only pass a whole object that contains the 'value' and 'unit' fields
 * 
 * @param {object} pattern
 * @param {object} data
 * @param {object} updateTarget
 */
export default function ____exclusiveUpdate____(pattern, data, updateTarget) {

    // The fields that can be updated
    // As well as how they should look like

    /**
    Pattern could be 
    {
        'src': 'string',
        'dst': 'string',
        'amounts.src_amount': {
            'src_amount': {
                'value': 'number',
                'currency': 'string'
            }
        }
    }

    */



    /** 
     * This method is called by the loop below for each field that is to be updated
     * @param {string} field 
     */
    var updateField = (field) => {
        // field could be short, e.g 'src' or composite, e.g 'amounts.src_amount.value'
        let parts = field.split('.')
        let externalRef = data; //Reference to where the value will come from

        //So at this point, we are getting the value for the field being updated. E.g the value for amounts.src_amount.value which could be 5
        for (let part of parts) {
            //If the client data intends to update that field...
            if (typeof externalRef[part] !== 'undefined') {
                //Then get one step closer to that field
                externalRef = externalRef[part]
            } else {
                //We cannot go further to update amounts.src_amount.value because amounts.src_amount is undefined
                return
            }
        }

        //So, if there's a value for where the value will come from, then we can go ahead to update it
        if (typeof externalRef !== 'undefined') {

            // Before we proceed to set the fields, we know that, we can't set a property 'amounts.src_amount.value' if 'amounts.src_amount' doesn't even exist
            let paths = [] // The various fields that will be set in chronological order. paths could be 'amounts', 'amounts.src_amount', 'amounts.src_amount.value'
            for (var i = 0; i < parts.length; i++) {
                paths.push(parts.slice(0, i + 1).join('.')) // everything before the current part, all joined by the '.'
            }

            //So here, we are ensuring the existing of preceeding fields required for the update
            //We are ensuring that, before we update amounts.src_amount.value, amounts.src_amount and amounts should be defined
            for (var path of paths) {

                if (typeof updateTarget[path] === 'undefined') {
                    //That means something is lacking.
                    //So we put a default value, that will permit us traverse the chain
                    setByReference(updateTarget, path, {})
                }

            }

            //Now we are checking that the value for the field we want to update conforms to the structural definition
            //So, if the definition is composite
            //That is, if amounts.src_amount.value is something like {v1: 'number', v2:'number'} instead of something direct like 'number'
            //then we check that each part of the input conforms to the structure
            if (typeof pattern[field] === 'object') {

                for (let aField in pattern[field]) {

                    if (typeof externalRef[aField] !== 'undefined') {

                        //Now check for compliance
                        //Does the value from the client match the structure ?
                        checkArgs(externalRef[aField], pattern[field][aField], field);

                    }
                }
            } else {
                checkArgs(externalRef, pattern[field])
            }


            //Now we are done checking
            //We are now updating

            setByReference(updateTarget, field, externalRef);


        }

    }

    for (var updatable in pattern) {
        updateField(updatable);
    }


}






/**
 * This is the equivalent of target.some.path.property = value
 * @param {object} target 
 * @param {string} pathString 
 * @param {any} value 
 */
const setByReference = (target, pathString, value) => {
    let last_reference = target;
    let paths = pathString.split('.');

    for (let i = 0; i < paths.length - 1; i++) {
        last_reference = last_reference[paths[i]]
    }

    last_reference[paths.at(-1)] = value;
}