/**
 * Copyright 2022 HolyCorn Software
 * This module contains type definitions for modules in the util directory of the soul system
 */


type DirectoryDefinition = {
    [key: string]: string & {
        [key: string]: string & DirectoryDefinition
    }
} & string[]


type TypeofType = "string" | "number" | "boolean" | "undefined"

type StructureCheckInput<T> = T extends object ? {
    [K in keyof T]: StructureCheckInput<T[K]>
} : TypeofType
type FinalType<A, B, Yes = A, No = B> = A extends unknown ? No : Yes

type ObjectValues<T> = T[keyof T]

type RecursiveDot<T> = T extends (string | number) ? T : ObjectValues<{
    [K in keyof T]: K | (T[K] extends object ? `${K}.${RecursiveDot<T[K]>}` : K)
}>

type CheckerCallbackArgs<T> = {
    ideal: TypeofType
    real: TypeofType
    value: any
    field: RecursiveDot<T>
}

type CheckerCallback<T> = (arg0: CheckerCallback<T>) => void