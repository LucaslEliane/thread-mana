'use strict';

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs');
const {
    Worker, isMainThread, parentPort, workerData
} = require('worker_threads');
const CustomError = require('./error');
const Utils = require('./utils');

const PRIORITY_DEFER = process.nextTick;
const BEHIND_DEFER = setImmediate;


class Cluster extends EventEmitter {
    constructor(options = {}) {
        super();
        this._count = options.count || os.cpus().length;
        this._longestServiceTime = options.maxServiceTime || 60;

        this._workers = this._resolveTasks(options.tasks || {});
    }

    setup() {
        if (!isMainThread) {
            console.error('cluster must setup in master thread.');
            return;
        }

        this._forkWorker(this._workers);
    }

    _forkWorker(workers) {
        workers.forEach(worker => {
            Utils.iteratorWithTimes(worker['core'], () => {
                this._registerEvent(worker);
            })
        })
    }

    _registerEvent(worker) {
        console.log(worker)
    }

    _resolveTasks(tasks) {
        let validTasks = this._checkFiles(tasks);

        if (!validTasks.length) {
            console.error('there are no valid JavaScript document to setup!');
            return new Map();
        }

        const workers = new Map();
        let countCore = 0;

        Object.keys(validTasks).forEach(key => {
            const callback = validTasks[key]['callback'];
            const core = validTasks[key]['core'] || 1;
            countCore += core;

            workers.set(key, {
                ...validTasks[key],
                callback: 
                    callback && 
                    Utils.isType(callback, '[object Function]') ?
                    callback : 
                    () => {
                        console.log(`[Thread] Tasks (${key}) executed!`);
                    },
                core,
            });
        });

        return this._justifyThreads(workers, countCore, this._count);
    }

    _justifyThreads(workers, countCore, maxCore) {
        let average = maxCore / countCore;

        for (let [key, worker] of workers) {
            worker['core'] = Math.ceil(worker['core'] * average);
        }

        return workers;
    }

    _checkFiles(tasks) {
        return Object.values(tasks)
            .filter(task => 
                this._fileExists(task['file'])
            );
    }

    _fileExists(file) {
        try {
            fs.accessSync(file, fs.constants.R_OK);
            return true;
        } catch (err) {
            const message = `worker\'s file: ${file} is not exist.`;
            console.error(new CustomError.FileNotExistError(message));
            return false;
        }
    }
}

module.exports = Cluster;