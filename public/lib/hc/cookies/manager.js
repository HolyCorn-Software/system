/*
Copyright 2022 HolyCorn Software
This is a part of HTML-HC
This module allows easy management of cookies
*/

export class CookieManager {

    constructor() {

    }

    /**
     * 
     * @returns {Object<string, string>}
     */
    getCookies() {
        let cookies = document.cookie.matchAll(/ *([^;]+) *= *([^;]+)/gi)

        let next = {};
        let results = {};
        while (!(next = cookies.next()).done) {
            results[next.value[1]] = next.value[2];
        }
        return results;
    }

    /**
     * Sets the value of a cookie
     * @param {string} key cookie name
     * @param {string} value cookie value
     * @param {object} param2 flags
     * @param {number} param2.expires Expiry time
     * @param {string} param2.path
     */
    setCookie(key, value, { expires = CookieManager.defaultCookieTime, path = '/' }) {
        document.cookie = `${key}=${value}; expires=${new Date(expires)}; path=${path}`
    }

    /**
     * This is used to retrieve the value of a single cookie
     * @param {string} key The cookie name
     * @returns {string}
     */
    getCookie(key) {
        return this.getCookies()[key]
    }

    /**
     * This deletes a cookie
     * @param {string} key The name of the cookie
     */
    deleteCookie(key) {
        this.setCookie(key, '.', { expires: 0, path: '/' })
    }

    static get defaultCookieTime() {
        return 24 * 60 * 60 * 1000
    }

}