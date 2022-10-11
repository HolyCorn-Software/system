/*
Copyright 2021 HolyCorn Software
This submodule of (double-form) contains code specific to handling forms
Seperating this into a submodule will greatly improve efficiency
Part of the SaveMyMoMo Project


    HIERARCHY:

    DoubleForm
        Form
            FieldRow
                Field
*/

import { Widget } from '../lib/widget.js';
import { Button as ContinueButton } from '../continue-button/index.js'; //ContinueButton is still currently in v1 package
import { hc } from '../lib/index.js';
hc.importModuleCSS(import.meta.url);

export class Form extends Widget {

    constructor({ title, actionText, name }={}) {

        super();

        this.html = document.spawn({
            class: 'hc-multiform-form',
            innerHTML: `
                <div class='content'>
                    <div class='top-section'>
                        <div class='title'></div>
                        <div class='caption'></div>
                    </div>
                    <div class='main'>
                        <div class='fields'>
                        </div>
                        <div class='action'>
                            <div class='button'></div>
                        </div>
                    </div>
                </div>
            `
        });


        this.action_button = new ContinueButton();
        this.html.$('.action').appendChild(this.action_button.html);

        //Let the changing of the 'title' object attribute affect the innerHTML of the '.title' elements
        this.htmlProperty('.title', 'title', 'innerHTML');
        this.htmlProperty('.top-section .caption', 'caption', 'innerHTML');
        Widget.__htmlProperty(this, this.html, 'name', 'attribute')

        this.htmlProperty('.hc-continue-button .content .text', 'actionText', 'innerHTML');


        this.action_button.on('click', async () => {
            if(!await this.validate_input()) return;

            this.fire('complete');
        })

        Object.assign(this, arguments[0]); //So that the properties passed in the constructor function be applied to the  object

        //Necessary sub routines in the widget class


    }

    async validate_input(){
        //This method is overriden to provide the functionality for checking for the correctness of the input
        //After this method returns true, the form can go ahead to fire complete

        return true;
    }

    add(row) {
        if (!(row instanceof FieldRow)) {
            throw new Error(`Please pass a FieldRow object`)
        }
        this.html.$('.fields').appendChild(row.html);
        row.on('change', ()=>this.fire('change'))
        return this;
    }

    static help() {
        return `
                Copyright 2021 HolyCorn Software
                Part of SaveMyMoMo Project

            This module is the heart of the multiform module
            A form is barely a collection of FieldRow objects
            A FieldRow object can be added using the add() method
            Refer to Field and FieldRow documentation

            However, take note of some important things:

            - validate_input()
                This method can be async, but must return either true or false to either approve or disapprove a user's input.
                Therefore, overriding this method will allow early checking for faulty input beforehand

            - quickAdd()
                This method saves the process of following the FieldRow, Field, Input hierarchy, thereby allowing the developer to add multiple fields by sending a well structured object as input
                Refer to the source code (${import.meta.url}) for an example

        
        `
    }


    quickAdd(data) {
        /* Example::
        {
            title: 'Protect your Money',
            rows:[
                
                [
                    {name:'victim_phone', label:'Your Phone' quick_textbox:'input'},
                    {label:'The Scammer', name:'culprit_phone' quick_textbox:'input[type="number"]'}
                ],
            ],
            actionText:'Protect My Money'
        }
        */
        this.title = data.title || this.title;
        this.actionText = data.actionText || this.actionText;

        for (var row of data.rows) {
            let rowObj = new FieldRow();

            for (var field of row) {
                rowObj.add(new Field({ label: field.label, name: field.name, quick_textbox: field.quick_textbox }))
            }
            this.add(rowObj);
        }
        return this;
    }

    get value() {
        let value = {}
        for (var field of this.html.$$('.field')) {
            value[field.getAttribute('name')] = field.object.value;
        }
        return value;
    }

    clear() {
        for (var field of this.html.$$('.field')) {
            field.value = '';
        }
    }



}


export class FieldRow extends Widget {

    constructor() {
        super();
        this.html = document.spawn({
            class: 'field-row', //don't need to use former nomencleture since this resides within the doubleform-form class
        })



    }

    add(field) {
        if (!(field instanceof Field)) {
            throw Error(`Please pass an object of type Field`)
        }
        this.html.appendChild(field.html);
        field.on('change', ()=>this.fire('change'))
        return this;
    }

    static help() {
        return `
            This represents a single horizontal space (or row) on a form
            You can add fields to this using the add() method, or by directly manipulating the html property of this widget
        `
    }

}

export class Field extends Widget {

