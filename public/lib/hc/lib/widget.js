/*
Copyright 2021 HolyCorn Software
This module defines the general form of a widget in the html-hc library
It contains general helper functions that classes can use to control HTML views
*/


import * as hc from './lib.js';
import '../fonts/fonts.js'
import pluralWidgetProperty from './widget/pluralWidgetProperty.js'
/** @type {typeof import('../infinite-spinner/spinner.js').Spinner**/
let Spinner;
import('../infinite-spinner/index.js').then(x => Spinner = x.Spinner);

hc.importModuleCSS(import.meta.url); //import widget.css

/**
 * @typedef {HTMLElement & HTMLInputElement & HTMLVideoElement & HTMLAudioElement& {
 * $:function(string):ExtendedHTML,
 * $$:function(string):[ExtendedHTML],
 * on:(string, function(CustomEvent)),
 * once:(string, function(CustomEvent)),
 * spawn: function ({tag:string, innerHTML:string, class:string, children:[ExtendedHTML]}): ExtendedHTML
 * widgetObject: Widget,
 * parentElement: ExtendedHTML
 * }} ExtendedHTML
 */


export class Widget extends EventTarget {

    // A widget will not fire events when the halt_events is set to true
    /**
     * 
     * @param {{css:[string]}} param0 An array of css files files to be included
     * However is css is set to import.meta.url, the css corresponding to the widget will be imported 
     * 
     * The proxy_events attribute can be set on the widget to ensure that events that are fired on the widget will get fired on the html
     */
    constructor({ css } = {}) {
        super();

        if (typeof css == 'string') {
            hc.importModuleCSS(css)
        }
        if (css instanceof Array) {
            for (var css of css) {
                hc.importModuleCSS(css);
            }
        }
        /**@type {boolean} */
        this.proxy_events = false;

        /**@type {ExtendedHTML} */ this.html
        let html;


        //Figure out the url of the widget that called this constructor, then import the equivalent CSS
        //console.log(new Error().stack.split('\n'));

        //To understand what's happening here, first of all print a stack trace in console
        //We want to find the line before the the line that refers to this widget
        let stack = new Error().stack.split('\n');
        let thisLineNumber;
        for (let i = 0; i < stack.length; i++) {
            if (stack[i].indexOf(import.meta.url) !== -1) {
                thisLineNumber = i
                break;
            }
        }

        //Once we do, we extract the url in the line. That will be widget that called us. So we import the equivalent CSS
        let moduleURL = /(http.+):\d+:\d+/.exec(stack[thisLineNumber + 1])?.[1]
        if (moduleURL) {
            //console.log('Auto importing CSS for ', moduleURL)
            hc.importModuleCSS(moduleURL)
        } else {
            console.log(`Could not auto-import `, new Error().stack)
        }

        /** @type {function(string, function(Event))} */
        this.on

    }

    #html
    set html(value) {

        if (!(value instanceof HTMLElement)) {
            throw new Error(`An object that is not of type HTMLElement is being used as the value of 'html' property for the ${new.target.name} widget`)
        }
        value.classList.add('hc-widget')
        Reflect.defineProperty(value, 'object', {
            configurable: true,
            value: this,
        })
        Reflect.defineProperty(value, 'widgetObject', {
            configurable: true,
            value: this,
        })
        this.#html = value;

    }

    /**
     * @returns {ExtendedHTML}
     */
    get html() {
        return this.#html
    }


    /**
     * @deprecated
     */
    apply_attributes() {
        //This is useful for widgets that take properties from the constructor method and apply them all on the object
        console.warn('apply_attributes() is depreciated. Just use Object.assign(receiver, param_object)')
        for (var x in arguments[0]) this[x] = arguments[0][x]
    }

