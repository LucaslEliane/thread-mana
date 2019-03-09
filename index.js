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


    }

    _resolveTasks(tasks) {
        let validTasks = this._checkFiles(tasks);

        if (!validTasks.length) {
            console.error('there are no valid JavaScript document to setup!');
            return new Map();
        }

        const workers = new Map();

        Object.keys(validTasks).forEach(key => {
            workers.set(key, {
                ...validTasks[key]
            });
        });

        return workers;
    }

    _checkFiles(tasks) {
        const files = Utils.getValues(tasks, (obj) => obj.file);

        return files.filter(file => this._fileExists(file));
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