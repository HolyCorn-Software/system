/**
 * Copyright 2022 HolyCorn Software
 * This module (faculty.global) contains type definitions for objects that are globally available in any faculty code
 */

import { FacultyFacultyRemoteMethods as _FacultyFacultyRemoteMethods } from "system/comm/rpc/faculty-faculty-rpc.mjs";
import { FacultyPublicMethods as _FacultyPublicMethods } from "system/comm/rpc/faculty-public-methods.mjs";
import { FacultyPublicJSONRPC as _FacultyPublicJSONRPC, FacultyPublicRPCServer as _FacultyPublicRPCServer } from "system/comm/rpc/faculty-public-rpc.mjs";
import { Exception as _Exception } from "system/errors/backend/exception.js";
import { FacultyPlatform as _FacultyPlatform } from "./platform.mjs";



declare global {

    declare class FacultyPlatform extends _FacultyPlatform { }


    declare class Exception extends _Exception { }

    declare class FacultyPublicJSONRPC extends _FacultyPublicJSONRPC { }

    declare class FacultyPublicMethods extends _FacultyPublicMethods { }

    declare class FacultyPublicRPCServer extends _FacultyPublicRPCServer { }

    declare class FacultyFacultyRemoteMethods extends _FacultyFacultyRemoteMethods{}




}