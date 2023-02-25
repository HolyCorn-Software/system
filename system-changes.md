.

Corrected minor documentation issues with the schemas.

Added support for backend_dashboard descriptor.

Deprecated PluginManager.plugins in favour of PluginManager.loaded, which is less ambiguous

Improved error-reporting in the PluginManager module

Corrected a minor type confusion, related to PluginList

Restored missing schema information. Information about static HTTP routing within faculties.

Updated to the latest version of html-hc, with better code quality.

Added ability for faculties to have simple persistent settings, managed by their faculty platforms

Made FacultyPublicMethods, FacultyPublicRPCServer classes globally available, as faculties depend on them

Fixed minor issue with code completion for faculty backend_dashboard feature

Added exclusiveUpdate() to soulUtils
