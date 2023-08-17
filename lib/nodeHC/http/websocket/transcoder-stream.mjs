/**
 * Copyright 2022 HolyCorn Software
 * This module allows the system to have the ability to constantly decode websocket data
 * 
 */

import { Duplex } from 'node:stream'
import crypto from 'node:crypto'


const is_ticking = Symbol()

const input_buffer = Symbol()

const output_buffer = Symbol()

const input_buffer_offset = Symbol()

const tick_function = Symbol()

const readHeader = Symbol()

const readPayloadData = Symbol()

const errorCount = Symbol()




class BufferedStream extends Duplex {

    /**
     * 
     * @param {import('node:stream').DuplexOptions} options 
     */
    constructor(options) {

        super(options)


        /** @type {Buffer} */
        this[output_buffer] = Buffer.alloc(0)
    }

    _read(size) {
        size = Math.min(size, this[output_buffer].byteLength)
        const result_buffer = Buffer.alloc(size)
        this[output_buffer].copy(result_buffer, 0, 0, size)
        const new_ready_buffer = Buffer.alloc(this[output_buffer].byteLength - size)
        this[output_buffer].copy(new_ready_buffer, 0, size, new_ready_buffer.byteLength)
        this[output_buffer] = new_ready_buffer
        return result_buffer
    }

}



/**
 * The idea of this class is to allow that data is constantly written to an input_buffer, and a loop is kept alive for data processing. Processed data is stored in the output_buffer
 */
class LooperStream extends BufferedStream {


    /**
     * 
     * @param {import('node:stream').DuplexOptions} options 
     */
    constructor(options) {
        super(options)


        /** @type {Buffer} */
        this[input_buffer] = Buffer.alloc(0)

        this[input_buffer_offset] = 0;

        this[errorCount] = 0

    }


    destroy() {
        super.destroy(...arguments)
        setTimeout(() => this.removeAllListeners(), 1000)
    }

    /**
     * This method is used internally by node.js to pass in data
     * @param {Buffer|string} chunk 
     * @param {BufferEncoding} encoding 
     * @param {(error:Error|null)} callback 
     */
    _write(chunk, encoding, callback) {

        this[input_buffer] = Buffer.concat([this[input_buffer], chunk])
        callback()
        this.emit('write-end')

        this.tick()

    }


    async throwAway(length) {
        if (typeof length !== 'undefined') {
            this[input_buffer] = this[input_buffer].slice(length, this[input_buffer].byteLength)
        } else {
            this[input_buffer] = Buffer.alloc(0)
        }
        this[input_buffer_offset] = 0;

    }


    /**
     * Sub-classes will implement this so they can actually perform the work of reading data and writing to the output buffer
     */
    async [tick_function]() {
        await this.sleep()
        throw new Error(`Please implement the #tick() method that will do the main work of the class transforming the input buffer into something, and then writing it to the output buffer`)
    }



    async tick() {

        if (this.destroyed) {
            return;
        }

        if (this[is_ticking]) {
            return;
        }

        const initial_offset = this[input_buffer_offset]

        // Now, if there have been way too many errors, discard
        if (this[errorCount] > 5) {
            return this.destroy()
        }

        this[is_ticking] = true;

        try {
            await this[tick_function]()
            this[errorCount] = 0 //Clear all last errror count
        } catch (e) {
            if (!this.destroyed) {
                console.error(`Error during tick `, e)
            }
            this[input_buffer_offset] = initial_offset
            this[errorCount]++
        }

        await this.throwAway(this[input_buffer_offset])

        this[is_ticking] = false;

        await this.tick()
    }


    /**
     * This method returns a promise that only resolves when data is written to the stream
     * @returns {Promise<void>}
     */
    sleep() {

        let resolve, reject

        const promise = new Promise((_resolve, _reject) => {
            resolve = _resolve
            reject = _reject
        })

        this.once('write-end', resolve)
        this.once('end', reject)

        promise.finally(() => {
            this.off('write-end', resolve)
            this.off('end', reject)
        })

        return promise

    }

    get shouldLog() {
        return FacultyPlatform.get() instanceof FacultyPlatform
    }

    /**
     * This method will return a promise that only resolves when the input_buffer is long enough
     * @param {number} byteLength 
     * @param {number} timeout
     * @returns {Promise<void>}
     */
    waitTillLength(byteLength, timeout) {
        const timeout_error = new Error(`Timeout waiting for data to reach length ${byteLength}. Data is ${this[input_buffer].byteLength} `)

        return new Promise((resolve, reject) => {

            let timeoutKey;

            const cleanup = () => {
                clearTimeout(timeoutKey)
            }
            const succeed = () => {
                cleanup()
                resolve()
            }

            const fail = (e) => {
                cleanup()
                reject(e)
            }

            let is_okay = () => this[input_buffer].byteLength >= byteLength

            if (is_okay()) {
                return succeed()
            } else {
                if (timeout) {
                    timeoutKey = setTimeout(() => fail(timeout_error), timeout)
                }

                const check = () => {
                    if (is_okay()) {
                        succeed()
                        resolve()
                    } else {
                        this.sleep().then(() => {
                            check()
                        }, fail)
                    }
                }
                check()
            }


        })
    }




