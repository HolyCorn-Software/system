/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (worker-world), provides the ability to have a set of tasks that are processed in a controlled manner,
 * stage by stage, with the possibility of throwing mild, and severe errors.
 */

import shortUUID from 'short-uuid'
import nodeUtil from 'node:util'



const getCursor = Symbol()
const args = Symbol()
const cursor = Symbol()
const assign = Symbol()
const isTicking = Symbol()
const waitTime = Symbol()
const workers = Symbol()
const groups = Symbol()
const watcher = Symbol()
const killed = Symbol()
const internal = Symbol()

/**
 * @template T
 * @template Ns
 */
export default class WorkerWorld {

    /**
     * @param {soul.util.workerworld.Params<T, Ns>} params
     */
    constructor(params) {
        params.width ||= 1;

        this[args] = params;

        /** @type {TaskGroup<T, Ns>} */
        this[groups] = [];


        if (!Array.isArray(params?.stages)) {
            throw new Error(`The 'stages' parameter must be an array of stages.`)
        }

    }

    /**
     * This method adds a new task to the database
     * @param {T} data 
     * @returns {Promise<void>}
     */
    async insertOne(data) {
        /** @type {soul.util.workerworld.Params<T, Ns>} */
        const params = this[args]
        await params.stages[0].collection.insertOne(
            {
                ...data,
                '@worker-world-task': {
                    created: Date.now(),
                    id: shortUUID.generate(),
                    stage: params.stages[0].name,
                    updated: Date.now()
                }
            }
        )
    }

    async stop() {
        this[groups]?.forEach(group => group.destroy())
        this[groups] = undefined

    }

    async start() {

        this.stop();

        (
            /**
             * @this WorkerWorld
             */
            function () {

                try {

                    this[groups] = this[args].stages.map(
                        (x, i) => new TaskGroup({
                            ...this[args],
                            stageIndex: i
                        })
                    )
                } catch (e) {
                    throw e
                }

            }
        ).bind(this)();
    }




    static {
        /**
         * This method 'purifies' data extracted from a database, by removing other now unncessary data, that was used to manage its task-execution process
         * @template Input
         * @param {soul.util.workerworld.Task<Input>} record 
         */
        this.trim = (record) => {
            if (record) {
                record.$modified = record['@worker-world-task'].updated || record['@worker-world-task'].created
                delete record["@worker-world-task"]
                delete record._id
            }
            return record
        }

    }


