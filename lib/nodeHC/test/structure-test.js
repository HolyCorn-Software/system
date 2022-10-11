/*
Copyright 2021 HolyCorn Software
This module is used to carry out test that entail that specific files and folders be in specific folders
This test won't fail if a folder contains more than it should

*/

let fs = require('fs');
const libPath = require('node:path');

class StructureTest{
    //This module checks whether the directory has particular files, as defined by the 'structure' parameter

    /*

        EXAMPLE
        test = new StructureTest({
            'index.html':0,
            'index.js':0,
            'res':{ //res is a folder
                'logo.png':0,string
                'about.txt':'0
            }
        })
        
    */

    constructor(structure){
        this.structure = structure;
    }

    async run(directory){
        return await StructureTest.testDir(directory, this.structure);
    }
    
    static async testDir(directory, structure){
        
        let SEP = libPath.sep;

        let retVal = {}; //This contains the data to be returned. E.g {OK:true}, {OK:false, comment:`'/mnt/Data/Projects' doesn't contain 'home'`}

        if(!fs.existsSync(directory)){
            return {OK:false, comment:`'${directory}' doesn't exist`}
        }
        
        for(var file in structure){
            //If we are dealing with a folder...
            if( (typeof structure[file]) == 'object'){
                //Check whether the sub-directory follows the desired structure
                
                if(!(retVal = await StructureTest.testDir(`${directory}${SEP}${file}`, structure[file])).OK ){
                    break;
                }
            }else{
                //If we are dealing with a simple file
                //Then just check if the file is in the direction
                try{
                    retVal.OK = fs.readdirSync(directory).indexOf(file) != -1;
                    retVal.comment = retVal.OK ? undefined : `'${directory}' doesn't contain '${file}'`
                    if(!retVal.OK) break; //Just one error and the test should abort
                }catch(e){
                    return retVal = {OK:false, comment:`Error reading '${directory}'`, error:e}
                } //An error will probably occur only when the directory doesn't exist.
            }
        }
        return retVal;
    }
    
}

module.exports = {StructureTest};

let test = new StructureTest({
    Projects:{
        BGISwap:{
            code:0,
            how:0
        }
    }
})

test.run(`/mnt/Data/`).then(x=>{
    console.log(x)
}, x=>console.log(x))