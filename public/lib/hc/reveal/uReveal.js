//Part of HolyCorn's Ouch! Project
//Copyright 2020 HolyCorn Software LLC

//Defines a layout for a retractable element

//Revised 2021 by Akwo Thomas Ngwa


import { Widget } from '../lib/widget.js';


export class Reveal extends Widget {


	constructor(short, full, extras = {}) {

		super();

		super.html = document.spawn({
			class: 'hc-uReveal',
			innerHTML: `
				<div class='short'></div>
				<div class='full'></div>
		`})

		this.html.$('.short').on('click', function () {
			this.active = !this.active;
		}.bind(this))

		Reflect.defineProperty(this.html, 'active', {
			get: () => this.active,
			set: x => this.active = x
		})

		this.short = short || ''; this.full = full || ''




		/** @type {boolean} */ this.showing
		Widget.__htmlProperty(this, this.html, 'active', 'class', undefined, 'showing')

		Object.assign(this, extras);

	}


	set short(s) {
		s = s instanceof HTMLElement ? s : document.spawn({ innerHTML: s });
		this.html.$('.short').children[0]?.remove();
		this.html.$('.short').appendChild(s);
	}
	get short() {
		return this.html.$('.short').children[0];
	}

	set full(f) {
		f = f instanceof HTMLElement ? f : document.spawn({ innerHTML: f });
		this.html.$('.full').children[0]?.remove();
		this.html.$('.full').appendChild(f);
	}
	get full() {
		return this.html.$('.full').children[0];
	}



}