    /**
     * This method is used to apply a mask to data
     * @param {object} param0 
     * @param {number} param0.mask
     * @param {Buffer} param0.source
     * @returns {Buffer}
     */
    static applyMask({ mask, source }) {

        //Now, we are constantly taking a bit from the mask and applying to a bit from the data

        let destination = Buffer.alloc(source.byteLength);

        const mask_buffer = Buffer.alloc(4)
        mask_buffer.writeUInt32BE(mask)

        for (let i = 0; i < source.byteLength; i++) {
            const mask_byte = mask_buffer.readUInt8((i % 4))
            destination.writeUInt8(mask_byte ^ source.readUInt8(i), i)
        }

        return destination;

    }



}












/**
 * The idea of this class is to give a smooth decoding stream where data is fed, and when the data is sufficiently large enough to 
 * be read, a 'data' event is emitted
 */
class DecoderStream extends LooperStream {


    /**
     * 
     * @param {import('node:stream').DuplexOptions} options 
     */
    constructor(options) {
        super(options)



    }





    async [tick_function]() {

        await new Promise(async (resolve, reject) => {

            try {

                const data_chunks = []
                let data_type;

                const read_once = async () => {

                    const results = await this[readHeader]()

                    if (results.header.type === 'special') {
                        return resolve()
                    }

                    if (data_chunks.length > 0 && results.header.type !== 'continue') {
                        throw new Error(`A frame came in, and we don't know where to put it. We expected a continuation, but ${results.header.type} came`)
                    }

                    data_type ||= results.header.type

                    const body = await this[readPayloadData]({
                        length: results.header.payloadLength,
                        mask: results.header.mask
                    });

                    data_chunks.push(body)

                    if (!results.header.fin) {
                        if (this.shouldLog) {
                            console.log(`Reading again because fin is ${results.header.fin}`)
                        }
                        await read_once()
                    }

                }

                await read_once()

                if (data_type === 'close') {
                    this.emit('close')
                    return resolve()
                }
                if (data_type === 'special') {
                    //Then we ignore it
                    return resolve()
                }
                this.emit('data', Buffer.concat(data_chunks), data_type)
                resolve()


            } catch (e) {
                if (!this.destroyed) {
                    console.error(e)
                }
                reject(e)
            }

        })


    }


    /**
     * This method parses the data to extract frame header information
     * @param {Buffer} buffer 
     * @returns {{header:import('./transcoder-stream-types.js').WebSocketFrameHeader, offset:number}}
     */
    async [readHeader]() {

        await this.waitTillLength(2)

        const first_bytes = [this[input_buffer].readUInt8(0), this[input_buffer].readUInt8(1)]
        this[input_buffer_offset] += 2;

        const isFinal = (first_bytes[0] >>> 7) === 1

        const reserved = [
            (first_bytes[0] >> 6) & 0b10 === 1,
            (first_bytes[0] >> 5) & 0b100 === 1,
            (first_bytes[0] >> 4) & 0b1000 === 1,
        ]

        const opCode = first_bytes[0] & 0b00001111;

        const dataType =
            opCode === 0x1 ? 'text' :
                opCode === 0x2 ? 'binary' :
                    opCode === 0x0 ? 'continue' :
                        opCode === 0x08 ? 'close' : 'special';


        const isMasked = (first_bytes[1] >>> 7) === 1

        let payloadLength = (first_bytes[1] & 0x7F);

        //Now let's account for extended payload lengths
        if (payloadLength === 126) {
            //Then We are dealing with a 16-bit payload length
            await this.waitTillLength(2 + this[input_buffer_offset], 10_000)
            payloadLength = this[input_buffer].readInt16BE(this[input_buffer_offset])
            this[input_buffer_offset] += 2
        } else {

            if (payloadLength === 127) {
                //Then, we are dealing with a 64-bit payload length
                await this.waitTillLength(8 + this[input_buffer_offset], 10_000)
                payloadLength = this[input_buffer].readBigInt64BE(this[input_buffer_offset])
                this[input_buffer_offset] += 8
            }

        }

        let mask_key;

        if (isMasked) {
            await this.waitTillLength(2 + this[input_buffer_offset], 10_000)
            mask_key = Buffer.alloc(4)
            try {
                mask_key.writeUInt32BE(this[input_buffer].readUInt32BE(this[input_buffer_offset]))
            } catch (e) {
                throw e
            }
            this[input_buffer_offset] += 4;
        }


        return {
            header: {
                fin: isFinal,
                mask: mask_key,
                payloadLength,
                rsv1: reserved[0],
                rsv2: reserved[1],
                rsv3: reserved[2],
                type: dataType
            },
            offset: this[input_buffer_offset]
        }


    }



