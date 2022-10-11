/*
Copyright 2021 HolyCorn Software
multi-form module
node-hc v2

*/

import { Widget } from "../lib/widget.js";
import { Form } from "./form.multiform.js";
import {Progress} from './progress.form.multiform.js';
import * as hc from '../lib/lib.js'

hc.importModuleCSS(import.meta.url);

export class MultiForm extends Widget{

    constructor({current_form}={}){
        super();
        this.html = document.spawn({
            class:'hc-multiform',
            innerHTML:`
                <div class='container'>
                    <div class='progress'></div>
                    <div class='main'>
                        <div class='forms'></div>
                    </div>
                </div>
            `
        })

        
        this.progress = new Progress();
        this.progress.on('change', ()=>{
            this.current_form0 = this.progress.value;
        })
        this.forms = [];

        this.html.$('.progress').appendChild(this.progress.html);
        

        Object.assign(this, arguments[0]);

        
    }
    /**
     * @param {number}
     */
    set current_form0(index){
        //This method is created like so, to allow the current form to be directly set without changing the progress object's value, and subsequently firing too many events
        //This property is used to cycle within the forms of this widget
        if(index >= this.forms.length) return;
        this.html.style.setProperty('--scrollX', `-${index*100}%`)
    }
    set current_form(index){
        if(index >= this.forms.length) return;
        this.current_form0 = index;
        this.progress.value = index;
    }
    get current_form(){
        return  new Number(/[0-9]+/.exec(this.html.style.getPropertyValue('--scrollX'))[0]).valueOf() / 100
    }

    add(form){
        if(!(form instanceof Form)) throw Error(`Please pass an object of type form`);

        this.forms.push(form);
        this.html.$('.forms').appendChild(form.html);
        this.progress.length = this.forms.length;

        form.on('complete', ()=>{
            if(this.current_form==this.forms.length-1){
                this.fire('complete');
            }
            this.current_form = this.forms.indexOf(form)+1; //Go to the next form
        })

        form.on('change', ()=>this.fire('change'))
        
    }
    get value(){

        let value = {}
        
        for(var form of this.html.$$('.hc-multiform-form')){
            value[form.object.name] = form.object.value;
        }
        return value;
    }
    
    
}