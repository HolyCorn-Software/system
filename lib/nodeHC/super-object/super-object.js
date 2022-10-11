/*
Copyright 2021 HolyCorn Software
This class exists for the purpose of extending other objects 
*/

export class SuperObject {
    /*

    NOTE
        At the moment, SuperObject doesn't work with getters and setters


    */

    constructor(target) {

        //console.log(`new.target.prototype own keys`, Reflect.ownKeys(new.target.prototype))

        
        //Get all prototypes in the chain
        let chain = []
        for(var object=new.target; object.prototype; object=Object.getPrototypeOf(object)){
            chain.push(object)
        }

        chain = chain.reverse(); //The prototype property is different from getPrototypeOf(). The later gets the class to which the object inherits properties from, and the former gets the blueprint of all inheritable attributes
        
        for(var parent of chain){
            for(var key of Reflect.ownKeys(parent.prototype) ){

                let descriptor = Reflect.getOwnPropertyDescriptor(parent.prototype, key)
                
                if(descriptor.value){
                    Reflect.defineProperty(target, key, {
                        value:parent.prototype[key],
                        configurable:true,
                        enumerable:true
                    })
                }

                if(descriptor.get){
                    Reflect.defineProperty(target, key, {
                        get:descriptor.get.bind(target),
                        configurable:true,
                        enumerable:true
                    })
                }

                if(descriptor.set){
                    Reflect.defineProperty(target, key, {
                        set:descriptor.set.bind(target),
                        configurable:true,
                        enumerable:true
                    })
                }

            }
        }



        //Very important to return the actuall object being 'fortified'
        return target
    }
}