    /**
     * This method is used to read pay load data from a frame
     * @param {object} param0 
     * @param {number} param0.length
     * @param {Buffer} param0.mask
     * @returns {Buffer}
     */
    async [readPayloadData]({ length, mask }) {

        await this.waitTillLength(this[input_buffer_offset] + length, 30_000)


        let data = Buffer.alloc(length)
        this[input_buffer].copy(data, 0, this[input_buffer_offset], length + this[input_buffer_offset])

        this[input_buffer_offset] += length;

        if (mask) {
            const newdata = LooperStream.applyMask({ mask: mask.readUInt32BE(), source: data })
            data = newdata;
        }


        return data;
    }



}





/**
 * This class allows you to write plain data and read data that can be used as socket frames
 */
class EncoderStream extends BufferedStream {


    /**
     * 
     * @param {import('node:stream').DuplexOptions} options 
     */
    constructor(options) {
        super(options)

        this.once('end', () => {
            console.log(`Ending an encoder stream.`)
        })
    }


    _write(chunk, encoding, callback) {

        const chunks = EncoderStream.breakChunks(chunk)

        for (let i = 0; i < chunks.length; i++) {

            const transformed = EncoderStream.createSocketFrame({ source: chunks[i], type: encoding === 'binary' ? 'binary' : 'text', isLast: i === chunks.length - 1 });

            this[output_buffer] = Buffer.concat(
                [
                    this[output_buffer],
                    transformed
                ]
            )
        }

        if (this[output_buffer].byteLength > 0) {
            this.emit('data', this[output_buffer])
        }

        callback()


    }

    /**
     * This method creates a Buffer of socket data that can be directly written to a socket stream
     * @param {Buffer} buffer 
     * @param {('binary'|'text')}
     * @returns {Buffer}
     */
    static createWritableSocketData(buffer, encoding) {

        buffer = Buffer.from(buffer);

        return Buffer.concat(
            this.breakChunks(buffer).map((chunk, i, chunks) => {
                return this.createSocketFrame({ source: chunk, type: encoding === 'binary' ? 'binary' : 'text', isLast: i === chunks.length - 1 });
            })
        )


    }




    /**
     * This method is used to break input data into a number of chunks
     * @param {Buffer} buffer 
     * @returns {[Buffer]}
     */
    static breakChunks(buffer, max_size = 65535) {


        let chunks = []

        let start = 0;
        let stop = 0;

        while (start < buffer.byteLength) {
            let clip_length = Math.min(buffer.byteLength - start, max_size)
            stop += clip_length

            let clip = Buffer.alloc(clip_length)

            buffer.copy(clip, 0, start, stop)

            chunks.push(clip)

            start += clip_length
        }


        return chunks
    }





    /**
     * 
     * @param {{
     * source:Buffer,
     * type:('text'|'binary'),
     * isLast:boolean
     * }} param0 
     */
    static createSocketFrame({ source, type, isLast = true }) {

        if (type !== 'text' && type !== 'binary') {
            throw new Error(`${type} doesn't name a type. Use either 'text' or 'binary'`)
        }


        let firstByte = type == 'text' ? 0b00000001 : 0b00000010;
        if (isLast) {
            firstByte |= 0b1000_0000;
        }
        let header_buffer;
        let offset = 0;


        if (source.length >= 126) {
            //Extended payload length type
            //So different type of header
            header_buffer = Buffer.alloc(
                2 //The portions of the header that stay the same
                + 2 //The portion to be occupied by the extended payload length
            )
        } else {
            header_buffer = Buffer.alloc(
                2 //The zones of the header that stay the same
            )
        }

        header_buffer.writeUInt8(firstByte, offset++)

        header_buffer.writeUInt8(
            (source.length >= 126 ? 126 : source.length),
            offset++
        )

        if (source.length >= 126) {
            header_buffer.writeUInt16BE(
                source.length,
                offset
            )
            offset += 2
        }

        let final_buffer = Buffer.alloc(
            header_buffer.byteLength +
            source.byteLength
        )

        header_buffer.copy(final_buffer, 0, 0, header_buffer.byteLength)
        source.copy(final_buffer, header_buffer.byteLength, 0, source.byteLength);


        return final_buffer

    }





}






/**
 * A secure hash computed from the clients Sec-Websocket-Key Header
 * This is intended to be used in the Sec-WebSocket-Accept
 * @returns {string}
 */
function computeSecureAccept(key) {
    let hash = crypto.createHash('sha1')
    hash.update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, 'binary')
    return hash.digest().toString('base64')
}


const TranscoderStream = {
    DecoderStream,
    EncoderStream,
    computeSecureAccept
}


export default TranscoderStream

/**
 * 
 * @param {Buffer} buffer 
 * @returns {string}
 */
function printBuffer(buffer) {
    let string = ``
    for (let i = 0; i < buffer.byteLength; i++) {
        string = string.concat(buffer.at(i).toString(16).padStart(2, '0')) + ' '
    }
    return string
}