const Cluster = require('../lib/index');
const path = require('path');

const cluster = Cluster.initCluster({
    tasks: {
        app: {
            file: './app.js',
            core: 4,
            watch: true,
        },
        agent: {
            file: './agent.js',
            core: 3,
            watch: false,
        }
    },
    maxThreads: 4,
});
