.

Updated to the latest version of html-hc with a new widget, code improvements.

Improved typing.

Made code more robust.

Moved the bundle-cache functionality into a new umbrella feature, called frontend-manager, capable of handling many aspects related to static content available to the user. For example, auto-run, and run, which allow scripts to run on every, and some pages.

#### Improved faculty plugin manager
   1. Added ability for plugins to provide public methods.
   2. Made new plugins to automatically load, once the folders are created.
   3. Corrected minor bug related to error management during initial startup of plugins.
   4. Corrected minor uninstallation bug, that caused the uninstallation of one plugin, to permanently delete other plugins.

Improved propagation of events between faculties and the base platform.

#### Improved json-rpc
   1. Improved error management, by distinguishing between accidental, and intentional errors.
   2. Added caching ability to improve efficiency.
   3. Excluding the default first arguments from calls to internal methods.
   4. Corrected some bugs related to transmitting generator data types.
   5. Corrected minor ommission bug related transmitting ActiveObjects
   
Corrected minor bug with function-proxy.