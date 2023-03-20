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


    /**
     * The faculty platform is now automatically managing public rpc access.
     * Just write to the platform.remote.public object, and clients will have access to the interface via RPC
     */
    declare class FacultyPublicJSONRPC extends _FacultyPublicJSONRPC { }

    declare class FacultyPublicMethods extends _FacultyPublicMethods { }

    /**
     * @deprecated This feature is automatically managed now.
     * 
     * Simple modify the faculty.remote.public object, to define the interface that 
     * remote clients will have access to
     */
    declare class FacultyPublicRPCServer extends _FacultyPublicRPCServer { }

    declare class FacultyFacultyRemoteMethods extends _FacultyFacultyRemoteMethods { }




}