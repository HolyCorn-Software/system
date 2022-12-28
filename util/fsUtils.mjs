/**
 * Copyright 2022 HolyCorn Software
 * The soul system
 * This module contains useful methods related to file management
 */


function folderMove(src, dst, log) {
    const items = fs.readdirSync(src)
    const folders = []
    if (!fs.existsSync(dst)) {
        fs.mkdirSync(dst, { recursive: true })
    }
    for (const item of items) {
        if (fs.statSync(`${src}${libPath.sep}${item}`).isDirectory()) {
            if (log) console.log(`${item} is not a file.`)
            folders.push(item)
        } else {
            if (log) console.log(`Directly moving ${item} from ${src} to ${dst}`)
            fs.renameSync(`${src}${libPath.sep}${item}`, `${dst}${libPath.sep}${item}`)
        }

    }

    for (const folder of folders) {
        if (log) console.log(`Moving folder ${folder}`)
        folderMove(`${src}${libPath.sep}${folder}`, `${dst}${libPath.sep}${folder}`)
    }

    if (log) console.log(`Now doing the final move ${src} -> ${dst}`)


    fs.rmdirSync(src)

}


const fsUtils = {
    folderMove
}


export default fsUtils