/*
Copyright 2021 HolyCorn Software
This module is part of hc base library
It produces a widget that function like an input field
The widget displays a popup menu when clicked, allowing the user to choose among alternatives
*/


import {Widget} from '../lib/widget.js';
import { SearchablePopupMenu } from './menu.js';


export class Choose extends Widget{

    constructor(){
        super({css:import.meta.url})

        this.html = document.spawn({

            class:'hc-v2-choose',
            innerHTML:`
                <div class='container'>
                    <div class='label'>Choose</div>
                </div>
            `
        })

        this.htmlProperty('.container .label', 'label', 'innerHTML')

        this.html.on('click', ()=>{
            this.searchPopupMenu.popup.show();
        })
        

        //This is a temporary mock object
        this.searchPopupMenu = new SearchablePopupMenu()


        //Make sure that when an item is selected, we update the UI to reflect the selection
        this.searchPopupMenu.menu.on('change', ()=>{
            this.fire('change')
            this.label = this.searchPopupMenu.menu.selectedItem.label
        })

        Reflect.defineProperty(this, 'value', {
            get:()=>this.searchPopupMenu.value,
            set:v=>(this.searchPopupMenu.value=v)||true
        })
        

        Object.assign(this, arguments[0])
        
        
    }

    /**
     * 
     * @param {{
     * label:string,
     * name:string
     * }} item 
     */
    add(item){
        this.searchPopupMenu.menu.add(item);
    }
    
}