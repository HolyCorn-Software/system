/*
Copyright 2021 HolyCorn Software
This module helps the MultiFlexForm to have its flexibility, by being able to contain elements, and animate themselves
*/

import { Widget } from "../lib/index.js";


export class MultiFlexFormItem extends Widget {


    constructor({ css, ...args } = {}) {
        super({ css: [import.meta.url, css] });

        /**@type {import("../lib/widget.js").ExtendedHTML} */
        this.html = document.spawn({
            class: 'hc-multi-flex-form-item',
            innerHTML: `
                <div class='container'>

                </div>
            `
        })


        Object.assign(this, args);

    }

    /**
     * The MultiFlexFormItem's that are a part of this
     * @returns {[MultiFlexFormItem]}
     */
    get items() {
        return [...this.html.$('.container').children].map(x => x.object)
    }


    /**
     * Animate the movement of an element from one parent element to the other
     * @param {MultiFlexFormItem} element 
     */
    async moveTo(element, beforeElement) {

        let wait = (time) => new Promise(ok => setTimeout(ok, time)) //Let's define a function to be used for waiting

        this.remove();
        await wait(1000);
        await element.add(this, beforeElement);



    }

    /**
     * This method adds a new child in such a smooth way
     * @param {MultiFlexFormItem} new_child 
     * @param {HTMLElement} beforeElement (Optionally) specify where to insert the new child. If not specified, the new child will be the first
     * 
    */
    async add(new_child, beforeElement,) {
        let container = this.html.$('.container');

        if (new_child.html.parentElement == container) return; //Cannot add what has already been added

        beforeElement ? container.insertBefore(new_child.html, beforeElement) : container.appendChild(new_child.html);

        new_child.addEventListener('change', ()=>{
            this.dispatchEvent(new CustomEvent('change'))
        })



        //The animation would be done by then. We then return everything to normal, by removing the extra class name, and the flex-basis styles

        await new Promise(done => {

            new_child.html.addEventListener('animationend', () => {
                new_child.html.classList.remove('newChild')
                new_child.html.style.removeProperty('--current-width')
                setTimeout(() => done(), 100);
            });


            //Just before the animation starts, let's make sure its smooth
            new_child.html.style.setProperty('--current-width', new_child.html.cs['width'])
            new_child.html.classList.add('newChild');
        })

    }


    /**
     * Remove this widget from it's parent in a nice way
     * This animation works by replacing an element with a clone.
     * The clone stays in the old position and shrinks
     */
    async remove() {

        if (!this.html.parentElement) return; //No need to try removing this widget when its not even a part of something

        /**@type {HTMLElement} */
        let clone = this.html.cloneNode(true)
        this.html.replaceWith(clone);

        //console.log(`clone! `, clone)

        clone.style.setProperty('--current-width', clone.cs['width'])


        await new Promise(done => {
            clone.classList.add('shrink-clone') //CSS will take it from here with an animation to shrink the clone

            //Once CSS is done, we can now remove the clone
            clone.on('animationend', () => {
                clone.remove(); //Then remove the clone
                setTimeout(() => done(), 100);

            })
        })



    }


    /**
     * This method ensures that a widget will be contained by a parent.
     * 
     * That is, if the widget is not a part of the parent, then we are going to remove it, and append to the parent.
     * If not, we are going to let it be.
     * @param {MultiFlexFormItem} widget 
     * @param {MultiFlexFormItem} parent
     */
    static async put(widget, parent) {

        let container = parent.html.$('.container');

        if (widget.html.parentElement == container) return; //Save us the time

        await MultiFlexFormItem.prototype.remove.apply(widget)
        await parent.add(widget);


    }




    /**
     * We want a quick way to ensure that parameters of methods can both take widgets and HTMLElements interchangably
     * @param {Widget} widget 
     */
    static getWidgetHTML(widget) {
        return widget instanceof Widget ? widget.html : widget;
    }

}

