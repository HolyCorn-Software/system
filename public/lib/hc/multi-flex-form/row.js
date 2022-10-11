/*
Copyright 2021 HolyCorn Software
The MultiFlexForm widget
This module (space widget) is one that can hold others like it, as well as others unlike it.
The main aim of this widget is to create distinction, because these features are already implemented at the base level of MultiFlexFormItem

*/

import { MultiFlexFormItem } from "./item.js";


export class MultiFlexFormRow extends MultiFlexFormItem{

    constructor({css, ...args}={}){
        super({css:[import.meta.url, css], ...args})

        this.html.classList.add('hc-multi-flex-form-row')
    }

    get elements(){
        return this.html.$('.container').children.map(x=>x.object);
    }
    append(element){
        this.html.$('.container').appendChild(element.html)
    }
    prepend(element){
        this.html.$('.container').prepend(element.html)
    }
    
    
}