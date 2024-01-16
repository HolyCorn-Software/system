.

Improved platform stability, by waiting for faculties to complete initialization, before accepting HTTP requests.

Improved caching, by adding forced-update ability, which forcefully pulls the latest version of the page in the background.

Improved efficiency of the bundle-cache server.

Improved logging of the platform http modules.

Improved communication to the frontend components, by improving efficiency of the session api. Now, clients need not authenticate all the time.

Fixed bugs that prevented sustained error-free communication over websockets, especially with large payloads.

Fixed minor bugs with the event-channel module, especially related to calling client remote methods.

Improved efficiency of json-rpc, by ensuring one instance of a remote function call at a time, and by improving the caching algorithm.

Fixed minor issue with uuid module.

Improved efficiency of the worker-world module.

Updated to the latest version of html-hc with marked improvements in efficiency, and a few new features.