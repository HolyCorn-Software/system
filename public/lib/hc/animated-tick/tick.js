/*
Copyright 2021 HolyCorn Software
This widget produces an animated tick
The widget can be animated on purpose by the caller
*/

import { Widget } from "../lib/widget.js";


export class AnimatedTick extends Widget {

    constructor() {
        super();
        super.html = document.spawn({
            class: 'hc-animated-tick',
            innerHTML: `
                <div class='container'>
                    <svg xmlns="http://www.w3.org/2000/svg" height="25px" width="25px"><g class='stroke' stroke="currentColor" stroke-width="3" fill="transparent"><path d="M2.5,12.5 L12.5,22.5 L25,5"/></g></svg>
                </div>
            `
        })
    }

    /**
     * Makes the widget to animate. That is, slowly draw a tick
     * @returns {Promise<void>}
     */
    animate() {
        return new Promise((resolve, reject) => {

            this.activated = true;
            this.html.classList.add('animated')
            resolve();
        })
    }

    /**
     * Changing this variable will make the widget either eligible or not eligible for the animation.
     * Once it is eligible for animation, the actual tick will disappear, so that it can actually get animated
     */
    set activated(state) {
        this.html.classList[state ? 'add' : 'remove']('activated')
        if(!state){
            this.html.classList.remove('animated');
        }
    }
    get activated(){
        return this.html.classList.contains('activated')
    }



}