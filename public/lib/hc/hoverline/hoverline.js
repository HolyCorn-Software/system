/*
Copyright 2021 HolyCorn Software
This module defines a link that shows a line underneath when hovered
*/

import {Widget,hc} from '../lib/index.js';
hc.importModuleCSS(import.meta.url);

export class HoverLine extends Widget{

    constructor(content){
        super();
        this.html = document.spawn({
            class:'hc-hoverline',
            innerHTML:`
                <div class='content'></div>
            `
        })
        

        Object.assign(this, arguments[0]);
    }
    set content(content){
        content = typeof content =='string' ? document.spawn({innerHTML:content, class:'hc-hoverline-auto-gen'}) : content;
        this.html.$('.content').appendChild(content);
    }

    static help(){
        return `
                Copyright 2021 HolyCorn Software
                Hoverline module
            
            NOTE

            This widget is very simple in use and composition
            This widget produces a small coloured line, when the user hovers on it.

            It depends only on one important property, 'content'.
            This property can by set norminally, or by passing it as the first parameter in the constructor call

            EXAMPLE

                let link = new Hoverline();
                link.content = 'Home'
                link.html.on('click', ()=>window.location = '/');
                    OR LIKE THIS...
                link = new Hoverline('About');
                link.html.on('click', ()=>window.location = '/about.html')

            NOTE
                The content property can also take html elements

            EXAMPLE
                link = new Hoverline();
                link.content = document.spawn({
                    tag:'div',
                    innerHTML:'Welcome to <b>Bamenda</b>'
                }); //Note that document.spawn() is defined in html-hc/lib.js

            
            CUSTOMIZATION
                Simply set properties using CSS
        `
    }
    
}