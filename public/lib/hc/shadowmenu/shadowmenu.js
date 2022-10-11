/*
Copyright 2021 HolyCorn Software LLC
This module is a popup that appears when another element has been hovered upon
*/

import {Widget} from '../lib/widget.js';
import * as hc from '../lib/lib.js'

export class ShadowMenu extends Widget{

	/**
	 * 
	 * @param {HTMLElement} html 
	 * @param {HTMLElement} trigger 
	 * 
	 * The Shadow Menu is a convinient way to make a popup
	 * 
	 * 'trigger' is the element to be hovered on
	 * 
	 * 'html' is the menu to be displayed
	 */

	constructor({html, trigger}) { //html parameter signifies the menu element
		super();

		html = html || document.spawn({
			innerHTML: 'Shadow Menu'
		});

		this.rawHTML = document.spawn({
			class: 'hc-shadowmenu'
		})


		let mouseover_trigger = (e) => {
			try {
				document.body.appendChild(this.rawHTML);
				let thisWidth = this.rawHTML.getBoundingClientRect().width;
				let { top: y, right: x, width: triggerWidth } = this.trigger.getBoundingClientRect();
				this.rawHTML.style.top = `${y}px`
				this.rawHTML.style.left = `${x - (thisWidth / 2) - (triggerWidth / 2)}px`
			} catch (e) {
				console.log(e);
			}
			if (this.trigger) this.rawHTML.classList.add('active');
		}

		let closeFunction = () => {
			this.rawHTML.classList.remove('active');
			window.removeEventListener('mousemove', mouse_checker);
			triggerEl && triggerEl.removeEventListener('mouseenter', mouseover_trigger);

		}

		let mouse_checker = (e) => {
			// This function is called when the mouse moves when the menu is active
			try {
				let { top: ty, left: tx } = this.trigger.getBoundingClientRect();
				let { top: hy, left: hx } = this.rawHTML.getBoundingClientRect();

				function within(rect, allowance = 15) {
					//If the mouse is within a given rectangle
					return e.clientX >= rect.left - allowance && e.clientX <= rect.right + allowance && e.clientY >= rect.top - allowance && e.clientY <= rect.bottom + allowance
				}
				if (!(within(this.trigger.getBoundingClientRect()) || within(this.rawHTML.getBoundingClientRect()))) {
					closeFunction();
				}
			} catch (e) {
				console.log(e);
			}

		}

		let triggerEl = false; //Trigger element

		Object.defineProperty(this, 'trigger', {
			get: () => this.__triggerEl__,
			set: t => {
				if (t == undefined) throw Error(`trigger cannot be undefined`)
				closeFunction();
				t && window.on('mousemove', mouse_checker);
				t && t.on('mouseenter', mouseover_trigger)

				this.__triggerEl__ = t
			}
		})

		Object.assign(this, arguments[0]);


	}
	disable() {
		this.trigger = undefined;
	}
	get html() {
		return this.rawHTML.children[0]
	}
	set html(html) {
		try {
			this.rawHTML.children[0].remove();
		} catch (e) { }
		this.rawHTML.appendChild(html)
	}

}

hc.importModuleCSS(import.meta.url);