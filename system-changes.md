.

Improved efficiency of the http compat module, by making the transpile wait optional.

Improved algorithms that determine how the platform is accessed via HTTP, particularly to prevent errors that occur, when a user tries to access the server before its ready.

Added the platform-ready event, which can listened to by faculties, to know when to start performing heavy tasks, or processing user data.

Added a possibility for types to be declared in the following areas to facilitate autocomplete:
    1. internal events
    2. public methods

Corrected minor bug with json-rpc's caching.

Improved effectiveness of the json-rpc caching on the frontend, by prioritizing writes when the user is navigating out of the page.

Improved json-rpc's error reporting.

Improved error-reporting from frontend components.

Improved translation module, by guaranteeing that strings load before the page is loaded.

Changed data format of the worker-world module, to a more direct, and developer-and-query-friendly format.

Improved typing of the worker-world module.

Updated to the latest version of html-hc, with better typing, and better UI.