    prepare = (html = this.html) => {
        console.warn('prepare is depreciated. The role for the method is already handled when the \'html\' property is set')
        //Append the hc-widget class so that more styling can be added to every widget
        if (!html) return;
        html.classList.add('hc-widget')
        Object.defineProperty(html, 'object', {
            configurable: true, get: () => {
                console.warn(`the 'object' field is depreciated and will be removed by March 2022. Use 'widgetObject' instead`)
                return this
            }
        })
    }


    //TODO, update htmlProperty() method to always query the element each time the property is being operated upon, instead of statically
    //binding to a selected element
    /**
     * 
     * @param {string} el The selector of the element that'll be affected by the property
     * @param {string} objectProperty The name of the property on the object
     * @param {'innerHTML'|'class'|'attribute'|'inputValue'} type How does the property change the element. Is it by toggling a class, or changing it's innerHTML or something else ?
     * @param {function|undefined} onchange The function to be called when the property takes a new value
     * @param {string} attributeName_or_className The name of the class or attribute on the HTML Element that will be changed
     */
    htmlProperty(selector, objectProperty, type = 'attribute', onchange = () => 1, attributeName_or_className) {

        //Widgets need that for example, when you set the title (object) attribute, let it be effected as an HTML attribute or class
        //type can only be 'class' , 'attribute' , or 'innerHTML'

        //For example
        //      htmlProperty('.rows', 'name', 'innerHTML')
        //          This will make sure that reading and writing the 'name' property of any element selected by '.rows' will lead to a change in their innerHTML
        //The className param is specified only when type = 'class'. In so specifying, it specifies which class to toggle


        for (var element of this.html.$$(selector)) {
            ; ((element) => {

                Widget.__htmlProperty(this, element, objectProperty, type, (v) => {
                    onchange(v, element);
                }, attributeName_or_className || objectProperty);
            })(element); //There are issues in loops where variables all point to the same object, that's why we wrap around a function
        }
    }

    /**
     * This creates a property whose value is a widget that matches a specific selector
     * That is when reading the value, you get a reference to that widget, which comes from querring the DOM of this widget
     * For Example:
     * If the property is 'nav' and the widget is some kind of Navbar widget with class .hc-hcts-navbar
     * writing the 'nav' property will append the value being written (which is a Widget of course) to the parent specified by parent selector
     * Getting the 'nav' property will return the Navbar widget residing in the parent (specified by parent selector) whose selector is 'selector'
     * @param {object} param0
     * @param {string} param0.parentSelector The selector pointing to the parent element that will house this widget
     * @param {string} param0.selector The selector of the widget relative to parent
     * @param {string} param0.property The name of the property that will be bound to this object itself
     * @param {boolean} param0.should_prepend Whether we should add the widget as the first of the parent, or the last
     * @param {function(Widget)} param0.onchange The function to be called when the value has changed
     * @param {{set:function(any):Widget, get:function(Widget): any}} param0.transforms Optional parameter which defines special functions (get and set) that allow the property to accept arbitary input in order to transform it to a widget, thereby allowing the api users more freedom, as well as transform a widget into a different type of output.
     */
    widgetProperty({ selector, parentSelector, property, should_prepend, onchange = () => 1, transforms = { set: x => x, get: x => x } }) {

        Reflect.defineProperty(this, property, {
            get: () => transforms.get(this.html.$(`${parentSelector} ${selector}`)?.widgetObject),
            /**@param {Widget} widget */
            set: input => {
                let widget = transforms.set(input);
                let parent = this.html.$(parentSelector)
                parent.$(selector)?.remove() //Remove the previous value if it already exists
                parent[should_prepend ? 'prepend' : 'appendChild'](widget.html)
                onchange(widget);
            },
            configurable: true,
            enumerable: true
        })

    }


