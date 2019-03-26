'use strict';

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs');
const {
    isMainThread, parentPort, workerData,
} = require('worker_threads');
const path = require('path');

const moment = require('moment');

const Worker = require('./worker');
const Logger = require('./logger');
const CustomError = require('./error');

const MAX_THREADS = Symbol('MANA#MaxThread');
const BOOT_TIME = Symbol('MANA#BootTime');
const THREADS = Symbol('MANA#Threads');
const FILE_CACHE = Symbol('MANA#FileCache');
const TASK_QUEUE = Symbol('MANA#TaskQueue');
const INSPECTION_CYCLE = Symbol('MANA#InspectionCycle');
const MACRO_TASK = Symbol('MANA#MacroTask');
const MICRO_TASK = Symbol('MANA#MicroTask');
const STARVE_TASK = Symbol('MANA#StarveTask');
const ENV = Symbol('MANA#ENV');

const ENQUEUE = setImmediate || process.nextTick;

const NOOP = () => {};

class Cluster extends EventEmitter {
    constructor(options = {
        logDir: __dirname
    }) {
        super();

        this[MAX_THREADS] = options.maxThreads || os.cpus().length;
        this[INSPECTION_CYCLE] = options.inspectionCycle || 500;
        this[ENV] = options.env || process.env;
        this[BOOT_TIME] = Date.now();
        this[THREADS] = new Map();
        this[FILE_CACHE] = {};
        this[TASK_QUEUE] = [];
        this[MACRO_TASK] = null;
        this[MICRO_TASK] = null;
        this[STARVE_TASK] = [];

        this.logger = new Logger({
            pathname: options.logDir,
        });
    }

    static initCluster(options = {}) {
        const cluster = new Cluster(options);

        if (!isMainThread) {
            cluster.logger.error(
                `cluster must running in the main thread.`
            );
            return null;
        }

        return cluster;
    }

    close() {
        const clusterDuration = this.clusterDuration;

        this.logger.info('cluster is ready to exit.');

        ENQUEUE(() => {
            this.clearThreads()
        });

        this[TASK_QUEUE] = undefined;

        const message =
            clusterDuration
                ? `Thread Pool have provided service for:\t${clusterDuration}`
                : `Thread Pool boot time encounter some error`;

        
        this.logger.info(message);
        this.emit('exit');
    }

    clearThreads() {
        this[THREADS].forEach((thread, threadId) => {
            thread.terminate();
        });
    }

    _macroTask() {
        if (!this[MACRO_TASK]) {
            this[MACRO_TASK] = setTimeout(() => {
                for (let [key, thread] of this[THREADS]) {
                    if (thread.cycle === 4) {
                        ENQUEUE(() => {
                            thread && thread.terminate();
                        });
                    } else {
                        thread.increaseCycle();
                    }
                }
                clearTimeout(this[MACRO_TASK]);
                this[MACRO_TASK] = null;
                this[THREADS].size && this._macroTask();
            }, this[INSPECTION_CYCLE]);
        }
    }

    setupWorker(file, callback, ...args) {
        if (this._checkFile(file)) {
            if (!this[THREADS].size) {
                this[TASK_QUEUE].push({
                    file,
                    callback,
                    args,
                    starvation: 0,
                });
                return;
            }
            const worker = new Worker({
                file
            });
            this._registerWorkerEvents(worker, callback);
            this._setupInspection();
        }
    }

    _checkFile(file) {
        if (this[FILE_CACHE][file]) return true;

        try {
            fs.accessSync(file, fs.constants.R_OK);
            this[FILE_CACHE][file] = true;
            return true;
        } catch (err) {
            this.emit(
                'error',
                new CustomError.ParameterError(`file: ${file} is not exist.`)
            );
            return false;
        }
    }

    _registerWorkerEvents(worker, callback) {
        const handleExit = this.handleExit(worker.threadId, worker.file);


        worker.on('online', () => {
            this[THREADS].set(worker.threadId, worker);
        });

        worker.on('error', error => {
            if (this[ENV] === 'prod') {
                this.logger.error(
                    `child thread error: \n${error.stack}`
                );
            } else {
                throw new CustomError.ThreadError('child thread error');
            }
        });

        worker.on('exit', handleExit);

        worker.on('message', callback || NOOP);
    }

    _reliveTask() {
        if (this[STARVE_TASK].length) {
            const task = this[STARVE_TASK].unshift();
            delete task.starvation;
            this.setupWorker(task.file, task.callback, ...task.args);
            return true;
        }

        if (this[MICRO_TASK].length) {
            const task = this[MICRO_TASK].unshift();
            delete task.starvation;
            this.setupWorker(task.file, task.callback, ...task.args);
            return true;
        }
    }

    handleExit(threadId, file) {
        return (exitCode) => {
            this[THREADS].has(threadId) && this[THREADS].delete(threadId);
            this._reliveTask();
            this.logger.info(`thread ${file} ( threadId: ${threadId} ) exit with code ${exitCode}`);
        }
    }

    get clusterDuration() {
        const currentTime = Date.now();

        if (this[BOOT_TIME]) {
            return moment.duration(currentTime - this[BOOT_TIME]).humanize();
        }

        return 0;
    }
}

module.exports = Cluster;