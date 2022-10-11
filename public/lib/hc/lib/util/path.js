/**
 * 
 * Copyright 2022 HolyCorn Software
 * This module contains utilities for manipulating paths
 * 
 */


/**
 * This function cleans path names by performing operations such as removing repeated / characters
 * @param {string} path 
 * @returns {string}
 */
export function cleanPath (path){
    return path.replaceAll(/\/{2,}/g, '/')
}

/**
 * Makes sure the path starts with a slash
 * @param {string} path 
 * @returns {string}
 */
export function makeAbsolute(path){
    return path.startsWith('/') ? path : `/${path}`
}

/**
 * Removes the last slash if any.
 * 
 * E.g /home/vid/ becomes /home/vid
 * @param {string} path 
 * @returns {string}
 */
export function removeLastSlash(path){
    return path.endsWith('/') ? path.substring(0, path.length-1) : path;
}