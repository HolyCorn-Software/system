/**
 * Copyright 2022 HolyCorn Software
 * This module (faculty.global) contains type definitions for objects that are globally available in any faculty code
 */

import { Exception as _Exception } from "system/errors/backend/exception.js";
import { FacultyPlatform as _FacultyPlatform } from "./platform.mjs";



declare global {

    declare class FacultyPlatform extends _FacultyPlatform { }


    declare class Exception extends _Exception { }

    


}