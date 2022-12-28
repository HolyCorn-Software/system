.

Adding support for faculties automatically managing availability of static files.
Added schema json files describing the necessary structure of important descriptors for the soul system.
Moved the responsibility of providing certain global classes away from the nursery.
Removed unnecessary imports. The code is now cleaner.
Renamed plugins to plugin, for better code understanding.
Improved typing especially in areas where FacultyDescriptor is used.
Changed extension of nursery-utils, and many other files, from '.js' to '.mjs' to comply with modern standards
Put 100ms delay before faculties can start writing to standard output. This helps prevent certain mixups