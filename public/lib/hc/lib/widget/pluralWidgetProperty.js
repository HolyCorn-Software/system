/*
Copyright 2021 HolyCorn Software
This module achieves one function, provide us with the pluralWidgetProperty
*/

import { Widget } from "../widget.js";



/**
 * The aim of this class is to provide a convinient way to add and remove children of an element that have been returned as a result of the pural widget property
 */
class PluralWidgetArray {

    /**
     * 
     * @param {[HTMLElement]} members The children elements
     * @param {{
     * parent: HTMLElement,
     * childType: ('widget'|'html'),
     * transforms:{
     * set:function(any):HTMLElement,
     * get:function(HTMLElement):any
     * }
     * }} param1 
     * @returns {[HTMLElement|Widget]}
     */
    constructor(members, { parent, transforms }) {

        /** @type {[HTMLElement]} */
        this.members = [...members];
        this.members.pluWid = this;




        return new Proxy(this.members, {
            get: (target, property, receiver) => {
                let entry = Reflect.get(target, property, receiver)
                if (entry instanceof HTMLElement) {
                    return transforms.get(entry)
                }
                return entry;
            },
            set: (target, property, value, receiver) => {
                // That is... If we are setting an indexed element in the array
                if ((new Number(property) >= 0)) {
                    value = transforms.set(value) //transform the value first, according to the rules
                    if (!((value instanceof HTMLElement) || (value instanceof Widget))) {
                        throw new Error(`Please set either a widget or an HTMLElement`)
                    }
                }
                //if value is number when setting the length property, then we know it's a very normal operation
                value = value instanceof HTMLElement ? value : typeof value === 'number' ? value : value.html //value is now either HTMLElement or number

                Reflect.set(target, property, value, receiver);
                PluralWidgetArray.propagateChange(this.members, parent)
                //console.log(`after set\nthis.members: %o`, this.members)
                return true;
            }
        })

    }

    /**
     * This method is used to add and remove elements of the parent's DOM according to a structure
     * @param {[HTMLElement]} members How the parent's DOM should look like (structure)
     * @param {HTMLElement} parent The parent whose DOM will be manipulated
     */
    static async propagateChange(members, parent) {


        let doChange = async () => {
            //Propagate the changes throughout the DOM
            for (let i = 0; i < members.length; i++) {
                let html = members[i];
                if (!html) {
                    console.log(html, `is invalid at ${i}`)
                    continue;
                }

                if (!parent.children[i]) {
                    parent.appendChild(html)
                } else {
                    if (parent.children[i] !== html) {
                        parent.children[i].remove()
                        await new Promise(x => setTimeout(x, 100));
                    }
                }
            }
        }
        //console.log(`propagating change for parent: %o\nmembers: %o`, parent, members)

        // // As long as all elements are not in their right place...
        // while (!members.every((member, index) => parent.children[index] == member)) {
        //     doChange(); //Keep re-iterating
        // }

        await doChange()

    }

}

/**
 * 
 * @param {object} param0 
 * @param {string} param0.property
 * @param {Object} param0.object
 * @param {{
 *      set: function(any): import("../widget.js").ExtendedHTML,
 *      get: function(import('../widget.js').ExtendedHTML): any
 * }} param0.transforms
 * @param {string} param0.selector
 * @param {string} param0.parentSelector
 * @param {Widget} param0.example
 * @param {('html'|'widget')} param0.childType
 * @param {import("../widget.js").ExtendedHTML} param0.htmlElement
 */

export default function pluralWidgetProperty({ selector = '*', example, childType, htmlElement, parentSelector, object, property, transforms = {} } = {}) {

    if (example instanceof Widget) {
        if (example.html.classList.length === 0) {
            console.warn(`The example widget doesn't even have a unique class set on it's 'html' property. All children matching the '${selector}' selector will be returned by this property\n${new Error().stack.split('\n').slice(1).join('\n')}`)
        }
        selector = example.html.classList[0] || selector
    }

    //This (parentProperty: Symbol) keeps a single reference to a PluralWidgetArray, so as curb the disadvantages that come with manipulating the DOM. 
    //The reason for this because this property is often accessed in loops, where there's constant reference to the property
    //So, by always recomputing the value of the property as we did before will lead to a situation where we compute a new value before changes that were made
    //to the DOM during the last iteration have not yet been applied. (You know the DOM is slow)
    //A common bug resulting from this phenomenom is that getting [property].length will always be the initial number.
    //E.g it was always zero
    let parentProperty = Symbol(`${property} widget array`);

    transforms ||= {}
    transforms.set ||= (widgetOrHTMLElement) => widgetOrHTMLElement
    transforms.get ||= (widget) => childType === 'html' ? widget : widget.object


    Reflect.defineProperty(object, property, {
        get: () => {
            let parent = htmlElement.$(parentSelector);
            if (!parent) {
                console.log(`No parent for property: '${property}', with selector: '${parentSelector}' `, htmlElement)
                return
            };
            //console.log(`parentSelector: '${parentSelector}'`)
            if (parent[parentProperty]) {
                return parent[parentProperty]
            } else {
                return parent[parentProperty] = new PluralWidgetArray(parent.$$(selector), { parent, transforms })
            }
        },
        set: (value) => {
            //When the property is set directly, then there's no such thing as appending
            //We make sure only the values passed will be in the HTML
            //Therefore, we remove all HTMLElement's prior

            object[property].length = 0;

            let entries = [...value]
            entries = entries.map(x => transforms.set(x));

            if (entries.length > 0 && !entries.every(x => x instanceof Widget || x instanceof HTMLElement)) {
                throw new Error(`Please pass an array of HTMLElement or Widget`)
            }
            PluralWidgetArray.propagateChange(entries, htmlElement.$(parentSelector));
            return true;
        },
        configurable: true,
        enumerable: true
    })

}