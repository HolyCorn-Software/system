//© HolyCorn Software 2020


document.$$ = HTMLElement.prototype.$$ = function (e) {
	/* Implement ancestor query 
	E.g 'a %.button% img'
	This works by querring every a, then for each a, associate a parent .button, then for every .button, associate an image
	The reason this algorithm works in recursive situations e.g %.button% %div% img is because each time, only part of the string is queried
	*/
	let trim = /^(.+) $/.exec(e)
	e = trim ? trim[1] : e; //Trim the characters just before the end (just in case)
	let ancesReg = /([^'"]*.*) *%(.+)% *(.*)/;
	if (ancesReg.test(e)) {
		let [, beforeQ, parentQ, afterQ] = ancesReg.exec(e); //Before query, parent Query after Query, after Query.
		let temp = (this.$$(beforeQ).length ? [...this.$$(beforeQ)] : this == document ? [] : [this]).map(x => x.ancestor(parentQ)).filter(x => typeof x != 'undefined').map(x => afterQ ? x.$$(afterQ) : x);
		let final = []
		temp.forEach(x => { try { [...x].forEach(x => final.push(x)) } catch (e) { final.push(x) } });
		return final;
	}//Weldone!

	try { return this.querySelectorAll(e); } catch (e) { return }
}
export let $$ = document.$$.bind(document);

document.$ = HTMLElement.prototype.$ = function (e0) { return this.$$(...arguments)[0] }

export let $ = document.$.bind(document);

if (!window.$) {
	//jQuery uses $. Let's avoid them
	window.$ = $;
}



HTMLElement.prototype.spawn = document.spawn = function ({ tag = 'div', style = {}, classes = [], innerHTML = '', attributes = {}, direct = {}, onclick = () => 2, events = {}, children = [], ...rest }) {
	let element = document.createElement(tag);
	element.onclick = onclick;
	element.innerHTML = innerHTML;
	for (var child of children) { element.appendChild(child); }
	for (var [prop, val] of Object.entries(rest)) { element.setAttribute(prop, val); }
	for (var [prop, val] of Object.entries(attributes)) { element.setAttribute(prop, val); }
	this == document ? 0 : this.appendChild(element);
	for (var [p, v] of Object.entries(style)) {
		element.style.setProperty(p, v);
	}
	for (var [e, f] of Object.entries(events)) {
		element[e] = f;
	}
	for (let [a, b] of Object.entries(direct)) { element.a = b }
	for (let clas of classes) { element.classList.add(clas); }
	return element;
}


HTMLElement.prototype.selects = function (selector) {
	//Useful for the ancestor function
	//This function determines if a selector matches a certain element
	let el = this;
	try { return [...(this == document.body.parentElement ? window : this.parentElement).$$(selector)].some(e => e == el); } catch (e) { }
}

HTMLElement.prototype.ancestor = function (selector) { //Nothing I love more than Logic!
	let ancestor = this;
	while ((ancestor = ancestor.parentElement) != null) {
		if (ancestor.selects(selector)) return ancestor;
	}
}



//Minified md5
try {
	(function (n) { "use strict"; function d(n, t) { var r = (65535 & n) + (65535 & t); return (n >> 16) + (t >> 16) + (r >> 16) << 16 | 65535 & r } function f(n, t, r, e, o, u) { return d((c = d(d(t, n), d(e, u))) << (f = o) | c >>> 32 - f, r); var c, f } function l(n, t, r, e, o, u, c) { return f(t & r | ~t & e, n, t, o, u, c) } function v(n, t, r, e, o, u, c) { return f(t & e | r & ~e, n, t, o, u, c) } function g(n, t, r, e, o, u, c) { return f(t ^ r ^ e, n, t, o, u, c) } function m(n, t, r, e, o, u, c) { return f(r ^ (t | ~e), n, t, o, u, c) } function i(n, t) { var r, e, o, u; n[t >> 5] |= 128 << t % 32, n[14 + (t + 64 >>> 9 << 4)] = t; for (var c = 1732584193, f = -271733879, i = -1732584194, a = 271733878, h = 0; h < n.length; h += 16)c = l(r = c, e = f, o = i, u = a, n[h], 7, -680876936), a = l(a, c, f, i, n[h + 1], 12, -389564586), i = l(i, a, c, f, n[h + 2], 17, 606105819), f = l(f, i, a, c, n[h + 3], 22, -1044525330), c = l(c, f, i, a, n[h + 4], 7, -176418897), a = l(a, c, f, i, n[h + 5], 12, 1200080426), i = l(i, a, c, f, n[h + 6], 17, -1473231341), f = l(f, i, a, c, n[h + 7], 22, -45705983), c = l(c, f, i, a, n[h + 8], 7, 1770035416), a = l(a, c, f, i, n[h + 9], 12, -1958414417), i = l(i, a, c, f, n[h + 10], 17, -42063), f = l(f, i, a, c, n[h + 11], 22, -1990404162), c = l(c, f, i, a, n[h + 12], 7, 1804603682), a = l(a, c, f, i, n[h + 13], 12, -40341101), i = l(i, a, c, f, n[h + 14], 17, -1502002290), c = v(c, f = l(f, i, a, c, n[h + 15], 22, 1236535329), i, a, n[h + 1], 5, -165796510), a = v(a, c, f, i, n[h + 6], 9, -1069501632), i = v(i, a, c, f, n[h + 11], 14, 643717713), f = v(f, i, a, c, n[h], 20, -373897302), c = v(c, f, i, a, n[h + 5], 5, -701558691), a = v(a, c, f, i, n[h + 10], 9, 38016083), i = v(i, a, c, f, n[h + 15], 14, -660478335), f = v(f, i, a, c, n[h + 4], 20, -405537848), c = v(c, f, i, a, n[h + 9], 5, 568446438), a = v(a, c, f, i, n[h + 14], 9, -1019803690), i = v(i, a, c, f, n[h + 3], 14, -187363961), f = v(f, i, a, c, n[h + 8], 20, 1163531501), c = v(c, f, i, a, n[h + 13], 5, -1444681467), a = v(a, c, f, i, n[h + 2], 9, -51403784), i = v(i, a, c, f, n[h + 7], 14, 1735328473), c = g(c, f = v(f, i, a, c, n[h + 12], 20, -1926607734), i, a, n[h + 5], 4, -378558), a = g(a, c, f, i, n[h + 8], 11, -2022574463), i = g(i, a, c, f, n[h + 11], 16, 1839030562), f = g(f, i, a, c, n[h + 14], 23, -35309556), c = g(c, f, i, a, n[h + 1], 4, -1530992060), a = g(a, c, f, i, n[h + 4], 11, 1272893353), i = g(i, a, c, f, n[h + 7], 16, -155497632), f = g(f, i, a, c, n[h + 10], 23, -1094730640), c = g(c, f, i, a, n[h + 13], 4, 681279174), a = g(a, c, f, i, n[h], 11, -358537222), i = g(i, a, c, f, n[h + 3], 16, -722521979), f = g(f, i, a, c, n[h + 6], 23, 76029189), c = g(c, f, i, a, n[h + 9], 4, -640364487), a = g(a, c, f, i, n[h + 12], 11, -421815835), i = g(i, a, c, f, n[h + 15], 16, 530742520), c = m(c, f = g(f, i, a, c, n[h + 2], 23, -995338651), i, a, n[h], 6, -198630844), a = m(a, c, f, i, n[h + 7], 10, 1126891415), i = m(i, a, c, f, n[h + 14], 15, -1416354905), f = m(f, i, a, c, n[h + 5], 21, -57434055), c = m(c, f, i, a, n[h + 12], 6, 1700485571), a = m(a, c, f, i, n[h + 3], 10, -1894986606), i = m(i, a, c, f, n[h + 10], 15, -1051523), f = m(f, i, a, c, n[h + 1], 21, -2054922799), c = m(c, f, i, a, n[h + 8], 6, 1873313359), a = m(a, c, f, i, n[h + 15], 10, -30611744), i = m(i, a, c, f, n[h + 6], 15, -1560198380), f = m(f, i, a, c, n[h + 13], 21, 1309151649), c = m(c, f, i, a, n[h + 4], 6, -145523070), a = m(a, c, f, i, n[h + 11], 10, -1120210379), i = m(i, a, c, f, n[h + 2], 15, 718787259), f = m(f, i, a, c, n[h + 9], 21, -343485551), c = d(c, r), f = d(f, e), i = d(i, o), a = d(a, u); return [c, f, i, a] } function a(n) { for (var t = "", r = 32 * n.length, e = 0; e < r; e += 8)t += String.fromCharCode(n[e >> 5] >>> e % 32 & 255); return t } function h(n) { var t = []; for (t[(n.length >> 2) - 1] = void 0, e = 0; e < t.length; e += 1)t[e] = 0; for (var r = 8 * n.length, e = 0; e < r; e += 8)t[e >> 5] |= (255 & n.charCodeAt(e / 8)) << e % 32; return t } function e(n) { for (var t, r = "0123456789abcdef", e = "", o = 0; o < n.length; o += 1)t = n.charCodeAt(o), e += r.charAt(t >>> 4 & 15) + r.charAt(15 & t); return e } function r(n) { return unescape(encodeURIComponent(n)) } function o(n) { return a(i(h(t = r(n)), 8 * t.length)); var t } function u(n, t) { return function (n, t) { var r, e, o = h(n), u = [], c = []; for (u[15] = c[15] = void 0, 16 < o.length && (o = i(o, 8 * n.length)), r = 0; r < 16; r += 1)u[r] = 909522486 ^ o[r], c[r] = 1549556828 ^ o[r]; return e = i(u.concat(h(t)), 512 + 8 * t.length), a(i(c.concat(e), 640)) }(r(n), r(t)) } function t(n, t, r) { return t ? r ? u(t, n) : e(u(t, n)) : r ? o(n) : e(o(n)) } "function" == typeof define && define.amd ? define(function () { return t }) : "object" == typeof module && module.exports ? module.exports = t : n.md5 = t })(this || window);
	//sourceMappingURL=md5.min.js.map
} catch (e) {
	console.log(e)
}


String.prototype.replaceAll = String.prototype.replaceAll || function (find, rep) {
	let text = this;
	while (text.search(find) != -1) {
		text = text.replace(find, rep);
	}
	return text;
}


Object.defineProperty(HTMLElement.prototype, 'cs', {
	//Just a shorthand since we frequently make use of the computed style of an element
	configurable: true,
	get: function () {
		return getComputedStyle(this);
	},
})

export let random = function (min, max) {
	//Very important when getting a random number in a certain range
	return ((Math.random() * 10e9) % (max - min)) + min;
}


String.prototype.has = function (str) {
	//Tells us if a string contains another
	return this.indexOf(str) >= 0;
}

HTMLElement.prototype.temporalAttribute = function (attribute, value, time = 5000) {
	this.setAttribute(attribute, value);
	setTimeout(function () { this.removeAttribute(attribute) }.bind(this), time);
}

HTMLElement.prototype.removeLater = function (time) {
	return new Promise(yes => {
		setTimeout(function () {
			this.remove();
			yes()
		}.bind(this), time);

	})
}


export let makeScalable = window.makeScalable = function () {
	document.head.spawn({
		tag: 'meta',
		name: 'viewport',
		content: 'width=device-width,initial-scale=1.0,user-scalable=no'
	})
}

Object.defineProperty(Location.prototype, 'params', {
	get: function () {
		values = {};
		this.href.split(/[?&]/).forEach(p => (x = /([^&\/]+)=([^\/&]+)/.exec(p)) && (values[x[1]] = x[2]));
		return values;
	}, configurable: true
})
Object.defineProperty(Location.prototype, 'path', {
	get: function () {
		return /(.+)\/[^/]+$/.exec(this.href)[1];
	},
	configurable: true
})

EventTarget.prototype.fire = function (event) {
	if (Array.isArray(event)) for (e of event) this.fire(e);

	event = typeof event == 'string' ? new CustomEvent(...arguments) : event;
	this.dispatchEvent(event);
}

EventTarget.prototype.on = function (event, func, ...rest) {
	if (Array.isArray(event)) {
		for (var e of event) { this.on(e, func); }
		return;
	}
	let target = this;
	return this.addEventListener(event, function () {
		func.end = function () {
			target.removeEventListener(event, func);
		};
		func.apply(this, arguments); //Damn!! JavaScript
	}, ...rest);
}

/* Subscribes to an event once so that the function gets called only when the event happens for the first time
The function callback should return true if it wants to continue receiving the event */
EventTarget.prototype.once = function (event, func) {
	let fu = () => 1
	this.on(event, func, { once: true })
}
String.prototype.has = function (sub) {
	return this.indexOf(sub) != -1;
}

Object.defineProperty(Set.prototype, 'array', {
	configurable: true,
	get: function () {
		let cycle = this.values(), next;
		let array = []
		while (!(next = cycle.next()).done) {
			array.push(next.value)

		}
		return array;
	}
})

Math.clamp = function (min, value, max) {
	return value < min ? min : value > max ? max : value;
}

window.cursor = { x: 0, y: 0 };
window.on('mousemove', function (e) {
	window.cursor.x = e.pageX;
	window.cursor.y = e.pageY;
	window.cursor.element = e.target;
});

HTMLElement.prototype.alignTo = function (selector, direction) {

	/* Aligns an element to the x or y cordinate of a parent that corresponds to the selector
	direction specifies the type of alignment (x or y or x|y for both)
	selector is used to find the parent
	for example

	<div class='header'>
		<div class='box'>
			<div class='child'>A child</div>
			<div class='sibling'>A sibling</div>
		</div>
	</div>

	let child = $('.child')
	child.alignTo('.box', 'x') //Align the child according to the x cordinate of the box parent
	child.alignTo('.header', 'y') //According to the y cordinate of the header parent
	child.alignTo('.header', 'width') //According to the width of the header parent
	*/
	if (/^.+,.+$/.test(direction)) {
		for (var d of direction.split(',')) {
			this.alignTo(selector, d)
		}
	}
	let box = this.ancestor(selector).getBoundingClientRect();
	d = /(.+):(.+)/.exec(direction);
	this.style[d[1]] = `${box[d[2]]}px`; //Simple, fast, efficient!

}

Object.defineProperty(document, 'hCookies', { //Transforms the cookie string e.g (auth=adfads;abc=124)
	get: function () {
		let results = this.matchAll(/ *([^;]+) *= *([^;]+)/gi);
		let unit = {};
		let data = {};
		while (!(unit = results.next()).done) {
			data[unit.value[1]] = unit.value[2];
		}
		data.delete = function (c) {
			document.cookie = `${c}= ;expires=${new Date(0)}`;
		}
		return data;
	}.bind(document.cookie),
	configurable: true,
	enumerable: true
});


//export let hc = window.hc = {
export function parsePath(string) {
	let parts = /^(.+\/)([^/]*)$/.exec(string);
	return { path: parts[1], file: /[^/]+\.*[^/]+/.exec(parts[2])[0] }
};
export function addCSS(href) {
	document.head.spawn({ tag: 'link', rel: 'stylesheet', href: href });
};

export function addJS(src) {
	document.body.spawn({ tag: 'script', src: src });
}

export function importJS(src) {
	return new Promise((y, n) => {
		let script = document.head.spawn({ tag: 'script', src: src });
		script.onload = y;
		script.onerror = n;
	})
};

/**
 * 
 * @param {string} importUrl This is usually import.meta.url
 * @param {string} cssFile If specified, a CSS file other than the css equivalent of the import url will be fetched
 * 
 * For example from home.js
 * 
 * importModuleCSS(import.meta.url) //Importing home.css
 * importModuleCSS(import.meta.url, 'style.css') //Importing style.css in the same directory
 */
export function importModuleCSS(importUrl, cssFile) {
	try {
		if (!importUrl) {

			let line;
			const stack =new Error().stack;

			try {
				line = stack.split('\n');
				line = line[2] || line[1]
				importUrl = /(https*:\/\/.+.js).+$/.exec(line)[1]
				console.trace(`Auto calculated import url : ${importUrl} Now importing the css file with the same name`)
			} catch (e) {
				//This type of error needs reporting
				console.log(new Error())
				console.log('line is ', line);
				console.log(`Failed to auto import Severe error: `, e);
				console.log(`Stack trace for caclulations\n`, stack)
				throw e
			}
		}
		let { path, file } = parsePath(importUrl);
		let moduleCSSUrl = `${path}${/(.+)[.][^.]+$/.exec(file)[1]}.css`
		const finalCSSUrl = new URL(cssFile || moduleCSSUrl, importUrl).href;
		

		//Now check if the stylesheet already exists
		for (let sheet of document.styleSheets) {
			if (sheet.href == finalCSSUrl) {
				return
			}
		}

		addCSS(finalCSSUrl)

	} catch (e) {
		console.log(`Error importing ${importUrl}`)
		console.log(e.stack)
		throw e;
	}

}

export function numeric(string) {
	return typeof string == 'number' ? string : new Number(/(\d+[.]*\d*)/.exec(string || '0')[0])
}

//export function random(){
function random_digits(length) {
	let random = ``;
	for (var i = 0; i < length; i++) {
		random = `${random}${Math.round(random(0, 10))}`;
	}

	return random;
}
