/*
Copyright 2021 HolyCorn Software 
Infinite Spinner widget
Creates a circular loader widget that loads non-stop
*/

import {Widget} from '../lib/widget.js';
import * as hc from '../lib/lib.js'

hc.importModuleCSS(import.meta.url);

export class Spinner extends Widget{

    //The logic of this widget is multiple semi-circles that animate at different intervals

    constructor(){

        super();

        super.html = document.spawn({
            class:'hc-infinite-spinner paused',
            innerHTML:`
                <div class='container'>
                </div>
            `
        })

        for(var i=0; i<5; i++){
            this.html.$('.container').spawn({
                class:'unit',
                style:{'animation-delay':`${i*0.15}s`}
            })
        }

        Object.assign(this, arguments[0])
        
    }

    /**
     * Call this method to make the spinner start spinning
     */
    start(){
        if(this.isAttached){
            this.detach()
        }
        
        //Wait for a random time
        //We do it like this so that each spinner through out the DOM will have some uniqueness
        let {html} = this;
        html.classList.remove('paused');
        html.style.setProperty('animation-delay',`${hc.random(0, 1)}s`)
    }

    /**
     * Call this method to make the spinner to stop the spinner from spinning
     */
    stop(){
        if(this.isAttached){
            this.detach();
        }
        this.html.classList.add('paused');
    }

    /**
     * Tells us if the spinner is attached to another element
     * @returns {boolean}
     *
    */
    get isAttached(){
        return this.html.$('.hc-infinite-spinner') ? true : false
    }

    html_is_not_attached(){
        //To make sure that the html of this widget is not attached to another element
        //This is useful with the detach() and attach() methods especially
        if(this.isAttached){
            throw new Error(`This widget is probably attached to another element`);
        }
        return
    }
    
    attach(element){
        //Make sure spinner is already running before calling this method
        //Call Spinner.start() first

        this.html_is_not_attached(); //Will throw an exception if html is attached

        //So that we can freely reassign our html
        this.html.remove();

        //First we put the html (this.html) into an HTMLElement with class blocker, so that the blocker can cover the whole element to be blocked, while containing the orignal spinner html
        this.html = document.spawn({
            class:'hc-infinite-spinner-blocker',
            children:[this.html]
        })


        //Mimicing extra properties like border radius makes the blocker to fit even better
        for(var attribute of ['border-radius']){
            //The 'cs' attribute is defined in ../lib.js
            this.html.style.setProperty(attribute, element.cs[attribute])
        }

        //In CSS children elements (like blocker html) are positioned relative to the next positioned element up the chain
        //So we position the element to be blocked (by setting position:relative) in order that our blocker html may also be positioned
        if(element.cs['position']==='static'){ //'static' is the default value when an element is not positioned
            element.style.setProperty('position', 'relative');
        }


        //So that the blocker scrolls with the element to be blocked
        element.prepend(this.html);

        //We want special css properties to apply to blocked elements. These elements we shall identify with a special class
        element.classList.add('hc-infinite-spinner-blocker-attached')

    }
    detach(){ //If you called, spinner.attach() recently to block an element, you can use this method to reverse the process
        //Call spinner.stop() first, if need be

        if(!this.isAttached){
            return console.trace('Not attached in the first place'); //Cannot detach what is not attached
        }

        let attachment_error = false;
        try{
            this.html_is_not_attached();
            //If the method this.html_is_not_attached() is called successfully, then the widget is not attached
            //So if the widget is not attached to another element, what are we detaching ?
            attachment_error = true;
        }catch(e){
            //Yes! the method is expected to throw an exception
            //Otherwise it is not attached

        }

        if(attachment_error){
            throw new Error(`Cannot detach widget`)
        }
        //Remove the special CSS properties that used to apply to the containing element when it was blocked
        this.html.parentElement.classList.remove('hc-infinite-spinner-blocker-attached')
        
        this.html.remove();
        this.html = this.html.$('.hc-infinite-spinner');

    }

    /**
     * Block an element while a promise is being executed
     * @param {HTMLElement} element 
     * @param {Promise} promise 
     */
    async attachWithPromise(element, promise){
        this.start()
        this.attach(element)
        let error;
        try{
            await promise
        }catch(e){
            error = e;
        }

        this.detach()
        this.stop()

        if(error){
            throw error
        }
    }


    static help(){
        return `
                Copyright 2021 HolyCorn Software
                Spinner Widget

            
            NOTE
            This widget is very simple to use, having few functions
            

            EXAMPLE
                let spinner = new Spinner();
                spinner.start()

                setTimeout(()=>{
                    spinner.stop()
                }, 5000)

            

            NOTE
            Use the attach() function to block a specific element on the UI with a spinner animation

            EXAMPLE
                spinner.attach($('form'))
                spinner.detach() //Unblock element
            
            
            NOTE
            make sure to call spinner.start() before spinner.attach()


        
            CUSTOMIZATION
            To change the color of the spinner use CSS to set the --hc-spinner-color attribute
            To change the background color of the spinner set the --hc-spinner-blocker-bg on the blocker element
                Note that the blocker element is the html of a spinner widget when the attach() function has been called.
                It ceases to exist when the detach() function has been called

        
        `
    }
    
}