/*
Copyright 2021 HolyCorn Software
Standard button that can be in a beautiful loading state
*/

import { Spinner } from "../infinite-spinner/spinner.js";
import { Widget } from "../lib/widget.js";
import { ActionButtonMessageAPI } from "./message.js";

let states;
Promise.all(
    [
        'success',
        'waiting',
        'disabled',
    ].map(async x => ({ module: await import(`./states/${x}/index.js`), name: x }))
).then(stateInfo => states = stateInfo)




export class ActionButton extends Widget {

    constructor({ content, onclick } = {}) {

        super({ css: import.meta.url })

        super.html = document.spawn({
            class: 'hc-action-button hoverAnimate',
            innerHTML: `
                <div class='container'>
                    <div class='overlay'></div>
                    <div class='content'></div>
                </div>
            `
        })

        this.spinner = new Spinner();
        this.notification = new ActionButtonMessageAPI(this);
        /**
         * So that setting the 'state' attribute to a given value will lead to executing a module named after the value
         */
        Widget.__htmlProperty(this, this.html, 'state', 'attribute', async (newState) => {
            let [stateData] = states.filter(x => x.name === newState)

            //Remove any previous states
            if (this.state) {
                states.filter(x => x.name == this.state)[0]?.module.default.unset(this)
            }
            if (stateData) {
                //Execute the module on this button, to set the state
                await stateData.module.default.set(this)
            }
        }, 'state')
        /** @type {('success'|'waiting'|'disabled' | '')} */ this.state;

        /** @type {function(('click'), function(CustomEvent), AddEventListenerOptions} */ this.addEventListener



        Object.assign(this, arguments[0])
        this.html.on('click', () => this.dispatchEvent(new CustomEvent(('click'))) );

    }
    set content(content) {
        content =
            content instanceof HTMLElement ? content
                : typeof content == 'string' ?
                    document.spawn({
                        innerHTML: content
                    })
                    : content.html instanceof HTMLElement ?
                        content.html : undefined;
        if (!content) {
            throw new Error(`Pass either a string or an HTMLElement or a Widget`)
        }

        this.html.$('.content').children[0]?.remove()
        this.html.$('.content').appendChild(content)
    }

    get content() {
        return this.html.$('.content').children[0]
    }

    set waiting(boolean) {
        if (boolean) {
            this.spinner.start()
            this.spinner.attach(this.html.$('.overlay'))
        } else {
            this.spinner.detach()
            this.spinner.stop()
        }
    }

    /** @param {function} functIon */
    set onclick(functIon) {
        this.html.onclick = functIon
    }

    /** @returns {function} */
    get onclick() {
        return this.html.onclick;
    }

}