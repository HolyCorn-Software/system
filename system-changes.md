.

Updated to the latest version of html-hc, with rpc, and UI libraries.
Added utility called wait-list, for allowing sequential ordering of events

Made execution of faculties thread-based, instead of running each in a separate process.

Improved platform stability by ordering the startup processes, such as transpiling, cache initialization.

Moved the responsibility of transpiling frontend code to the base platform, in order to save memory, and CPU.

Disabled the error-lookup feature.

Made the codebase cleaner.

Improved the memory management of the websocket components.

Improved the efficiency of super-object.

Improved the efficiency of json-rpc.

Solved memory leaks with json-rpc.

Removed unnecessary use of FileCache, in order to save memory.

Fixed minor timing bugs with bundle-cache, system-http, and platform-http.

Improved code quality, by renaming exception.js -> exception.mjs, and removing unnecessary imports to it.
