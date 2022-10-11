/*
Copyright 2021 HolyCorn Software
This module represents an input field that has a drop down with quick fill suggestions that have been programmatically set
*/

import {Widget} from '../lib/widget.js';
import * as hc from '../lib/lib.js';
hc.importModuleCSS(import.meta.url);

export class QuickInput extends Widget {

    constructor({label}={}) {
        super();

        this.html = document.spawn({
            class: 'hc-quick-input',
            innerHTML: `
                <div class='content'>
                    <div class='label'>Code</div>
                    <input>
                    <div class='triangle'></div>
                </div>

                <div class='drop-down'>
                    <div class='options'></div>
                </div>
                
            `
        })

        this.html.$('.triangle').on('click', () => {
            this.html.classList.toggle('active');
            this.listenClicks();

            if (this.html.classList.contains('active')) {
                setTimeout(() => this.html.$('.drop-down').style.setProperty('--max-height', `${window.innerHeight - (10 * 0.01 * window.innerHeight) - 50 - this.html.getBoundingClientRect().top - 8}px`), 100);
            }
        });

        this.htmlProperty('.label', 'label', 'innerHTML')


        Object.assign(this, arguments[0])


    }

    listenClicks() { 
        //This method is internal, and it is not expected that you call upon it.
        //This function sets up a callback to handle clicks, so that the drop down may hide when it looses focus.
        if (this.watchingClicks) return;
        let drop = this.html.$('.drop-down');

        document.body.on('click', e => {
            let rect = JSON.parse(JSON.stringify(drop.getBoundingClientRect())); //To obtain a rect object whose properties are modifiable
            rect.top = this.html.getBoundingClientRect().top - 25;
            rect.bottom += 25; // The extra 25 is allow that the user may click slightly away from the box and still be tolerated
            rect.left -= 25;
            rect.right += 25;

            if (e.clientX > rect.right || e.clientX < rect.left || e.clientY > rect.bottom || e.clientY < rect.top) {
                this.html.classList.remove('active');
            }
        })
    }
    add(option) {
        if (!(option instanceof Option)) {
            throw Error(`Sorry, Please pass an object of type ${Option.name}`)
        }
        this.html.$('.options').appendChild(option.html);
        option.html.on('click', () => {
            this.value = option.value;
            this.html.classList.remove('active');
        })
    }

    remove(option_or_option_value){
        let value = option_or_option_value instanceof Option ? option_or_option_value.value : option_or_option_value
        this.html.$(`.options .hc-quick-input-option[value="${value}"]`).remove()
    }
    empty(){
        //remove all
        for (var option of this.options){
            option.html.remove()
        }
    }
    get options(){
        return [...this.html.$$('.options .hc-quick-input-option')].map(x=>x.object)
    }

    quickAdd(options) {

        /*
           Pass something like
           //Supposed we are defining a filter to sort people by human qualities like 'name', 'gender', 'height'
               [
                   {value:'name', label:'Name'},
                   {label:'Gender', value:'gender'},
                   {value:'height', htmlContent:custom_widget.html} //Which means 'htmlContent' can replace the 'label' property to provide what is visible to the user
               ];
        */
        for(var option of options){
            this.add(new Option(option));
        }
        

    }


    set value(value) {
        this.html.$('input').value = value;
        this.fire('change');
    }
    get value() {
        return this.html.$('input').value;
    }

    static help() {
        return `
                Copyright 2021 HolyCorn Software
                quick-input module

            NOTE
            This widget is a text-field having predefined, quickly avialable suggestions by way of a dropdown.

            Using this widget is all about defining alternatives.
            Just like all html-hc widgets, the final input from the user is accessible via the 'value' property
            This widget like all input widgets fires the 'change' event

            We add alternatives using the add() method

            
            EXAMPLE
                let quick = new QuickInput() //Define the widget
                quick.add(new Option({label:'Bitcoin', value:'BTC'})
                quick.add(new Option({label:'Ethereum', value:'ETH'}))
                document.body.appendChild(quick.html)

                        OR BETTER

                quick.quickAdd([
                    {label:'Bitcoin', value:'BTC'},
                    {label:'Litecoin', value:'LTC'},
                    {label:'Other coins', value:'alt'}
                ])

                quick.on('change', ()=>{
                    confirm(\`Thank you for choosing\${quick.value} as your favourite coin\`)
                })

        `
    }

}


export class Option extends Widget {
    //This is an abstraction of an option can appear on the drop down menu

    constructor({ label, value, htmlContent }) {

        super();
        
        this.html = document.spawn({
            class: 'hc-quick-input-option',
            innerHTML: `
                <div class='content'>
                    <div class='label'></div>
                    <div class='value'></div>
                </div>
            `
        })


        this.htmlProperty('.label', 'label', 'innerHTML')
        Object.assign(this, arguments[0]);
    }
    
    set htmlContent(html) {
        this.html.$('.label').appendChild(html);
    }
    set value(value){
        this.html.setAttribute('value', value)
        this.html.$('.value').innerHTML = value
    }
    get value(){
        return this.html.getAttribute('value')
    }

}