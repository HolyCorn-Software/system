/*
Copyright 2021 HolyCorn Software
This widget is an animable form, that can receive various configurations, as to where input fields are placed and how they look

The success of this widget is based on the fact that it is built up of tiny components called items
These items in themselves are animable, and form the building blocks of the two essential components: Spaces and Fields
*/

import { Widget } from "../lib/widget.js";
import { MultiFlexFormConfiguration } from "./config.js";
import { MultiFlexFormItem } from "./item.js";


/**
 * @template FormDataType
 */
export class MultiFlexForm extends Widget {


    constructor({ css, ...args } = {}) {

        super({ css: [import.meta.url, css] });

        super.html = document.spawn({
            class: 'hc-multi-flex-form',
            innerHTML: `
                <div class='container'>
                    
                </div>
            `
        });

        /** @type {function(('change'), function(CustomEvent), AddEventListenerOptions)} */ this.addEventListener

        Object.assign(this, args)

    }

    /**
     * 
     * @param {MultiFlexFormItem} item 
     */
    add(item) {
        item.addEventListener('change', () => {
            // It is just but normal that any child (probably a input box) that changes should cause a notable change at the level of the parent
            this.dispatchEvent(new CustomEvent('change'))
        })
        this.html.$('.container').appendChild(item.html);
    }

    /**
     * The MultiFlexFormItem's that are a part of this
     */
    get items() {
        return [...this.html.$('.container').children].map(x => x.object)
    }

    /**
     * @return {FormDataType}
     */
    get value() {
        let value = {}
        for (var field of [...this.html.$$('.hc-multi-flex-form-field')].map(x => x.object)) {
            value[field.name] = field.value
        }
        return value
    }

    /**
     * This is an object that can be used to set the values of fields on the form directly, or get values all at once
     * E.g myform.values.name = 'Bernard'
     * @returns {FormDataType}
     */
    get values() {

        let fields = [...this.html.$$('.hc-multi-flex-form-field')].map(x => x.object)

        return new Proxy(() => 1, {
            set: (target, property, value) => {
                let [field] = fields.filter(x => x.name == property)
                if (field) {
                    field.value = value;
                }else{
                    console.warn(`Could not set form field ${property}`)
                }
                return true;
            },
            get: (target, property) => {
                return fields.filter(x => x.name == property)[0]?.value
            },
            apply: () => {
                return this.value
            }
        })

    }

    /**
     * This is used to set the value of multiple fields at once
     * E.g myform.values = {name:'Bernard', sex:'Male'}
     */
    set values(object) {
        //This delay is because at times, values are set immediately a form is just been initialized. By then, there are no elements in the DOM
        //With this delay, the elements that were added would have actually been part of the DOM
        setTimeout(() => Object.assign(this.values, object), 50);

    }

    /**
     * This is used used to define the layout of the form by just passing an array (of arrays (of object that look like {name:string, label:string, type:string, values: string, value:number|string}) )
     * Refer to the docs for ```MultiFlexFormConfiguration.quickCreate```
     * @see {MultiFlexFormConfiguration.quickCreate}
     */
    set quickStructure(structure) {
        MultiFlexFormConfiguration.quickCreate(structure).apply(this);
    }


}





