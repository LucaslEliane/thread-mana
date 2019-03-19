'use strict';

const { Worker } = require('worker_threads');

const CYCLE = Symbol('MANA#Cycle');

class Worker {
    constructor(options) {
        this[CYCLE] = 0;
    }

    set cycle(value) {
        this[CYCLE] = 
    }

    get cycle() {
        return this[CYCLE];
    }
}