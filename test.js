const Cluster = require('./index');
const path = require('path');

const cluster = new Cluster({
    tasks: {
        app: {
            file: './app.js',
            core: 4
        },
        agent: {
            file: './agent.js',
            core: 4
        }
    }
});

cluster.setup();

