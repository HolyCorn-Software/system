/*
Copyright 2021 Holycorn Software
This module produces a popup menu which houses another HTML Element
Once the user clicks in the empty space around the white zone, the popup closes, with an animation
*/

import { Widget } from "../lib/index.js";
import * as hc from '../lib/lib.js';

hc.importModuleCSS(import.meta.url);

export class PopupMenu extends Widget{

    constructor(){

        super({css:import.meta.url});

        /** @type {HTMLElement} */
        this.html = document.spawn({
            class:'hc-v2-choose-popup hidden',
            innerHTML:`
                <div class='container'> <!-- Covers the entire HTML --->
                        <div class='wrapper'>
                            <div class='data'>
                                <!--- Where the popup will be shown -->
                            </div>
                        </div>
                    
                </div>
            `
        })

        //Establish the close action (clicking outside the box)
        this.html.on('click', ({target})=>{
            if(target == this.html){
                //That is... If the event originated from the container itself, and not a child...
                this.hide();
            }
        })

        Object.assign(this, arguments[0])
        
        
    }


    /**
     * This defines what is shown on the Popup Menu
     */
    set content(html){

        if(!html instanceof HTMLElement){
            throw new Error('Sorry please pass an object of type HTMLElement')
        }

        this.html.$('.data').children[0]?.remove()
        
        this.html.$('.data').appendChild(html);
    }

    /**
     * @returns {HTMLElement}
     */
    get content(){
        return this.html.$('.data').children[0]
    }

    get visible(){
        return ! this.html.classList.contains('hidden')
    }

    /**
     * Call this method to make the popup visible
     */
    show(){
        document.body.prepend(this.html);
        document.body.classList.add('hc-v2-choose-popup-menu-be-static')
        setTimeout(()=>{
            this.html.classList.remove('hidden')
            //this.fire('show')
        }, 200);
    }

    /**
     * Call this method to hide the popup
     * 
     * Since closing the popup takes time, this method is async, and will resolve once the popup is fully closed.
     */
    hide(){
        return new Promise(done=>{
            document.body.classList.remove('hc-v2-choose-popup-menu-be-static')
            
            setTimeout(()=>{
                this.html.remove();
                setTimeout(()=>{
                    this.html.classList.add('hidden');
                    this.html.classList.remove('closing')
                    this.fire('hide')
                    done();
                }, 50);
            }, 350);
        })
    }

}
