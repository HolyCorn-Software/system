.

Added ability to securely subsitute strings
Added a new utility called argument-proxy, which allows code components to build objects that wrap around other objects to change their arguments, or secure them
Changing to a new style where faculties export a default function for init.
Removed unnecessary code 
Changed the way global classes are managed
Added more classes, and modules to the list of global variables (FunctionProxy, SimpleCache, CollectionProxy, fsUtils, soulUtils)
Improved error logging
Removed deprecated method FacultyPlatform.prototype.warn()
Removed deprecated errorMap(), courseHTTP, and sessionAPI methods
Removed deprecated connectFaculty() method