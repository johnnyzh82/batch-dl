const log4js = require("log4js");

log4js.configure({
    appenders: {
        log: {
            type: "file",
            filename: "logger.log",
        }
    },
    categories: {
        default: {
            appenders: ["log"],
            level: "debug"
        }
    }
});

const logger = log4js.getLogger("log");

export function debug(message: string) {
    logger.debug(message);
}

export function info(message: string) {
    logger.info(message);
}

export function warn(message: string) {
    logger.warn(message);
}

export function error(message: string) {
    logger.error(message);
}

