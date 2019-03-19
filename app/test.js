const Cluster = require('../lib/index1');
const path = require('path');

const cluster = Cluster.initCluster({
    maxThreads: 4
});

cluster.close();