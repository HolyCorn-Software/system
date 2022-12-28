/**
 * Copyright 2022 HolyCorn Software
 * The Soul System
 * This module (function-proxy.d.ts) contains type definitions needed by the function-proxy module
 */


interface FunctionProxyArguments {
    /** The name of the function that is being called */
    property: string
}

type ArgumentFunction = (data: FunctionProxyArguments, ...args: any[]) => any[]

interface FunctionProxyFunctions {
    /** This method will be called to modify the inputs of other methods */
    arguments: (data: FunctionProxyArguments, ...args: any[]) => any[]
    /** This method will be called to modify the returns of other methods */
    returns: (data: FunctionProxyArguments, results: any) => any
}