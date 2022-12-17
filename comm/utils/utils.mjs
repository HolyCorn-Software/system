/*
Copyright 2021 HolyCorn Software
This contains basic functions that enable creation and management of communication channels such as sockets
*/

import crypto from 'crypto'
import net from "net"


export class Utils {

    /**
     * 
     * @param {Number} maxTries (optional) the maximum number of tries before deciding that we could not find an open port
     * @returns {Number} the open port
     */

    static async findOpenPort(maxTries = 65535) {
        while (maxTries-- > 0) {
            try {
                let port = crypto.randomInt(8081, 65535)
                await new Promise((resolve, reject) => {

                    let server = net.createServer().listen(port, (e) => {
                        safe_close(server).then(resolve, reject)
                    });
                    server.addListener('error', reject)
                })
                return port;
            } catch (e) {
                //No qualms, port we tried is not working
            }
        }
        throw new Error(`Could not find open port after ${maxTries} tries`)
    }

}

/**
 * This method is used to safely close a server socket
 * @param {net.Server} server 
 * @returns {Promise<void>}
 */
function safe_close(server) {
    server.close();

    return new Promise(x => {
        server.once('close', x)
    })
}

export default {
    findOpenPort: Utils.findOpenPort
}