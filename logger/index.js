const { createLogger, format, transports } = require("winston");

const config = require("../config");

const logger = createLogger({
    defaultMeta: {
        service: config.app.name
    },
    format: format.combine(
        format.json(),
        format.timestamp(),
        // format.colorize(),
        format.errors({ stack: true }),
    ),
    transports: [
        new transports.Console({ colorize: true, handleExceptions: config.app.environment === "production" }),
    ]
});

module.exports = logger;
