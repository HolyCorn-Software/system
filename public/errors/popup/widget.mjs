/*
Copyright 2021 HolyCorn Software
The HCTS Project
This widget is responsible for giving concise well-presented error messages to the user
*/

import { hc } from "/$/system/static/html-hc/lib/widget/index.mjs";
import { CalculatedError } from "../error.mjs";
import ActionButton from "../../html-hc/widgets/action-button/button.mjs";
import HCTSBrandedPopup from "../../html-hc/widgets/branded-popup/popup.mjs";
import hcRpc from "../../comm/rpc/aggregate-rpc.mjs";
hc.importModuleCSS(import.meta.url)

export class ErrorUI extends HCTSBrandedPopup {

    /**
     * 
     * @param {CalculatedError|string|Error} error 
     */
    constructor(error) {

        super()

        this.html.classList.add('hc-hcts-error-popup')

        this.coreHTML = document.spawn({
            class: 'hc-hcts-error-ui',
            innerHTML: `
                <div class='container'>
                    <div class='error-title'>Sorryyyy!</div>
                    <div class='error-content hc-branded-popup-blue-scrollbar'></div>
                    <div class='error-data'></div>
                    <div class='help'>
                        If you are unable to solve this error, please report to us.
                    </div>
                    <div class='actions'>
                        <div class='report'></div>
                        <div class='close'>Close</div>
                    </div>
                </div>
            `
        });


        let reportButton = new ActionButton({
            content: 'Report'
        })


        reportButton.html.on('click', () => {
            this.reportError()
        })

        this.coreHTML.$(".report").appendChild(reportButton.html)

        this.content = this.coreHTML


        /** @type {string} */ this.error_title
        this.htmlProperty('.error-title', 'error_title', 'innerHTML')
        /** @type {string} */ this.error_content
        this.htmlProperty('.error-content', 'error_content', 'innerHTML')

        /** @type {string} */ this.error_data
        this.htmlProperty('.error-data', 'error_data', 'innerHTML')



        this.html.$('.actions .close').on('click', () => this.hide())


        this.error = error;




    }

    set error(error) {

        if (error instanceof Error) {
            this.error_content = `${error.message.split('\n').join('<br>')}`
            this.error_title = error.name || 'Technical Error'
            this.error_data = `${error.id ? `<br>id: ${error.id}` : ''}${error.code ? `<br>code: ${error.code}` : ''}`
        } else {
            console.trace(`error is not an 'Error'`)
        }

        this.__error__ = error
    }

    /**
     * @returns {Error}
     */
    get error() {
        return this.__error__
    }


    async reportError() {
        let reportButton = this.html.$('.actions .report').children[0].widgetObject
        reportButton.state = 'waiting'

        try {
            let waiter = wait(3000); //This operation should take atleast 3s
            await hcRpc.system.error.report(`${this.error.stack} \ncode: ${this.error.code} \nlocation: ${window.location.href} \norigin: ${window.location.origin}\ncookies: ${document.cookie} `)
            await waiter;
            reportButton.state = 'success'
        } catch (e) {
            confirm('Failed to report error. Check your internet please.')
        }
        reportButton.state = 'initial'

    }

}

function wait(time) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), time)
    })
}