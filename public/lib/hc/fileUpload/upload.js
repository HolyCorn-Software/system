

import { ActionButton } from '../action-button/button.js';
import { Widget } from '../lib/widget.js'

import { hc } from '../lib/index.js'
import { Spinner } from '../infinite-spinner/spinner.js';

hc.importModuleCSS(import.meta.url);

/**
 * @typedef {function('error'|'change')} EventCallback
 */

export class UniqueFileUpload extends Widget {



    /**
     * 
     * @param {{
     * label:string,
     * type:string
     * }} param0 
     * @param {string} paramString - Base 64 encoded JSON string that sets special parameters like url
     */
    constructor({ label, type } = {}, paramString) {

        super();

        super.html = document.spawn({
            class: 'hc-uniqueFileUpload',
            innerHTML: `
                <div class='container'>
                    <div class='main'>
                        <div class='label'></div>
                        <input type='file'>
                        <img>
                    </div>

                    <div class='actions'>
                        <div class='confirm'></div>
                        <div class='cancel'></div>
                    </div>
                    
                </div>
            `
        });

        let originalLabel //original because it is set once
        this.htmlProperty('.label', 'label', 'innerHTML', label => {
            originalLabel ||= label
        })

        this.htmlProperty('input', 'fileType', 'attribute')

        this.htmlProperty()


        let confirm = new ActionButton({
            content: 'Confirm'
        })
        confirm.onclick = this.doUpload.bind(this)

        let cancel = new ActionButton({
            content: 'Cancel'
        })
        cancel.onclick = () => {
            this.empty = true;
        }

        this.html.$('.confirm').appendChild(confirm.html)
        this.html.$('.cancel').appendChild(cancel.html)

        this.html.$('.main').on('click', () => {
            this.html.$('input').click();
        });

        //When the file input changes, we apply the change to the actual widget
        this.fileInput.on('change', () => {
            this.value = this.fileInput.value;
        })

        



        Object.assign(this, arguments[0])

        if (!this.label) {
            this.label = 'Click to Select'
        }

        if (paramString) {
            this.paramString = paramString; //In a form e.g MultiFlexForm, it is the type attribute that is being used
        }

        /** @type {EventCallback} */ this.addEventListener
        /** @type {EventCallback} */ this.on

        /** @type {string} */ this.value
        let thisDotValue;
        Reflect.defineProperty(this, 'value', {
            set: (v) => {
                thisDotValue = v
                this.fire('change');
            },
            get: () => thisDotValue,
            configurable: true,
            enumerable: true
        })


        //Manipulating this property will hide and show specific parts of the UI, which can either allow or stop the user from uploading
        /** @type {boolean} */ this.empty
        Reflect.defineProperty(this, 'empty', {
            get: () => this.fileInput.value === '',
            set: (v) => {
                this.html.classList[v ? 'remove' : 'add']('hasFile')
                this.label = !v ? UniqueFileUpload.getShortName(this.fileInput.files?.[0]?.name || `Already uploaded`, 20) : originalLabel;
                if (!v) return
                confirm.state = ''
                this.fileInput.value = ''
            }
        })
        

        // When the value of the widget changes, decide whether or not the input value is empty, and so allow or disallow uploads
        //As well as place the tiny image preview
        this.on('change', () => {
            this.empty = this.fileInput.value === ''
            this.html.$('img').src = this.value;
        })
    }

    /**
     * For example uniqueFileUpload(dW5kZWZpbmVk)
     * Or uniqueFileUpload(<any-param-string>)
     */
    set type(type) {
        //Knowing that is set from a form like MultiFlexForm
        this.paramString = /\((.+)\)$/.exec(type)?.[1]
    }
    get type() {
        return `uniqueFileUpload${this.paramString})`
    }


    /**
     * @returns {HTMLInputElement}
     */
    get fileInput() {
        return this.html.$('input')
    }

    /**
     * Use a param string to set properties on this widget
     */
    set paramString(string) {
        //The params set the following attributes
        //  url
        //  maxSize
        //  type
        if (!string) {
            return console.trace('null param string')
        }
        console.log(`Setting paramString to `, string)
        let object = UniqueFileUpload.decodeParamString(string)
        let { url, maxSize, type } = object
        Object.assign(this, { url, maxSize, type })
    }

    get paramString() {
        //Remember that only url, maxSize and type are important to param strings
        return UniqueFileUpload.encodeToParamString(
            ({ url, maxSize, type }) => ({ url, maxSize, type })(this)
        )

    }

    async doUpload() {

        let file = this.html.$('input').files[0]

        let formData = new FormData();
        formData.append('file', file);

        /** @type {ActionButton} */
        let button = this.html.$('.confirm').children[0].object
        button.state = 'waiting';


        try {
            let reply = (await fetch(this.url, {
                method: 'POST',
                body: formData
            }))
            if (reply.status !== 200) {
                throw await reply.text()
            }
            this.value = (await reply.json()).url
            this.fire('change')
        } catch (e) {
            this.fire('error', { detail: e })
            return button.state = ''
        }

        button.state = 'success'

    }

    #spinner = new Spinner()
    set waiting(state) {
        if (state) {
            this.#spinner.start()
            this.#spinner.attach(this.html)
        } else {
            this.#spinner.detach()
            this.#spinner.stop()
        }
    }
    get waiting() {
        return this.#spinner.isAttached
    }

    /**
     * This shortens a name like 'profile photo of me in the beach.jpg' to 'profile...jpg'
     * @param {string} name 
     * @param {number} maxLength 
     * @returns {string}
     */
    static getShortName(name, maxLength) {
        if (name.length <= maxLength) return name
        if (maxLength < 6) {
            throw new Error('Cannot shorten name to a length less than six(6)')
        }
        return `${name.substring(0, maxLength - 6)}...${name.substring(name.length - 3, name.length)}`
    }

    /**
     * A param string is a Base-64 encoded JSON representation of an object, that's meant to be used as parameters to a function.
     * @param {string} string 
     */
    static decodeParamString(string) {
        return JSON.parse(
            atob(string)
        )
    }

    static encodeToParamString(object) {
        return btoa(
            JSON.stringify(
                object
            )
        )
    }

}