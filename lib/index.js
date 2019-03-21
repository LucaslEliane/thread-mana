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
const INSPECTION = Symbol('MANA#Inspection');
const ENV = Symbol('MANA#ENV');

const ENQUEUE = setImmediate || process.nextTick;

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
        this[INSPECTION] = null;

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

    setupInspection() {
        if (!this[INSPECTION]) {
            this[INSPECTION] = setTimeout(() => {
                clearTimeout(this[INSPECTION]);
                for (let key in this[THREADS]) {
                    if (this[THREADS][key]['cycle'] === 4) {
                        setImmediate(() => {
                            this[THREADS][key] && this[THREADS][key].terminate();
                        });
                    } else {
                        this[THREADS][key].increaseCycle();
                    }
                }
                this[THREADS].size && this.setupInspection();

            }, this[INSPECTION_CYCLE]);
        }
    }

    setupWorker(file, callback, ...args) {
        if (this._checkFile(file)) {
            const worker = new Worker({
                file
            });
            this._registerWorkerEvents(worker);
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

    _registerWorkerEvents(worker) {
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

        worker.on('message', () => {})
    }

    handleExit(threadId, file) {
        return (exitCode) => {
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