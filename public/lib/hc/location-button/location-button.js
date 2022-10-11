/*
Copyright 2021 HolyCorn Software
Part of the SaveMyMoMo Project
Allows access to user's location upon a single click

*/


import { Widget } from "../lib/widget.js";
import { hc } from "../lib/index.js";
import { Spinner } from '../infinite-spinner/index.js';
hc.importModuleCSS(import.meta.url);


export class LocationButton extends Widget {

    constructor() {
        super();

        this.html = document.spawn({
            class: 'hc-savemymomo-location-button',
            innerHTML: `
                <div class='container'>
                    <div class='main'>
                        <img src='/res/location.png'>
                        <div class='text'>Get Location</div>
                    </div>
                </div>
            `
        })

        this.html.$('.container').on("click", () => {
            this.getLocation();
        })

        this.html.$('.main').prepend(new Spinner().html);

        Object.assign(this, arguments[0]);

    }
    set loading(loading) {
        if (loading) {
            let spinner = this.html.$('.main .hc-infinite-spinner').object
            spinner.start();
            this.html.classList.add('loading');
        } else {
            this.html.classList.remove('loading');
        }
    }
    async getLocation() {
        this.loading = true;
        if (!navigator.geolocation) {
            return (this.loading = false) && alert('Your browser doesn\'t support location!');
        }
        navigator.geolocation.getCurrentPosition(cords => {
            this.__value__ = cords;
            this.html.$('img').src = '/res/tick.png';
            this.html.$('.text').innerHTML = "";
            this.loading = false;
        }, deny => {
            console.log(deny)
            this.loading = false;
            if (deny.code == 1) alert('Please grant us location permissions and try again');
        })

        setTimeout(() => {
            if (!this.value) {
                let field = this.html.ancestor('.field'); //check hc/lib.js Queries elements up the chain
                if (field) {
                    field.object.warn("Check the connection")
                }
            }
        }, 60 * 1000)

    }

    get value() {
        function decompose(object) {
            //Returns a full structure of the object
            let final = {}

            for (var key of [...Object.keys(object), ...Object.keys(Reflect.getPrototypeOf(object))]) {
                final[key] = ((typeof object[key]) == 'object') ? !object[key] ? object[key] : decompose(object[key]) : object[key]
            }
            return final;
        }
        if (!this.__value__) {
            return {
                coords: {
                    latitude: 1,
                    longitude: 1,
                    accuracy: 0,
                    altitude: 0,
                    heading: 1
                },
                timestamp: 0
            }
        }
        return decompose(this.__value__);
    }

}