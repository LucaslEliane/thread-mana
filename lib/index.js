'use strict';

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs');
const {
    Worker, isMainThread, parentPort, workerData,
} = require('worker_threads');
const path = require('path');

const moment = require('moment');

const Logger = require('./logger');
const CustomError = require('./error');

const MAX_THREADS = Symbol('MANA#MaxThread');
const BOOT_TIME = Symbol('MANA#BootTime');
const THREADS = Symbol('MANA#Threads');
const FILE_CACHE = Symbol('MANA#FileCache');
const TASK_QUEUE = Symbol('MANA#TaskQueue');
const INSPECTION_CYCLE = Symbol('MANA#InspectionCycle');
const INSPECTION = Symbol('MANA#Inspection');

const NOOP = () => {};

class Cluster extends EventEmitter {
    constructor(options = {}) {
        super();

        this[MAX_THREADS] = options.maxThreads || os.cpus().length;
        this[INSPECTION_CYCLE] = options.inspectionCycle || 500;
        this[BOOT_TIME] = Date.now();
        this[THREADS] = new Map();
        this[FILE_CACHE] = {};
        this[TASK_QUEUE] = [];
        this[INSPECTION] = null;

        this.logger = new Logger({
            pathname: path.resolve(__dirname, 'log'),
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
        this.clearThreads();

        this[TASK_QUEUE] = undefined;

        const message =
            clusterDuration
                ? `Thread Pool have provided service for:\t${clusterDuration}`
                : `Thread Pool boot time encounter some error`;

        
        this.logger.info(message);
        this.emit('exit');
    }

    clearThreads() {
        for (key in this[THREADS]) {
            console.log(key);
        }
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
                        this[THREADS][key]['cycle'] += 1;
                    }
                }
                this[THREADS].size && this.setupInspection();

            }, this[INSPECTION_CYCLE]);
        }
    }

    setupWorker(filename, callback, ...args) {
        if (this._checkFile(filename)) {
            const worker = new Worker
        }
    }

    _checkFile(filename) {
        if (this[FILE_CACHE][filename]) return true;

        try {
            fs.accessSync(filename, fs.constants.R_OK | fs.constants.X_OK);
            this[FILE_CACHE][filename] = true;
            return true;
        } catch (err) {
            this.emit(
                'error',
                new CustomError.ParameterError(`file: ${filename} is not exist.`)
            );
            return false;
        }
    }

    _registerWorkerEvents(worker) {
        worker.on('online', () => {
            this[THREADS].set(worker.threadId, worker);
        });

        worker.on('error', )

        worker.on('exit', )

        worker.on('message' )
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