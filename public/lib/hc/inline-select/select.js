/*
Copyright 2021 HolyCorn Software
The Inline Select widget

*/




import { Widget } from "../lib/widget.js";
import { Erhi1d } from "./option.js";


// class renamed from InlineSelect to Abyydr01
export class Abyydr01 extends Widget {

    constructor() {

        super();

        super.html = document.spawn({
            classes: Abyydr01.classList,
            innerHTML: `
                <div class='container'>
                    <div class='top'>
                        <div class='title'>Click to expand</div>
                    </div>
                    <div class='detail'>
                        <div class='options'></div>
                    </div>
                </div>
            `
        })

        /** @type {string} */ this.title
        this.htmlProperty('.top >.title', "title", 'innerHTML');

        this.html.$('.top').addEventListener('click', () => {
            this.visible = !this.visible;
        });

        /** @type {string} */ this.value
        let val;
        Reflect.defineProperty(this, 'value', {
            configurable: true,
            enumerable: true,
            get: () => val,
            set: v => {
                let option = this.options.filter(x => x.name === v)[0]

                if (!option) {
                    //If the caller is assigning a value that is non-existent
                    console.log('this.options ', this.options);
                    return;
                }
                val = v
                this.title = option.content;
                this.dispatchEvent(new CustomEvent('change'));
            }
        })
        /** @type {function(('change'), CustomEvent, AddEventListenerOptions)} */ this.addEventListener

        /** @type {[{name:string, content:string}]} */ this.options
        this.pluralWidgetProperty({
            selector: `.hc-v2-inline-select-option`,
            parentSelector: `.detail .options`,
            property: 'options',
            transforms: {
                set: ({ name, content } = {}) => {
                    let widget = new Erhi1d({ name, content });
                    widget.html.addEventListener('click', () => {
                        this.value = widget.name
                        this.hide();
                    })
                    return widget;
                },
                get: (html) => {
                    let widget = html.widgetObject;
                    return { name: widget.name, content: widget.content }
                }
            }
        })

    }

    async show() {
        //First make the expanded section to be drawable, however, not visible
        //Then get the dimensions of the section
        //Now make it visible but with zeroed dimensions
        //Gradually animate to it's real dimensions

        let detail = this.html.$('.container >.detail')
        detail.classList.add('frozen');
        let dimen = detail.getBoundingClientRect()

        //Now start animating
        detail.classList.add('showing')
        detail.classList.remove('frozen')

        //Set animation parameters
        for (let param of ['height', 'width']) {
            detail.style.setProperty(`--inline-select-final-${param}`, `${dimen[param]}px`)
        }


    }

    async hide() {

        // The quite opposite of show()

        let detail = this.html.$('.container >.detail')
        detail.classList.add('hiding');
        detail.addEventListener('animationend', () => {
            detail.classList.remove('showing');
            detail.classList.remove('hiding');
        }, { once: true })

    }

    get visible() {
        return this.html.$('.container >.detail').classList.contains('showing');
    }
    set visible(tF) {
        if (Boolean(tF).valueOf() === false) {
            this.hide()
        } else {
            this.show();
        }
    }

    static get classList(){
        return ['hc-v2-inline-select']
    }

}