    constructor({ quick_textbox, label, name }) {

        super();

        this.html = document.spawn({
            class: 'field',
            innerHTML: `
                <div class='label'></div>
                <div class='hc-multiform-form-input'></div>
                <div class='warning'></div>
            `
        })
        Widget.__htmlProperty(this, this.html, 'name', 'attribute')
        this.htmlProperty('.label', 'label', 'innerHTML')

        Object.assign(this, arguments[0]);

    }
    get value() {
        return this.input.object.value
    }
    set value(value) {
        this.input.object.value = value;
    }
    set input(input) {
        if (!(input instanceof Widget)) console.warn("Setting the input property as an object that is not an HC widget")
        if (!('value' in input)) {
            throw Error('The object must have a "value" property, which is (preferably) a getter, and not a function')
        }
        if(!('html' in input)){
            throw Error(`The object must have an 'html' property of type HTMLElement`)
        }
        
        //This method is used to set a custom input widget
        //This is important for things like file input

        if (this.input) {
            this.input.replaceWith(input.html);
            this.input.object.removeEventListener('change', this.on_input_change)
        } else {
            this.html.$('.hc-multiform-form-input').appendChild(input.html);
        }

        input.on('change', this.on_input_change);
        
        
    }
    get input() {
        return this.html.$('.hc-multiform-form-input').children[0];
    }
    on_input_change =()=>{
        //When the input element changes, it fires this event
        this.fire('change')
    }

    static help() {
        return `
                Copyright 2021 HolyCorn Software
                Field widget, a part of the Form  widget, which is a part of the multiform widget

            NOTE
            The input property is tricky, and dynamic, to allow any type of input field.
            Any element can serve as input, as long as it is an HC v2 widget, having a 'value' property.
            However, you can achieve the same effect by passing an Object that has a 'value' property such that getting the output of this property is considered as the value of the field.
            Then, the main object should a 'value' property.
            Any element can serve as an input, as long as the class is set to 'hc-multiform-form-input'.

            EXAMPLE
            let field = new Field({label:'Enter your name', label:'name', quick_textbox:'input'})
            let another = new Field({label:'Gender', name:'gender'})
            let options = new Choose([{label:'Male', value:'m'}, {label:'Female', value:'f'}]); //Note that Choose is an HC widget
            another.input = options;

            NOTE
            You can make use of the warn() method
            For example
                field.warn('Passwords do not match', 7000) //That will last 7 seconds
            Setting the 'warning' property is used to set the an error text, without displaying it
                field.warning = "Username taken"; //This won't show will you decide to warn


            NOTE
            Other properties include:
                label ---> Text to be boldly displayed at the top of the widget
                name ---> The name of the field object. This is useful to forms, for classifying data
                value --> The value of the input widget that was added to this widget
                quick_textbox ---> Used to create an input field in fewer lines of code by passing a string. Refer to TextboxInput

            
        `
    }

    set quick_textbox(box_data) {

        /*
        It is expected that the possible values will be 'input' or 'textarea'
        You can also pass input[type="number"] or input[type='email', length='4'] or anything in that pattern
        */
        this.input = TextboxInput.create(box_data);
    }

    get warning() {
        return this.html.$('.warning').innerHTML
    }
    set warning(warning) {
        return this.html.$('.warning').innerHTML = warning
    }

    warn(text, duration = 5000) {
        this.warning = text;
        this.html.$('.warning').classList.add('active');
        clearTimeout(this.clear_warning_timeout); //To maintain a single task, single cancellation approach
        this.clear_warning_timeout = setTimeout(() => this.html.$('.warning').classList.remove('active'), duration);
    }


}




//Useful for creating quick text boxes, like 'input' and 'textarea'
export class TextboxInput extends Widget {

    constructor({ tag = 'input' } = {}) {
        super();
        this.html = document.spawn({
            tag: tag,
        })

        this.configure();

        Object.assign(this, arguments[0])

    }


    configure() {
        Object.defineProperty(this, 'value', {
            get: () => this.html.value,
            set: v => this.html.value = v,
            configurable: true, enumerable: true

        })

    }
    static create(box_data) { //To achieve something like TextboxInput.create('input[type="password", name="password"]')
        let type = /^[A-Za-z]+/.exec(box_data)[0]

        let input = new TextboxInput({ tag: type });

        let attribRegexp = /\[([^\]]+)\]/ //A pattern permitting the module to pick out attributes occuring between '[' and ']'

        if (attribRegexp.test(box_data)) { //If the box_data string has this pattern...
            let attribs = attribRegexp.exec(box_data)[1].split(','); //Separate the attributes by commas
            for (var attrib of attribs) {
                let [, key, value] = /([^=]+)=['"]([^'"]+)['"]/.exec(attrib) //Following the model of key='value' or key="value"
                input.html.setAttribute(key, value)
            }

        }
        return input
    }

    static help() {
        return `
                Copyright 2021 HolyCorn Software
                TextboxInput module

                The aim of this module is to provide a quick way to create 'input' and 'textarea' elements
                The configure() method should be called everytime the html property changes, in order to bind the value property on to the object, from the html

                To initialize a textbox, you can call the TextboxInput.create() method
                For Example
                    let box = TextboxInput.create('input[type="password", name="pass"]')
                    let box = TextboxInput.create('input')
                    let box = TextboxInput.create('textarea')
        
        `
    }

}