/**
 * Copyright 2023 HolyCorn Software
 * The soul system
 * This module (worker-world), provides the ability to have a set of tasks that are processed in a controlled manner,
 * stage by stage, with the possibility of throwing mild, and severe errors.
 */



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

/**
 * @template TaskType
 */
export default class WorkerWorld {

    /**
     * @param {soul.util.workerworld.Params<TaskType>} params
     */
    constructor(params) {
        params.width ||= 1;
        this[args] = params

        if (!Array.isArray(params?.stages)) {
            throw new Error(`The 'stages' parameter must be an array of stages.`)
        }

    }

    async stop() {
        this[groups]?.forEach(group => group.destroy())
        this[groups] = undefined

    }

    async start() {

        this.stop();

        this[groups] = [...(' '.repeat(this[args].width - 2))].map((x, i) => new TaskGroup(
            {
                ...this[args],
                stageIndex: i
            }
        ));

    }



}



/**
 * @template DataType
 */
class TaskGroup {

    /**
     * 
     * @param {soul.util.workerworld.TaskGroupParams<DataType>} params
     */
    constructor(params) {
        this[args] = params

        /** @type {Worker<DataType>[]} */
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
                this[workers].push(nw)
                return nw
            }
        })())
        if (available) {
            available.tick(this[getCursor]()).then(val => {
                if (val) {
                    setImmediate(() => this[assign]())
                }
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

        this[cursor].once('close', () => {
            delete this[cursor]
        })

        return this[cursor]

    }

}



/**
 * The usefulness of this class, is in launching tasks.
 * It decides
 * @template DataType
 */
class Worker {

    /**
     * 
     * @param {soul.util.workerworld.TaskGroupParams<DataType>} params 
     */
    constructor(params) {
        this[args] = params
    }


    /**
     * 
     * @param {import('mongodb').FindCursor<soul.util.workerworld.Task<DataType>>} cursor 
     * @returns {Promise<boolean>}
     */
    async tick(cursor) {
        if (this[isTicking]) {
            return
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
            // Let's get the  
            if (!await cursor.hasNext()) {
                cursor.close().catch(() => undefined)
                return false
            }
            const task = await cursor.next()
            if (!task) {
                return true
            }
            if ((task.hibernation || 0) > Date.now()) {
                return true;
            }

            const update = async () => {
                await this[args].stages[this[args].stageIndex].collection.updateOne({ id: task.id }, { $set: { ...task } })
                return true;
            }

            task.stage = this[args].stages[this[args].stageIndex].name

            const results = await this[args].execute(task)

            if (results?.error) {
                if (results.error.fatal) {
                    task.expires = Date.now() + (24 * 60 * 60 * 1000)
                    task.dead = true
                    return await update()
                }
            }

            // In case we're moving to a different stage abruptly..
            let stage;
            if (results?.newStage) {
                stage = this[args].stages.find(x => x.name == results.newStage)
                if (!stage) {
                    console.warn(`After execution of task ${task.id.magenta}, the asked for movement to a non-existent stage. ${results.newStage.red}`)
                    stage = this[args].stages[this[args].stageIndex + 1]
                }
            }

            if (results?.ignored) {
                task.hibernation = results.ignored
                return await update()
            }

            await stage?.collection.insertOne(task)
            await this[args].stages[this[args].stageIndex].collection.deleteOne({ id: task.id })


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