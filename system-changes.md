.

Improved typing of the utility checkArgs() method.

Improved typing of faculty public, and internal methods

Added the 'overload' interface to the FacultyConnection manager, which makes it easier to connect faculties, in a typed way

Generally improved typing

Standardized, and modularized json-rpc for use on both frontend, and backend

Added ability to loop through arrays remotely, from json-rpc

Corrected minor bug with function-proxy involving wrapping the returns, and params of a method

Corrected minor bug with the websocket library transcoder-stream module, which affected how it deals with payloads of extended length.

Made websocket transcoder-stream module more robust to errors especially from delays, and parsing errors.

Made websocket transcoder-stream module more resource-efficient

Added schema for modernuser faculty support

Updated to the latest version of html-hc featuring new widgets like backforth, new functionality, bug fixes, better code quality, and improved stability

Removed unnecessary delay with inter-faculty events

Removed ancient utility method getJSONOrBadRequest()

Removed ancient utility WebSocketClientList