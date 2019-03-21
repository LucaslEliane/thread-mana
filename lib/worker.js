'use strict';

const { Worker } = require('worker_threads');

const CYCLE = Symbol('MANA#Cycle');

class WorkerThread {
    constructor(options) {
        this[CYCLE] = 1;

        this.worker = new Worker(options.file);
        this._options = {
            ...options
        };
    }
    
    increaseCycle() {
        this[CYCLE] += 1;
    }

    get cycle() {
        return this[CYCLE];
    }

    get threadId() {
        return this.worker.threadId;
    }

    get file() {
        return this._options.file;
    }

    terminate() {
        this.worker.terminate();
    }

    on(event, callback) {
        this.worker.on(event, callback);
    }
}

module.exports = WorkerThread;