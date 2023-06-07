.

Fixed the following minor bugs with bundle-cache
    An error during serving a bundle for the first time, caused by inconsistencies with the filecache
    Error when removing a URL path
    Deletion bug that would have removed valuable files on delete, when transpiling is off

Added offline page for situations when the user has trouble reaching the server

Removed the need to fetch faculty map for operating the aggregate-rpc module, and this improves performance, and is in line with future plans to deprecate faculties operating custom public rpc

Reduced dependency of the frontend error module to the error map, in order to make it function better offline