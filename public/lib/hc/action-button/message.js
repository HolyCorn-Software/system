/*
Copyright 2021 HolyCorn Software
The ActionButton widget
This module allows the button to display custom messages
*/

import { hc } from "../lib/index.js";
import { Widget } from "../lib/widget.js";

hc.importModuleCSS(import.meta.url);
let { path } = hc.parsePath(import.meta.url)

class ActionButtonMessage extends Widget {

    constructor({ icon, content, button } = {}) {
        super();

        super.html = document.spawn({
            class: 'hc-action-button-message',
            innerHTML: `
                <div class='container'>
                    <div class='main'>
                        <div class='message'>
                            <div class='icon'>
                                <img src='${path}/icons/warn.svg'>
                            </div>
                            <div class='content'>Warning !</div>
                        </div>
                    </div>
                </div>
            `
        });

        this.htmlProperty('.message .content', 'content', 'innerHTML')
        this.htmlProperty('img', 'icon', 'attribute', undefined, 'src');


        Object.assign(this, arguments[0])

        /** @type {string} */ this.icon
        /** @type {string} */ this.content
        /** @type {import('./button.js').ActionButton} */ this.button
    }
    async show(timeout = Infinity) {
        this.html.remove()
        this.button.html.appendChild(this.html)
        setTimeout(()=>this.html.classList.add('visible'), 20)

        if (timeout !== Infinity && timeout !== 0) {
            setTimeout(() => this.hide(), timeout+20);
        }

        await new Promise(resolve => {
            this.html.on('transitionend', resolve)
        })
    }
    async hide() {
        if (!this.html.classList.contains('visible')) {
            return
        }
        this.html.classList.remove('visible')
        await new Promise(resolve => {
            this.html.on('transitionend', resolve)
        })
        this.html.remove();
    }


}


export class ActionButtonMessageAPI {

    /**
     * 
     * @param {import('./button.js').ActionButton} actionButton 
     */
    #button;
    #messenger;
    constructor(actionButton) {
        this.#button = actionButton;
        this.#messenger = new ActionButtonMessage({ button: this.#button })
    }

    async warn(message, timeout = Infinity) {
        this.#messenger.content = message;
        this.#messenger.icon = `${path}/icons/warn.svg`
        this.#messenger.show(timeout)
    }


}
