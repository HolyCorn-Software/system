/*
Copyright 2021 HolyCorn Software
This module is used for testing code.

An IO test defines a test where a method is called, with the expectation of a certain output

*/

class IOTest{

    constructor(input, expect){
        this.input = input;
        this.expect = expect;
    }
    async run(object, property, type='method'){ //either type is 'method' or type is 'getter', or type is setter

        switch(type){
            case 'setter':
                object[property] = this.input; //This will throw an exception if the setter  is not working properly
                break;
            default: //handling getter and method tests
                let output = object ? object[property] : property
                output = type=='getter' ? (await output) : output(this.input); //If getter, just pull the property and wait, else (if method), call the method
                return {OK:IOTest.isEqual(output, this.expect), comment:undefined}
                
        }
    }

    static isEqual(subject,expect){
        //Tells if two objects are equal

        //Note that 'property' here refers even to array indices

        //First check if they are of the same type
        if((typeof subject) != (typeof expect)) return false;

        //If they are of the comparable type, just directly compare
        if(['string', 'boolean'].indexOf(typeof subject) != -1) return subject == expect;

        //Check property by property, to make sure they comply with each other totally
        for(var key in expect){
            if(!IOTest.isEqual(subject[key], expect[key])) return false;
        }

        //If any object has more properties than the other
        if(Object.keys(subject).length != Object.keys(expect).length){
            return false;
        }

        //If all traps failed... Then they are equal
        return true;
        
        
    }
    
}

module.exports ={IOTest}