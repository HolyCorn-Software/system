/*
Copyright 2021 HolyCorn Software
This widget allows us to set a waiting state on the Action Button
*/

import { Spinner } from "../../../infinite-spinner/spinner.js"
import { ActionButton } from "../../button.js";

const spinnerStorageKey = Symbol(`Waiting state spinner storage key`)

export default{

    /** 
     * @param {ActionButton} widget
     */
    async set(widget){
        const spinner = widget[spinnerStorageKey] = new Spinner();
        spinner.start();
        spinner.attach(widget.html.$('.overlay'))
    },
    async unset(widget){
        const spinner = widget[spinnerStorageKey]
        spinner.detach()
        await new Promise(p=>setTimeout(p, 1000))
        spinner.stop()
    }
    
}