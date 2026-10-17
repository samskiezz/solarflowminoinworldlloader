/**
 * Shared winston logger. Creates the log directory on first use so the file
 * transports never fail at startup.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const winston = require('winston');
const config = require('./config');

const transports = [
    new winston.transports.Console({
        format: config.isProduction
            ? winston.format.json()
            : winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
];

try {
    fs.mkdirSync(config.logsDir, { recursive: true });
    transports.push(
        new winston.transports.File({ filename: path.join(config.logsDir, 'error.log'), level: 'error', maxsize: 10 * 1024 * 1024, maxFiles: 5 }),
        new winston.transports.File({ filename: path.join(config.logsDir, 'combined.log'), maxsize: 10 * 1024 * 1024, maxFiles: 5 })
    );
} catch (error) {
    // Read-only filesystem (e.g. some containers): console logging still works.
    console.warn(`Log directory unavailable (${error.message}); logging to console only`);
}

const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'solarflow-server' },
    transports,
    silent: process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS
});

module.exports = logger;
