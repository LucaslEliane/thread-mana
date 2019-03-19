const { createLogger, format, transports, addColors } = require('winston');
const { combine, timestamp, label, printf, colorize } = format;
const path = require('path');


function Logger(options = {
    pathname: __dirname,
    dev: false,
}) {
    const { pathname } = options;

    const levels = {
        info: 2,
        warn: 1,
        error: 0,
    };

    const colors = {
        warn: 'yellow',
        error: 'red',
    };

    const format = printf(({level, message, label, timestamp }) => {
        return `${label}(${timestamp}): ${level} - ${message}`;
    });

    addColors(colors);

    const logger = createLogger({
        levels,
        format: combine(
            // colorize(),
            label({ label: '[Thread Mana]' }),
            timestamp(),
            format
        ),
        transports: [
            new transports.Console(),
            new transports.File({
                filename: path.resolve(pathname, 'app.log'),
                level: 'info'
            }),
            new transports.File({
                filename: path.resolve(pathname, 'err.log'),
                level: 'error'
            })
        ]
    })
    

    return logger;
};

module.exports = Logger;