    [internal] = {

        parseFilter: (filter) => {
            let once$updated
            /**
             * 
             * @param {soul.util.workerworld.Filter<T, Ns>} filter 
             */
            function parse(filter) {

                if (filter.$modified) {
                    filter['@worker-world-task.updated'] = filter.$modified
                    once$updated = true
                    delete filter.$modified
                }
                if (filter.$or) {
                    for (const item of filter.$or) {
                        parse(item)
                    }
                }
            }


            parse(filter)

            return filter
        },


        /** 
         * This method returns the collections that would be potentially affected by, or needed by, a database operation involving a given filter.
         * This is based on the fact that, certain filters specify the $stages parameter, which tells us which collections we're dealing with.
         * This method prioritizes 'newer' collections.
         * @param {soul.util.workerworld.Filter<T, Ns>} filter
         * @returns {soul.util.workerworld.TaskCollection<T>[]}
         */
        getCollectionsFromFilter: (filter) => (filter?.$stages ? filter.$stages.map(x => this[args].stages.find(y => y.name == x)) : this[args].stages).map(x => x.collection),

        /**
         * @template Ret
         * This method forms the base of efficient asynchronous simultaneous operations needed by this module.
         * It allows an operation to be performed on multiple collections, with the intention of stopping once we find the first successful operation. 
         * @param {(collection:soul.util.workerworld.TaskCollection<T>)=>Ret} operation A function that would be called for each of the collections. If the function returns a non-falsish value, it is 
         * understood that the operation is complete, and other similar operations would be canceled. 
         * If the function returns a falshish value (e.g undefined), then function would be called for other collections, untill we find something that succeeds,
         * or all return falshish
         * @param {soul.util.workerworld.TaskCollection<T>[]} collections
         * @returns {Promise<Awaited<Ret>>}
         */
        raceOperation: async (operation, collections) => {
            // Split the collections into batches, of about 60%

            // Then query batch by batch

            const sixty = Math.ceil(collections.length * 0.6)
            let results;

            for (let i = 0; i < collections.length;) {
                const chunk = collections.slice(i, i += sixty)
                let completeCount = 0;

                // Here, we're running multiple operations on the database.
                // The first to succeed operation wins

                // This promise is how the other operations would know it, when the first operation has already succeeded
                // Once this promise resolves, other operations promises resolve
                let grandResolve;

                const allDone = new Promise((resolve, reject) => (grandResolve = resolve))

                results = await Promise.race(
                    chunk.map(collection => new Promise(async (resolve, reject) => {
                        // In case some other operation finds the data before this one, then stop.
                        allDone.then(resolve, () => resolve())

                        let data;

                        try {
                            data = await operation(collection)
                            // If this is the operation that actually finds the data, then all is done.
                            if (data) {
                                resolve(data) // Tell the Promise.race() to continue.
                                grandResolve(data) // Tell the other operations to stop.
                            }
                        } catch (e) {
                            reject(e)
                        } finally {
                            completeCount += 1
                            if (completeCount >= chunk.length) {
                                grandResolve(data)
                            }
                        }

                    }))
                );

                // If during this iteration, we found the data we were looking for, then  hurray, we stop.
                if (results) {
                    break;
                }

            }

            return results;
        },
        /**
         * @template MethodName
         * This method is more specific, than the raceOperation() method, by the fact that it performs one of the commonly known operations, such
         * as deleteOne(), updateOne(), etc., and then checking properties such as deletedCount, to determine if the operation was complete.
         * @param {soul.util.workerworld.Filter<T,Ns>} filter 
         * @param {soul.util.workerworld.LastItems<Parameters<soul.util.workerworld.TaskCollection<T>[MethodName]>>} params 
         * @param {keyof soul.util.workerworld.TaskCollection<T>|MethodName} methodName 
         * @param {keyof Awaited<ReturnType<soul.util.workerworld.TaskCollection<T>[MethodName]>>} checkProperty 
         */
        singularCollectionRaceOperation: async (filter, params, methodName, checkProperty) => {


            const { $stages, ...nwFilter } = this[internal].parseFilter(filter)

            return await this[internal].raceOperation(
                async collection => {
                    const results = await collection[methodName](nwFilter, ...params)
                    return results[checkProperty] > 0
                },
                this[internal].getCollectionsFromFilter(filter)
            )

        }
    }


    /**
     * This method queries various databases, to find a single element.
     * The first one to find the element wins.
     * @param {soul.util.workerworld.Filter<T,Ns>} filter 
     */
    async findOne(filter) {
        const collections = this[internal].getCollectionsFromFilter(filter)

        const { $stages, ...nwFilter } = this[internal].parseFilter(filter)

        return await this[internal].raceOperation(
            collection => collection.findOne(nwFilter).then(x => WorkerWorld.trim(x)),
            collections
        )
    }

    /**
     * This method finds records that match a given filter, from multiple collections.
     * @param {soul.util.workerworld.Filter<T,Ns>} filter
     * @param {import('mongodb').FindOptions<T>} options
     */
    async* find(filter, options) {

        const { $stages, ...nwFilter } = this[internal].parseFilter(filter)

        for (const collection of await this[internal].getCollectionsFromFilter(filter)) {

            const cursor = collection.find(nwFilter, options)
            while ((await cursor.hasNext())) {
                yield WorkerWorld.trim(await cursor.next())
            }
        }
    }

    /**
     * This method deletes a piece of data from the collection that has it.
     * @param {soul.util.workerworld.Filter<T, Ns>} filter 
     * @returns {Promise<void>}
     */
    async deleteOne(filter) {

        return void (
            await this[internal].singularCollectionRaceOperation(
                filter,
                undefined,
                'deleteOne',
                'deletedCount'
            )
        )
    }


    /**
     * This method updates deletes all records that match a given filter
     * @param {soul.util.workerworld.Filter<T,Ns>} filter 
     * @param {import('mongodb').UpdateFilter<T>} updateData 
     * @param {import('mongodb').UpdateOptions} options 
     * @returns {Promise<import('mongodb').UpdateResult>}
     */
    async deleteMany(filter, updateData, options) {

        const { $stages, ...nwFilter } = this[internal].parseFilter(filter)

        return await Promise.all(
            this[internal].getCollectionsFromFilter(filter).map(col => col.deleteMany(nwFilter, updateData, options))
        )
    }


