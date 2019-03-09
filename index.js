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
        for (let [key, worker] of workers) {
            Utils.iteratorWithTimes(worker['core'], (times) => {
                worker.threads && Array.isArray(worker.threads) ? 
                    worker.threads.push(this._registerEvent(worker, times, key)) :
                    [this._registerEvent(worker, times, key)];
            });
        }
    }

    _registerEvent(worker, times, key) {
        const thread = new Worker(worker.file);
        const { callback } = worker;

        thread.on('online', () => {
            console.log(
                '-------------------\n' +
                `[Thread] ${key}(${times}) is Online`
            );
        });

        thread.on('error', (err) => {
            callback(err);
        });

        thread.on('message', (message) => {
            callback(null, message);
        });

        thread.on('exit', exitCode => {
            console.log(
                '----------------------------------------------\n' +
                `[Thread] is Exited with ExitCode: ${exitCode}`
            );
        });

        return thread;
    }

    _resolveTasks(tasks) {
        let validTasks = this._checkFiles(tasks);

        if (!validTasks.length) {
            console.error('there are no valid JavaScript document to setup!');
            return new Map();
        }

        const workers = new Map();
        let countCore = 0;

        validTasks.forEach(task => {
            let [ key, options ] = task;

            const callback = options['callback'];
            const core = options['core'] || 1;
            countCore += core;

            workers.set(key, {
                ...options,
                callback: 
                    callback && 
                    Utils.isType(callback, '[object Function]') ?
                    callback : 
                    (err, message) => {
                        if (err) {
                            console.error(
                                '======================================\n' +
                                `[Thread] Tasks (${key}) Got an Error\n`,
                                new CustomError.ThreadError(),
                            );
                            return false;
                        }
                        console.log(
                            `[Thread] Tasks (${key}) Got a Message` +
                            '=====================================' +
                            `Tasks (${key}) Got Message: ${message}`
                        );
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
        return Object.entries(tasks)
            .filter(([key, value]) => 
                this._fileExists(tasks[key]['file']) && ( tasks[key]['key'] = key )
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