const Cluster = require('./index');
const path = require('path');

const cluster = new Cluster({
    tasks: {
        app: {
            file: path.join(__dirname, 'app.js')
        },
        agent: {
            file: './agent.js'
        }
    }
});

