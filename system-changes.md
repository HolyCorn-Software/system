.

Improved efficiency of the json-rpc module, especially with the introduction of the clean-event-target module

Made faculty-public-rpc module more efficient

Fixed minor issue with event handling, with the json-rpc module

Corrected minor memory-management bug, with json-rpc concerning cleanup after loop replies

Corrected minor bug with json-rpc that has to do with the way it handles pending calls

Corrected minor bugs having to do with the robustness of aggregate-rpc. Now, it reconnects the client in case of connection breakage.

Improved manageability of apps of the soul system, by making the process name to reflect the running component

Updated to the latest version of html-hc featuring bug fixes, and efficiency

Created json-rpc/event-channel module, for facilitating the process of efficiently clients

Deprecated the local use of the emit() method on the json-rpc JSONRPCEventsStub class, for better standardization through the use of dispatchEvent()

Improved typing of the json-rpc module

Updated to the latest version of html-hc, with better efficiency