    /**
     * This method updates a single record in the first collection that contains it.
     * @param {soul.util.workerworld.Filter<T,Ns>} filter 
     * @param {import('mongodb').UpdateFilter<T>} updateData 
     * @param {import('mongodb').UpdateOptions} options 
     * @returns {Promise<import('mongodb').UpdateResult>}
     */
    async updateOne(filter, updateData, options) {
        (updateData.$set ||= {})['@worker-world-task.updated'] = Date.now();

        return await this[internal].singularCollectionRaceOperation(
            filter,
            [
                updateData,
                options
            ],
            'updateOne',
            'matchedCount'
        )
    }



    /**
     * This method updates all records that match a given filter
     * @param {soul.util.workerworld.Filter<{name: 'goat'}&T,Ns>} filter 
     * @param {import('mongodb').UpdateFilter<T>} updateData 
     * @param {import('mongodb').UpdateOptions} options 
     * @returns {Promise<import('mongodb').UpdateResult>}
     */
    async updateMany(filter, updateData, options) {
        // Usually, when updating many records, matches would be found in multiple collections.

        (updateData.$set ||= {})['@worker-world-task.updated'] = Date.now();

        const { $stages, ...nwFilter } = this[internal].parseFilter(filter)

        return await Promise.all(
            this[internal].getCollectionsFromFilter(filter).map(col => col.updateMany(nwFilter, updateData, options))
        )
    }


}



/**
 * @template T
 * @template Ns
 */
class TaskGroup {

    /**
     * 
     * @param {soul.util.workerworld.TaskGroupParams<T>} params
     */
    constructor(params) {
        this[args] = params

        /** @type {Worker<T, Ns>[]} */
        this[workers] = []

        this[watcher] = this.collection.watch().addListener('change', (change) => {
            if (change.operationType !== 'insert' && change.operationType !== 'update') {
                return;
            }
            // Now, there's a task to be executed.
            this[assign]()
        });


        this[assign]()

    }

    destroy() {
        this[killed] = true
        this[watcher].removeAllListeners()
        this[watcher].close().catch(e => console.warn(`Error closing watcher\n`, e))
        this[workers] = []
    }

    [assign]() {
        if (this[killed]) {
            return;
        }
        // Can we find an open worker?
        const available = (this[workers].find(x => x.isFree) || (() => {
            if (this[workers].length < this[args].width) {
                const nw = new Worker(this[args])
                nw.canTakeover = (task) => {
                    // We're checking, if the processor of the task exists. The calling worker can take over, if the processor doesn't exist.
                    return !this[workers].some(worker => worker.id == task['@worker-world-task'].processor)
                }
                this[workers].push(nw)
                return nw
            }
        })())
        if (available) {
            const cursor = this[getCursor]();
            available.tick(cursor).then(async val => {
                setTimeout(() => this[assign](), val ? 200 : 1000)
            }).catch(e => {
                console.error(`Very fatal error\n`, e)
                this[workers] = this[workers].filter(x => x == available)
            })
        }
    }

    get collection() {
        return this[args].stages[this[args].stageIndex].collection

    }


    /**
     * This method returns a cursor we can iterate over, to fetch the next task that would be executed
     * 
     */
    [getCursor]() {

        if (!this[cursor]) {
            this[cursor] = this.collection.find()
        }

        const theCursor = this[cursor]

        theCursor.removeAllListeners('close')

        theCursor.once('close', () => {
            if (this[cursor] == theCursor) {
                delete this[cursor]
            }
            theCursor?.removeAllListeners()
        })

        return theCursor

    }

}



/**
 * The usefulness of this class, is in launching tasks.
 * It decides
 * @template T
 * @template Ns
 */
class Worker {

    /**
     * 
     * @param {soul.util.workerworld.TaskGroupParams<T, Ns>} params 
     */
    constructor(params) {
        this[args] = params
        this.id = shortUUID.generate()
    }

    /**
     * 
     * @param {soul.util.workerworld.Task<T, Ns>} task 
     */
    canTakeover(task) {
        throw new Error(`This method should have been overrided by the TaskGroup`)
    }


