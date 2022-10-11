/*
Copyright 2021 HolyCorn Software
Part of The Choose widget
This module produces a list of searchable options
*/

import { hc } from "../lib/index.js";
import { Widget } from "../lib/widget.js";
import { PopupMenu } from "../popup-menu/popup.js";



/**
 * This just defines a menu that can be searched, with no guarantee of being an autonomous popup
 */
export class SearchableMenu extends Widget {

    /**
     * Define the search function, otherwise we can say, the function that determines if an item should be visible or removed with respect to a search text
     * To define the search function, override qualify_item_in_search(text, item)
     * The method should return true or false, indicating whether the item should or should not display
     */
    constructor() {
        super({ css: import.meta.url })

        this.html = document.spawn({
            class: 'hc-v2-choose-searchmenu',
            innerHTML: `
                <div class='container'>
                    <div class='bar'>
                        <input class='input'>
                        <img src='${hc.parsePath(import.meta.url).path}/ic_search_48px.svg' class='search-icon'>
                    </div>


                    <div class='data'>

                    </div>
                    
                </div>
            `
        })



        //Implement the search filtering process
        let search_programmed; //For optimisation. This variable hold a timeout key to a search that has been scheduled a few millis ahead, so that other searches will be declined
        this.html.$('.input').on(['keydown', 'change'], ({ target: input }) => {
            if (search_programmed) {
                return; //Let's not exhaust the CPU with too many searches
            }
            search_programmed = setTimeout(() => { //Now program a search a few millis in the future
                (async () => this.do_search(input.value))() //Call the search (Obviously, a few millis after the search was actually requested)
                search_programmed = undefined; //Now, we may allow a search to be programmed again in the future
            }, 500)

        })

    }

    /**
     * This method should be overriden to provide a more flexible search
     * 
     * @param {string} text
     * @param {MenuItem} item
     * @returns {Boolean}
     * **/
    qualify_item_in_search(text, item) {
        
        let { value, label } = item;
        if (!text || text == '' || text.length == 0) {
            return true;
        }
        text = text.toLowerCase()
        value = value ? value.toLowerCase() : value;
        label = label ? label.toLowerCase() : label;
        
        return value.indexOf(text) != -1 || label.indexOf(text) != -1;
    }

    do_search(text) {
        let { items } = this;
        for (var item of items) {
            let qual = !text || (text == '') ? true : this.qualify_item_in_search(text, item)
            item[qual ? 'show' : 'hide']()
        }
    }
    get items() {
        return [...this.html.$$('.data .hc-v2-choose-searchmenu-item')].map(x => x.object)
    }
    get selectedItem(){
        return this.items.filter(x=>x.value==this.value)[0]
    }


    /**
     * 
     * @param {object|MenuItem} item
     * @param {string} item.label
     * @param {any} item.value
     * Call this method when adding a new item to the menu. 
     * When adding a pure object (if you don't prefer to add a MenuItem),  make sure it has two important properties:
     * 
     * label - How it will appear to the user. For example 'English'
     * 
     * value - Which unique value it holds. For example 'en'
     */
    add(item) {
        if(!item.label || !item.value){
            throw new Error(`The object must have the 'label' and 'value' parameters set`)
        }
        item = item instanceof MenuItem ? item : new MenuItem(item);
        this.html.$('.data').appendChild(item.html);

        item.html.on('click', () => {
            this.value = item.value;
        })
    }

    set value(v) {
        this.__value__ = v;
        this.fire('change')
    }

    get value() {
        return this.__value__
    }

}


/**
 * Allows for a fully autonomous searchable menu to be created, that handles details such as displaying or closing itself based on clicks
 */

export class MenuItem extends Widget {
    /**
     * 
     * @param {string} label
     * @param {any} value
     * 
     * The label is what will be shown on the menu
     * The value is what will be recorded when this item is selected. The value must be unique
     */
    constructor({ label, value } = {}) {
        super({ css: import.meta.url })

        this.html = document.spawn({
            class: 'hc-v2-choose-searchmenu-item',
            innerHTML: `
                <div class='container'>
                    <div class='label'></div>
                </div>
            `
        })

        this.htmlProperty('.label', 'label', 'innerHTML')
        this.htmlProperty('.value', 'value', 'property', () => 1, 'value')


        Object.assign(this, arguments[0]);
    }

    show() {
        this.html.classList.remove('hidden-by-search')
    }
    hide() {
        this.html.classList.add('hidden-by-search');
    }

}


/**
 * This is the fully autonomous popup menu that is searchable
 */
export class SearchablePopupMenu {

    constructor() {

        this.popup = new PopupMenu()
        this.popup.searchablePopupMenuObject = this;

        this.menu = new SearchableMenu();

        this.menu.on('change', () => {
            this.popup.hide();
            this.popup.fire('change')
        })

        this.popup.content = this.menu.html;

        //We want that properties like 'value', 'html', 'effectTranslation' come from the various objects, according to where they reside.
        return new Proxy(this, {
            get: (t, p) => {
                let src; //Finally from which object shall we get the property requested by the current caller of the proxy
                src = (p in t.popup) ? t.popup : t; //Either from the popup, or from the main object

                if (src[p] instanceof Function) {
                    return src[p].bind(src); //The functions that rely on the 'this' keyword would fail without this step, because 'this' here is assigned to the proxy. Therefore, we bind this to it's rightful target
                }
                return src[p]
            },
            set: (t, p, v) => {
                let src; //Which object shall we set the property on, as requested by the current caller of the proxy
                src = (p in t.popup) ? t.popup : t; //Either from the popup, or from the main object, depending on who owns the property
                src[p] = v;
                return true; //If not, the caller would assume an error occurred.
            }
        })

    }
    get value(){
        return this.menu.value;
    }
    get html(){
        return this.popup.html;
    }

}