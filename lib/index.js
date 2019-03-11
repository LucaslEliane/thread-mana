'use strict';

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs');
const {
    Worker, isMainThread, parentPort, workerData
} = require('worker_threads');
const CustomError = require('./error');
const Utils = require('./utils');
const moment = require('moment');

const DEFER = setImmediate || process.nextTick;
const MAX_THREADS = Symbol('THREAD#MAX_THREADS');

const SILENCE = {
    log: () => {},
    error: () => {},
};


class Cluster extends EventEmitter {
    constructor(options = {}) {
        super();
        this._longestServiceTime = options.maxServiceTime || 60;
        this._logger = options.logger || SILENCE;
        this[MAX_THREADS] = options.maxThreads || os.cpus().length;
        this._SETUP = false;

        this._workers = this._resolveTasks(options.tasks || {});
    }

    setup() {
        if (!isMainThread) {
            this._logger.error('cluster must setup in master thread.');
            return;
        }
        if (this._SETUP) {
            this._logger.error('cluster has been setup');
        }

        this._SETUP = true;
        this._bootTime = Date.now();

        this._workers = this._forkWorker(this._workers);
    }

    // initial execute all workers, so we can catch the worker's error
    _forkWorker(workers) {
        for (let [key, worker] of workers) {
            if (!(worker.threads || Array.isArray(worker.threads))) {
                worker.threads = [];
            }
            Utils.iteratorWithTimes(worker['core'], (times) => {
                worker.threads.push(
                    this._registerEvent(worker, times, key)
                )
            });
        }

        return workers;
    }

    _registerEvent(worker, times, key) {
        const thread = new Worker(worker.file);
        const { callback } = worker;

        thread.on('online', () => {
            this._logger.log(
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
            this._logger.log(
                '----------------------------------------------\n' +
                `[Thread] ${key}(${times}) is Exited with ExitCode: ${exitCode}`
            );
        });

        return thread;
    }

    _resolveTasks(tasks) {
        let validTasks = this._checkFiles(tasks);

        if (!validTasks.length) {
            this._logger.error('there are no valid JavaScript document to setup!');
            return new Map();
        }

        const workers = new Map();
        let countCore = 0;

        validTasks.forEach(task => {
            let [ key, options ] = task;

            const callback = options['callback'];
            let core = options['core'] || 1;

            countCore += core;

            workers.set(key, {
                ...options,
                callback: 
                    callback && 
                    Utils.isType(callback, '[object Function]') ?
                    callback : 
                    (err, message) => {
                        if (err) {
                            this._logger.error(
                                '======================================\n' +
                                `[Thread] Tasks (${key}) Got an Error\n`,
                                new CustomError.ThreadError(),
                            );
                            return false;
                        }
                        this._logger.log(
                            `[Thread] Tasks (${key}) Got a Message` +
                            '=====================================' +
                            `Tasks (${key}) Got Message: ${message}`
                        );
                    },
                core,
            });
        });

        return this._justifyThreads(workers, countCore, this[MAX_THREADS]);
    }

    _justifyThreads(workers, countCore, maxCore) {
        let average = maxCore / countCore;

        for (let [key, worker] of workers) {
            worker['core'] = Math.floor(worker['core'] * average) || 1;
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
            this._logger.error(new CustomError.FileNotExistError(message));
            return false;
        }
    }

    get clusterDuration() {
        const exitTime = Date.now();

        if (this._bootTime) {
            return exitTime - this._bootTime;
        }

        return 0;
    }

    static initCluster(options = {}) {
        const cluster = new Cluster(options);

        cluster.on('exit', () => {
            const clusterDuration = cluster.clusterDuration;
            const message = 
                clusterDuration
                    ? `The Cluster Provided Service for: ${moment.duration(clusterDuration)}`
                    : `The Cluster had not Setup Any Thread for now!`;

            cluster.elegantExit(() => {
                console.log(message);
            });
        });

        cluster.setup();

        return cluster;
    }
}

module.exports = Cluster;