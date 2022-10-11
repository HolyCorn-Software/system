/*
Copyright 2021 HolyCorn Software
The ActionButton module
This sub-module (success) creates a tick animation, signifying that an action was performed successfully

*/

import { hc } from '../../../lib/index.js';

/**
 * @param {import('../../button.js').ActionButton} widget 
 */
hc.importModuleCSS(import.meta.url);

export default{
    /* This is called by the ActionButton, to create the state */
    async set(widget){
        widget.html.$('.overlay').spawn({
            class:'success-tick',
            innerHTML:`
            <svg xmlns="http://www.w3.org/2000/svg" height="25px" width="25px"><g class='stroke' stroke="currentColor" stroke-width="3" fill="transparent"><path d="M2.5,12.5 L12.5,22.5 L25,5"/></g></svg>
            `
        })
    },
    async unset(widget){
        widget.html.$('.overlay .success-tick').remove()
        await new Promise(x=>setTimeout(x, 500));
    }
} 