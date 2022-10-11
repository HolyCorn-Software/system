/*
Copyright 2021 HolyCorn Software
This is a part of the node-hc database module
This module defines a FlexObject
A FlexObject is capable of accepting any number and nature of properties
However, for this to be possible, the FlexObject must have some unique fields
The structure of the unique fields is defined by the idFields parameter that is passed to constructor of a FlexObject
*/

const { Brooker } = require("../brooker/brooker.js");


class FlexObject {


    constructor({ table, idFields, brooker } = {}) {

        if (!(brooker instanceof Brooker)) {
            throw new Error(`Please pass an instance (e.g gotten from MySQLBrooker.new() as the 'brooker' parameter`)
        }

        this.table = table;
        this.idFields = idFields;
        this.brooker = brooker;

        this.values = {} //This will hold the attributes of the object

        //Before getting started, let's first create the table

        //But before creating the table, let us shape the landscape of idFields
        let idFieldKeys = Reflect.ownKeys(this.idFields)

        for (var key of idFieldKeys) {
            let value = this.idFields[key]
            let nw_key = key.replace(/^([^#])/, "#$1")
            delete this.idFields[key]
            this.idFields[nw_key] = value
        }

        this.brooker.create({
            table, fields: {
                ...this.idFields,
                "#property": 'VARCHAR(256)',
                'value': 'TEXT'
            }
        })

    }


    /**
     * This breaks down the attributes set on this object into an array of objects where the attributes are set on the objects, 
     * iff the attributes are primary attributes
     * @returns {Array<object>}
     */
    array_breakdown(throw_primary_key_exception = true) {

        //this.idFields is probably something like {"matricule":'VARCHAR(16)', 'school':'VARCHAR(25)'}

        let uploads = []; //An array of objects that will be inserted

        let idFieldNames = Reflect.ownKeys(this.idFields);

        for (var idField of idFieldNames) {
            idField = /^#*([^#]+)/.exec(idField)[1] //Remove the #tag, which is obviously there
            if ((typeof this.values[idField]) == 'undefined' && throw_primary_key_exception) {
                throw new Error(`We cannot upload the object because '${idField}' is defined as a primary key, but no value was set for it on the object\n`)
            }
            uploads.push({ [idField]: this.values[idField], property: -1, value: -1 })
        }

        for (var key of Reflect.ownKeys(this.values)) {
            //If the key is id and we have '#id' set in idFields, then id is a primary key. This loop is not interested in primary keys. Primary keys were handled above
            if (this.idFields[`#${key}`]) continue

            uploads.push({ ...uploads[0], property: key, value: this.values[key] })
        }


        /**
         * 
         * The value of uploads is something like this by now
         *
         * [ 
                { matricule: 'APOST102', property:-1, value:-1 },
                { matricule: 'APOST102', property: 'name', value: 'John Chi' },
                {
                    matricule: 'APOST102',
                    property: 'about',
                    value: 'Apostle John Chi'
                },
                { matricule: 'APOST102', property: 'phone', value: '674194190' }
           ]
         */
        return uploads;
    }

    /**
     * An object with just the neccessary fields, as defined by the primary key
     * 
     * Such an object is useful for providing uniqueness when downloading, or when deleting
     * 
     * @returns {object}
     */
    get condition_object() {
        let condition = { ...this.array_breakdown()[0] };
        //We manually undefine property and value so that we can select based only on primary key
        delete condition.property, delete condition.value;
        return condition;
    }




    /**
     * Call this method to push the object to the database
     */
    async upload() {
        let uploads = this.array_breakdown();

        await this.delete();

        for (var upload of uploads) {
            await this.brooker.insert({ table: this.table, value: upload })

        }

    }


    /**
     * Call this method to download the remaining fields in the object from the database
     * @returns {Promise<boolean>}
     */
    async download() {

        let condition = this.condition_object

        let data = await this.brooker.select({ table: this.table, where: condition });

        /** 
         * data is something like
         * [
         *      { matricule: 'APOST102', property:-1, value:-1 },
         *      { matricule: 'APOST102', property: 'name', value: 'John Chi' },
         * ]
         * 
         * Now we are mapping it to something like
         * {
         *      matricule:'APOST102',
         *      name: 'John Chi'
         * }
         */

        console.log(`selected data: `, data)

        for (var row of data) {
            for (var attrib in row) {
                if (attrib == 'property') continue;
                this.values[attrib] = row[attrib]
            }
            this.values[row.property] = row.value
        }

        console.log(`this.values: `, this.values)

        delete this.values[0]
        return data.length > 0 //The only metric by which we can let the caller know if any download took place
    }


    /**
     * Call this method to erase this object from the database, based on the values that have been put into the object
     * 
     * @returns {Promise<boolean>} true of false if the delete was successful
     */
    async delete() {
        return (await this.brooker.delete({ table: this.table, where: this.condition_object })).affectedRows != 0;
    }


    /**
     * Use this method to retrieve an array of objects in the database, whose attributes are similar to the 
     */
    async find(object = {}) {
        /**
         * The Database looks like this...
         *  [
         *      {matricule:'BIN110', school:'COLTECH', property:-1, value:-1},
         *      {matricule:'BIN110', school:'COLTECH', property:'name', value:'Son of Binary'},
         *      {matricule:'BIN110', school:'COLTECH', property:'height', value:'168'},
         *      {matricule:'HIT001', school:'COLTECH', property:-1, value:-1},
         *      {matricule:'HIT001', school:'COLTECH', property:'height', value:168},
         *      {matricule:'HIT001', school:'COLTECH', property:'name', value:'Budi Hitt'}
         * ]
         * 
         * Now we want to find {height:168, school:'COLTECH'}
         * To query successfully the database, we must also obtain a representation similar
        **/

        let _object = { values: object, idFields: this.idFields }
        let rows = this.array_breakdown.apply(_object, [false]) //[{school:'COLTECH', matricule:undefined}, {school:'COLTECH', matricule:undefined, property:'height', value:'168'}]
        for (var row of rows) {
            for (var key in row) {
                if ((typeof row[key]) == 'undefined') delete row[key]
            }
        }
        delete rows[0].property; delete rows[0].value;
        //rows is now [{school:'COLTECH'}, {property:'height', value:'168', school:'COLTECH'}]
        //In some cases, we can have [{school:'COLTECH'}, {property:'height', value:'168', school:'COLTECH'}, {class_id:0439}]

        //Now we see that the last elements of the array will describe better, the criteria of objects we are looking for
        let best_conditions = rows.length == 1 ? rows : rows.reverse().slice(1).reverse()

        let data = await this.brooker.select({ table: this.table, where: best_conditions })

        //Now we can build them up into full objects
        return this.compose(data);

    }

    /**
     * Call this method to instantiate an array of whole objects from fragments
     * 
     * E.g input [
     * 
         *      {matricule:'BIN110', school:'COLTECH', property:-1, value:-1},
         *      {matricule:'BIN110', school:'COLTECH', property:'name', value:'Son of Binary'},
         *      {matricule:'HIT001', school:'COLTECH', property:-1, value:-1},
         *      {matricule:'HIT001', school:'COLTECH', property:'name', value:'Budi Hitt'}
         * 
         * ]
         * 
        Output [

            {matricule:'BIN1101', school:'COLTECH','name':'Son of Binary'},

            {matricule:'HIT001', school:'COLTECH','name':'Budi Hitt'}

        ]
     * @param {Array<object>} objects 
     */
    compose(objects) {

        //First we separate the objects that have purely primary properties, from the ones that have both primary and secondary properties
        let primary = []
        let secondary = objects.filter(element => {
            if (element.property == '-1') {
                primary.push(element)
            } else {
                return true;
            }
        });


        primary = primary.map(element => {
            //get all the secondary objects that correspond to this primary object, and then apply their attributes on it
            let added_properties = {} //These properties are gotten from the secondary objects
            delete element.property; delete element.value; //First things first, so that we don't property=-1 as a way of determining if an object will be an attribute a primary one
            secondary.forEach(subject => {
                //In this loop determining if the secondary object belongs to the primary (element)
                //By checking to see that all the primary key fields match
                for (var key in element) {
                    if ((typeof subject[key]) == 'undefined' || subject[key] != element[key]) {
                        return false;
                    }
                }

                //And if they do, copy over it's values to the primary one (but first leave the properties at a temporary site 'add_properties')
                //The reason for leaving at the the temporary object is because we don't want the property just contributed to become a criterion for judging the next element to come. You can see how judgement is done in the loop above
                added_properties = { ...added_properties, [subject.property]: subject.value }
            })
            return { ...added_properties, ...element } //Now finally append all the extra properties
        })

        return primary
    }



}

module.exports = { FlexObject }