    /**
     * 
     * !!! Caution, manipulating the DOM is slow (~500ms) for some operations. Do well to put some delay in your code, where neccessary.
     * Call this method when there's a property to be bound to widget such that accessing that property obtains an array of children elements to a specific parent element.
     * 
     * 
     * `property` The property that will be accessed in order to get the widgets or HTMLElements
     * 
     * `selector` The selector of the children that will retrieved. Optionally, you can pass a child example to avoid passing this param
     * 
     * `example` Use this in place of a selector in order to determine the type of children that will be retrieved by the property.
     * 
     * `parentSelector` The parent containing the children
     * 
     * `childType` The type of children you want to access. By passing an `example` you don't have to specify this property. However, even if it is not passed, it will default to HTMLElement`
     * 
     * Passing neither `selector` nor `example` will default to selecting all children of the parent
     * 
     * `transforms` This is useful when you want users of the property to pass arbitary data like 'name', 'id', whereas the DOM receives an actual HTMLElement or Widget. And at the same time, the users of the property can get meaningful data, instead of widgets. Note that using this parameter eliminates the need for the childType parameter  You're encouraged to use this.
     * 
     * @param {object} param0 
     * @param {string} param0.selector 
     * @param {Widget} param0.example 
     * @param {string} param0.parentSelector 
     * @param {string} param0.property 
     * @param {('html'|'widget')} param0.childType 
     * @param {{
     * set: function(any): HTMLElement|Widget,
     * get: function(HTMLElement) : any
     * }} param0.transforms 
     * 
     * 
     * 
     */
    pluralWidgetProperty({ selector = '*', example, childType, parentSelector, property, transforms } = {}) {

        return pluralWidgetProperty({
            selector,
            example,
            childType,
            htmlElement: this.html,
            parentSelector,
            object: this,
            property,
            transforms
        })

    }

    /** @type {Spinner} */
    #loader_spinner;
    async loadBlock() {
        (this.#loader_spinner ||= new Spinner()).stop()
        this.#loader_spinner.start()
        this.#loader_spinner.attach(this.html)

    }

    async loadUnblock() {
        this.#loader_spinner?.detach()
        this.#loader_spinner?.stop();
    }



    fire() {
        if (this.halt_events == true) return;
        super.fire.apply(this, arguments);
        if (this.html && this.proxy_events) {
            this.html.fire.apply(this.html, arguments)
        }
    }

    /**
     * 
     * @param {object} object The object that will receive the property
     * @param {HTMLElement|HTMLInputElement} el The element that'll be affected by the property
     * @param {string} objectProperty The name of the property on the object
     * @param {'innerHTML'|'class'|'attribute'|'inputValue'} type How does the property change the element. Is it by toggling a class, or changing it's innerHTML or something else ?
     * @param {function|undefined} onchange The function to be called when the property takes a new value
     * @param {string} className_or_attributeName The name of the property on the HTML Element
     */
    static __htmlProperty(object, el, objectProperty, type, onchange = () => 1, className_or_attributeName) {
        //Ties an object property to an html property

        className_or_attributeName = className_or_attributeName || objectProperty;

        Object.defineProperty(object, objectProperty, {
            get: () => {
                switch (type) {
                    case 'attribute':
                        return el.getAttribute(objectProperty)

                    case 'class':
                        return el.classList.contains(className_or_attributeName) //for class properties, just check if they exist

                    case 'innerHTML':
                        return el.innerHTML

                    case 'inputValue':
                        let numbVal = new Number(el.value).valueOf()
                        return numbVal.toString() !== 'NaN' ? numbVal :  el.valueAsDate || el.value
                }
            },
            set: v => {
                onchange(v); //Inform the function that the value of the attribute has changed
                switch (type) {

                    case 'attribute':
                        el.setAttribute(className_or_attributeName, v);
                        break;

                    case 'class':
                        el.classList[(v === 'true') || (v == true) ? 'add' : 'remove'](className_or_attributeName)
                        break;

                    case 'innerHTML':
                        el.innerHTML = v
                        break;
                    case 'inputValue':
                        el.value = v;

                    default:
                        return; //To prevent onchange to be called on inconsequential setters

                }
            },
            configurable: true,
            enumerable: true
        })
    }

}