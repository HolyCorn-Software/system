/*
Copyright 2021 HolyCorn Software
This widget is a part of the multi-form widget 

This widget can count 1,2,3,4, ... to show the progress of the user filling the form

*/

import { Widget } from "../lib/widget.js";
import  '../fonts/fonts.js';
import * as hc from '../lib/lib.js';

hc.importModuleCSS(import.meta.url);

export class Progress extends Widget{

    constructor({enums, length, value}={}){
        super();
        //The enums variable allows for optional customized counting
        //Instead of '1', '2', '3',  we rather have  'a', 'b', 'c',  or 'x', 'y', 'z'
        //In the event where the enum passed is shorter than the length of the progress widget, it continues with '1', '2', '3'

        this.html = document.spawn({
            class:'hc-multiform-progress',
            innerHTML:`
                <div class='container'>
                    <div class='points'></div>
                </div>
            `
        })

        this.points = []; //Store the dots (1,2,3,4,...) that show the progress

        Object.assign(this, arguments[0]); //Every parameter passed in the constructor should be applied to the object
        
    }

    /**
     * @param {Point}
     */
    add(point){
        if(!(point instanceof Point)){
            throw Error(`Please pass an object of type Point`)
        }
        this.points.push(point);
        this.html.$('.container .points').appendChild(point.html);
        point.html.$('.data').on('click', ()=>{
            this.value = this.points.indexOf(point);

        })

        this.fire('length_change'); 
    }

    /** 
    @param {Point}
    */
    remove(point){
        point.html.remove();
        this.points = this.points.filter(x=>x!=point);
        this.fire('length_change');
    }
    
    /**
     * @param {number} length
     */
    set length(length){
        //This is what gives the widget its simplicity and power
        
        //Remove all points after the length
        this.points.filter((x,i)=>i>=length).forEach(x=>this.remove(x));

        //Add points to fill the space (in case the length is longer than the current number of points)
        for(var i=this.points.length; i<length; i++){
            //We can either add a point using values supplied by the enum array (leading to flexibility and allowing values like 'a', 'b', 'c')  OR natural numbers like 1,2,3
            //i+1 because natural numbers start from 1
            this.add(new Point({value:this.enums?this.enums[i]||i+1:i+1}))
        }
        
    }

    /**
     * @param {number}
     */
    get value(){
        return this.__value__;
    }

    /**
     * @param {number}
     */
    set value(v){
        for(var point of this.points){point.active = false}; //Cancel all other points
        this.points[v].active = true; //Make the target point active
        this.__value__ = v;
        this.fire('change');
    }

    static help(){
        return `
            Copyright 2021 HolyCorn Software
            Progress Widget (part of  Multi form Widget)

            
            
            The functioning may be very complex, however, the use is ultimately simple
            The elements of the widget are auto-gen, once you specify a length
            For example
                let form_steps_123 = new Progress()
                form_steps_123.length = 4
            The above code will produce a progress bar with 4 steps labeled 1,2,3,4
                
            You can however specify the values to be used to label the steps
                let form_steps_abc = new Progress({enum:['a','b', 'c']})
                form_steps_abc.length = 3;

            Optionally, you can do it like this
                let one_line_progress = new Progress({length:5, value:3})
            or like this
                one_line_progress = new Progress({length:4, value:2, ['a', 'b', 'c', 'd]})

            Generally speaking, all widgets allow the possibility of directly specifying object attributes in the first constructor parameter




            EVENTS
            The widget fires a change event each time the length is changed, or the 'value' attribute (current step) has changed
            


            CSS CUSTOMIZATIONS

            It is advisable to take a look at the stylesheet for this module
            The class name for this widget is hc-multiform-progress
            You can change the following variables to alter various colours
            --main-color
            --active-color
            --active-color-bg

            You can change the font-family by changing the font-family CSS property of the widget as a whole

            Note!
            This widget takes the entire space allocated to it, and spaces it's points accordingly. It will take up the whole screen if it is allowed to

            Piece of advice!
            When choosing colours, choose colours from the same palette. https://colorhunt.co can be of help

        `
    }
    
    
}


export class Point extends Widget{
    
    //This widget is a single digit, like '1' or '2', or 'a' 'b' 'd'
    
    constructor({value}){
        super();
        this.html = document.spawn({
            class:'hc-multiform-progress-point',
            innerHTML:`
                <div class='container'>
                    <div class='data'></div>
                    <div class='hold-trailer'>
                        <div class='trailer'>
                            <div class='trailer-bar'></div>
                        </div>
                    </div>
                </div>
            `
        })

        this.htmlProperty('.container .data', 'value', 'innerHTML', c=>{
            this.fire('change');
        }); //Check source ../lib/widget.js

        //Bind the 'active' attribute to the element's class, so that CSS can provide different styling
        Widget.__htmlProperty(this, this.html, 'active', 'class', c=>{
            this.fire('change');
        });

        super.apply_attributes(arguments[0])

        
    }
    
    
}