/**
 * Copyright 2022 HolyCorn Software
 * This module global.system.d.ts contains type definitions for files classes, and modules 
 */

import _FunctionProxy from "./util/function-proxy.mjs";
import { HTTPServer as _HTTPServer } from "system/http/server.js";
import { StrictFileServer as _StrictFileServer } from "system/http/strict-file-server.js";
import _FilesCheck from "./util/files-check.mjs";
import _fsUtils from "./util/fsUtils.mjs";
import _soulUtils from './util/util.js'


declare global {

    class FunctionProxy extends _FunctionProxy { }


    declare class HTTPServer extends _HTTPServer { }

    declare class StrictFileServer extends _StrictFileServer { }


    class FilesCheck extends _FilesCheck { }

    let fsUtils = _fsUtils

    let soulUtils = _soulUtils

}