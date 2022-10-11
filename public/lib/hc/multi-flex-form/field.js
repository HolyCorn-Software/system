/*
Copyright 2021 HolyCorn Software
The MultiFlexForm widget
This module produces the MultiFlexFormField widget, which produces dynamic input fields

*/

import { MultiFlexFormItem } from "./item.js";
import { Choose } from '../choose/index.js';
import { Widget } from "../lib/widget.js";
import { hc } from "../lib/index.js";
import { UniqueFileUpload } from "../fileUpload/upload.js";

hc.importModuleCSS(import.meta.url)


export class MultiFlexFormField extends MultiFlexFormItem {

    constructor({ label, values, name, css } = {}) {
        super(arguments[0]);
        this.html.classList.add('hc-multi-flex-form-field');

        /** @type {function(('change'), function(CustomEvent), AddEventListenerOptions)} */ this.addEventListener

    }

    /**
     * @param {string} type The new input type
     * @param {object} params extra parameters that can be passed to control how the overall outcome will be
     * Possible values of the type attribute are
     * text, number, date, password, textarea, and choose
     * 
     * If the type is set to 'choose', you must pass the values parameter, which is an of object structured as 'value':'label'
     * For example 
     * 
     * {
     * 
     *      values:{
     * 
     *          'btc': 'Bitcoin',
     * 
     *          'ltc' : 'Litecoin'
     * 
     *      }
     * 
     * }
     * Now if the user selects Bitcoin, the value you'll get is the value as 'btc'
     * 
     * @param {string} params.label
     * @param {[{string:string}]} params.values
     * 
     */
    setType(type, { label, values } = {}) {

        let widget_types = [[/choose/, Choose], [/uniqueFileUpload/, UniqueFileUpload]] //This object contains the input types that will require custom widgets. The rest will require input boxes

        //If the type can be handled by a custom input
        for (let [regexp, Widget] of widget_types) {
            if (regexp.test(type)) {

                //Now that the type of input we want to instantiate needs a custom widget.
                //The widget_types object is a map of which type belongs to which widget.
                let widgetClass = Widget
                let widget = new widgetClass({ label, values, type })
                if (type == 'choose') {
                    if (!values) {
                        throw new Error(`Since input type is '${type}', please pass a 'values' parameter in the second function argument`)
                    }
                    for (var value in values) {
                        widget.add({ value, label: values[value] })
                    }
                }
                widget.addEventListener('change', () => {
                    this.dispatchEvent(new CustomEvent('change'));
                });

                //Always remove the existing input element. The reason is simple, we can set the type variable over and over again.
                //Therefore, we have to clear previous traces.
                this.html.$('.container').children[0]?.remove();

                this.html.$('.container').appendChild(widget.html);

                return;
            }
        }




        this.html.$('.container').children[0]?.remove();
        const txtB = new MultiFlexFormTextbox(...arguments)
        this.html.$('.container').appendChild(txtB.html)

        txtB.addEventListener('change', () => {
            this.dispatchEvent(new CustomEvent('change'))
        });


        //Hidden fields should not occupy any space
        if (type == 'hidden') this.html.classList.add('hidden')


    }

    get value() {
        return this.html.$('.container').children[0]?.object?.value
    }
    set value(value) {
        let obj = this.html.$('.container').children[0]?.object
        obj && (obj.value = value)
    }

    get name() {

        return this.html.$('.container').children[0]?.object?.name
    }

    set name(name) {

        try {
            return this.html.$('.container').children[0].object.name = name;
        } catch (e) {
            console.log(e)
        }
    }

}


/**
 * We don't expect third-parties to use this class
 * The idea is to have a widget that dynamically generate input fields
 */
export class MultiFlexFormTextbox extends MultiFlexFormItem {


    /**
     * 
     * @param {string} type The input type
     * @param {object} params customization for the text box
     * @param {string} params.label The label for the text box
     * @param {string} params.name Optional (but very recommended) name of field
     * @param {any} params.value
     */
    constructor(type, params) {
        super();

        this.html.classList.add('hc-multi-flex-form-textbox')
        this.html.$('.container').classList.add('empty')


        this.html.$('.container').spawn({
            tag: ['textarea'].indexOf(type) != -1 ? type : 'input',
            type
        })

        this.htmlProperty('textarea,input', 'type', 'attribute')
        this.htmlProperty('.container', 'label', 'attribute')

        let changeTimeout;
        this.addEventListener('change', function () {
            if (changeTimeout) return;

            let doIt = () => {
                this.html.$('.container').classList[this.value == '' ? 'add' : 'remove']('empty')
                changeTimeout = undefined;
            }

            changeTimeout = setTimeout(doIt, 200);
            changeTimeout = setTimeout(doIt, 1000);
        })


        // We don't want to wait till the user exits the textbox before a change event is fired. We want it on the fly
        for (let event of ['keydown', 'keypress', 'change']) {

            this.html.$('.container >*').addEventListener(event, () => {
                this.dispatchEvent(new CustomEvent('change'));
            });
        }
        /** @type {function(('change'), function(CustomEvent), AddEventListenerOptions)} */ this.addEventListener

        Object.assign(this, params);

    }

    get value() {
        return this.html.$('input,textarea')?.value
    }
    set value(value) {
        this.html.$('input,textarea').value = value
        this.html.$('.container >*').fire('change')
    }


}


/**
 * Again! We don't expect you to make use of this class, but we export it all the same
 * This class just functions to wrap custom inputs, and provide a means of labeling them, as well as proxying input value 
 */
export class MultiFlexFormCustomInput extends MultiFlexFormItem {

    /**
     * 
     * @param {Widget} input_widget 
     */
    constructor(input_widget) {
        super();

        this.html.classList.add('multi-flex-form-custom-input');

        input_widget && (this.input = input_widget)



    }

    set input(input) {
        this.html.$('.container').appendChild(input.html);
        this.__input__ = input
    }

    get input() {
        return this.__input__;
    }

    get value() {
        return this.input.value
    }
    set value(value) {
        this.input.value = value;
    }


}