const Cluster = require('../lib/index');
const path = require('path');

const cluster = Cluster.initCluster({
    maxThreads: 4,
    logDir: path.resolve(__dirname, 'log'),
    inspectionCycle: 2000,
    env: 'prod',
});

cluster.setupWorker(
    path.resolve(__dirname, './listen.js'),
    (err, resolve, c) => {
        if (!err) {
            console.log(resolve);
        }
    }
);

cluster.setupWorker(
    path.resolve(__dirname, './normal.js')
)

cluster.setupWorker(
    path.resolve(__dirname, './err.js')
)

setTimeout(() => cluster.setupWorker(
    path.resolve(__dirname, './listen.js'),
    (err, resolve, c) => {
        if (!err) {
            console.log(resolve);
        }
    }
), 10000);