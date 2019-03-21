const Cluster = require('../lib/index');
const path = require('path');

const cluster = Cluster.initCluster({
    maxThreads: 4,
    logDir: path.resolve(__dirname, 'log'),
    inspectionCycle: 500,
    env: 'prod',
});

cluster.setupWorker(
    path.resolve(__dirname, './listen.js')
);

cluster.setupWorker(
    path.resolve(__dirname, './normal.js')
)

cluster.setupWorker(
    path.resolve(__dirname, './err.js')
)

setTimeout(() => {
    cluster.close()
}, 2000);