/*
Copyright 2021 HolyCorn Software
This widget produces a switch with two states.
States are more or less labeled values.
*/

import { Spinner } from "../infinite-spinner/spinner.js";
import { Widget } from "../lib/widget.js";


export class DualSwitch extends Widget{

    constructor({positive, negative, label}={}){

        super({css:import.meta.url})

        this.html = document.spawn({
            class:'hc-dual-switch',
            innerHTML:`
                <div class='container'>
                    <div class='label'></div>
                    <div class='track'>
                        <div class='thumb'></div>
                    </div>
                </div>
            `
        })

        this.html.on('click', ()=>{
            this.html.classList.toggle('positive')
            this.fire('change')
        })

        //When the 'positive' property is set, it will affect the label of the button in the positive state
        //When the 'negative' property is set, it will affect the label of the button in the 'negative' state
        for (var __ of ['positive', 'negative']){
            let x = __
            this.htmlProperty('.container >.track', x, 'attribute')

        }

        //Getting 'value' of this will return true if the positive class is set, and false otherwise.
        Widget.__htmlProperty(this, this.html, 'value', 'class',(v)=>{
            if(v==this.value) return; //Then there was no change
            this.fire('change')
        }, 'positive')

        this.htmlProperty('.label', 'label','innerHTML')

        let spinner = new Spinner()

        Reflect.defineProperty(this, 'waiting', {
            set:(v)=>{
                if(v==true){
                    spinner.start()
                    spinner.attach(this.html)
                }else{
                    spinner.detach()
                    spinner.stop()
                }
            },
            get:()=>{
                return spinner.isAttached
            }
        })

        Object.assign(this, arguments[0])

        /** @type {boolean} */ this.value
        /** @type {string} */ this.positive
        /** @type {string} */ this.negative
        /** @type {string} */ this.label
        /** @type {boolean} */ this.waiting
        
        
    }
    

    
}