    /**
     * 
     * @param {import('mongodb').FindCursor<soul.util.workerworld.Task<T, Ns>>} cursor 
     * @returns {Promise<boolean>}
     */
    async tick(cursor) {
        if (this[isTicking]) {
            return false
        }
        if (this[waitTime]) {
            await new Promise(x => setTimeout(x, this[waitTime]))
        }
        this[isTicking] = true

        /**
         * This method actually triggers the work of getting the task done.
         * 
         * If it returns true, then we can move to the next task
         * @returns {Promise<boolean>}
         */
        const main = async () => {
            // If there's nothing more to process, let's skip the entire process.
            if (cursor.closed || cursor.closing) {
                await cursor.closing
                return true;
            }

            try {

                if (!await cursor.hasNext()) {
                    true
                    await (cursor.closing = cursor.close())
                    return false
                }
            } catch {
                return false
            }

            let task;
            try {
                task = await cursor.next()
            } catch (e) {
                return false;
            }
            if (!task) {
                return true
            }
            if ((task['@worker-world-task'].hibernation || 0) > Date.now()) {
                return true;
            }

            if ((task['@worker-world-task'].processor != this.id) && !this.canTakeover(task)) {
                return;
            }


            const update = async () => {
                await this[args].stages[this[args].stageIndex].collection.replaceOne({ '@worker-world-task.id': task['@worker-world-task'].id }, task)
                return true;
            }

            // Update the task with our current processor id, so that other tasks may avoid id
            task['@worker-world-task'].processor = this.id
            await update()

            // Randomly wait for a while
            await new Promise(next => setTimeout(next, 500 * Math.random()))

            // Now, if some other worker was busy doing the same thing as us, the randomness would favour one of us
            if (!await this[args].stages[this[args].stageIndex].collection.findOne({ '@worker-world-task.id': task['@worker-world-task'].id, '@worker-world-task.processor': task['@worker-world-task'].processor })) {
                // And if we're not favoured, we back out.
                return;
            }


            task['@worker-world-task'].stage = this[args].stages[this[args].stageIndex].name


            const initial = JSON.stringify(task)


            const results = await this[args].execute(task)



            if (results?.ignored) {
                task['@worker-world-task'].hibernation = results.ignored
            }


            if (results?.error) {
                (task['@worker-world-task'].retries ||= []).push({
                    error: {
                        message: results.error.message,
                        stack: `${nodeUtil.inspect(results.error.stack, { colors: true, depth: null })}`,
                        fatal: results.error.fatal,
                    },
                    time: Date.now()
                });

                task['@worker-world-task'].retries = task['@worker-world-task'].retries.reverse().slice(0, 5)


                if (results.error.fatal) {
                    task['@worker-world-task'].expires = Math.min(Date.now() + (24 * 60 * 60 * 1000), task['@worker-world-task'].expires || Infinity)
                    task['@worker-world-task'].dead = true
                }
            }


            const hasChanged = () => JSON.stringify(task) != initial



            if (results?.delete) {
                await this[args].stages[this[args].stageIndex].collection.deleteMany({ '@worker-world-task.id': task['@worker-world-task'].id })
                await stage?.collection.deleteMany({ '@worker-world-task.id': task['@worker-world-task'].id })
            } else {

                // In case we're moving to a different stage abruptly..
                let stage;
                if (results?.newStage) {
                    stage = this[args].stages.find(x => x.name == results.newStage)
                    if (!stage) {
                        console.warn(`After execution of task ${task['@worker-world-task'].id.magenta}, the executor asked for movement to a non-existent stage: ${(results.newStage || 'undefined').red}`)
                        stage = this[args].stages[Math.min(this[args].stageIndex + 1, this[args].stages.length - 1)]
                    }
                }

                const currentStage = this[args].stages[this[args].stageIndex]


                if (hasChanged() || currentStage.name !== (results?.newStage || currentStage.name)) {
                    if (stage) {
                        await currentStage.collection.deleteMany({ '@worker-world-task.id': task['@worker-world-task'].id })
                        await stage.collection.insertOne(task)
                    } else {
                        await currentStage.collection.replaceOne({ "@worker-world-task.id": task['@worker-world-task'].id }, task)
                    }

                }

            }


            return true;


        }

        let status;
        try {
            status = await main()
        } catch (e) {
            console.error(e);
            // Delay the next tick
            this[waitTime] ||= 1000
            this[waitTime] *= 1.5
        }
        this[isTicking] = false;
        return status
    }
    get isFree() {
        return !this[isTicking]
    }

}