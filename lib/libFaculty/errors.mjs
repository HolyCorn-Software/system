/*
Copyright 2021 HolyCorn Software
This script is part of the libFaculty module
It contains formal definitions of possible errors
*/


class FacultyErr extends Error {
    //A way of grouping errors to provide better organization
}

class MalformedInitErr extends FacultyErr {
    constructor(path, script) {
        super(`The faculty defined at '${path}' is invalid because '${script}' doesn't have a method called 'init(faculty)'`)
    }
}


class NoDescriptorErr extends FacultyErr{
    constructor(path){
        super(`The faculty located at '${path}' is invalid because it lacks a 'faculty.json' file`)
    }
}

class MalformedDescriptorErr extends FacultyErr{
    constructor(file, field){
        super(`The descriptor ${file} is invalid because '${field}' is missing`)
    }
}

class FileNotFoundErr extends FacultyErr{
    constructor(path, file, field){
        super(`The faculty located at ${path.cyan} could not be loaded because, the file ${file.red} defined in faculty.json as the ${field.cyan} property was not found. Check to see whether it exists`)
    }
}

class KeyMismatchErr extends FacultyErr{

    constructor(path){
        super(`The faculty located at '${path}' could not be loaded because it's private key does not correspond to it's certificate`)
    }
    
}



export {
    KeyMismatchErr,
    FileNotFoundErr,
    MalformedDescriptorErr,
    NoDescriptorErr,
    MalformedInitErr, 
    FacultyErr,
}