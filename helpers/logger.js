"use strict";

const { format, transports, Container } = require("winston");
require("winston-daily-rotate-file");
const { ecsFormat } = require('@elastic/ecs-winston-format');
const { combine, timestamp, colorize } = format;
const configStore = require("../config");
const logDir = configStore.get("/logDir");
const defaultMeta = { service: {name: configStore.get("/service"), version: configStore.get("/version"), environment: process.env.NODE_ENV }};
const winstonContainer = new Container();

const getTransports = () => {
  let Transports = [
    new transports.DailyRotateFile({
      dirname: `${logDir}/combined`,
      filename: `combined-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: configStore.get("/logFileMaxSize"),
      maxFiles: configStore.get("/logTTL"),
      format: combine(
        timestamp({
          format: "YYYY-MM-DDTHH:MM:SS",
        }),
        ecsFormat()
      ),
    }),
    new transports.DailyRotateFile({
      level: "error",
      dirname: `${logDir}/error`,
      filename: `error-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: configStore.get("/logFileMaxSize"),
      maxFiles: configStore.get("/logTTL"),
      format: combine(
        timestamp({
          format: "YYYY-MM-DDTHH:MM:SS",
        }),
        ecsFormat()
      ),
    }),
  ];

  if (process.env.NODE_ENV !== "production") {
    Transports.push(
      new transports.Console({
        handleExceptions: true,
        format: combine(
          colorize({
            all: true,
          }),
          timestamp({
            format: "YYYY-MM-DDTHH:MM:SS",
          }),
        ),
      })
    );
  }
  return Transports;
};

winstonContainer.add("logger", {
  level: configStore.get("/logLevel"),
  defaultMeta,
  transports: getTransports(),
});

winstonContainer.add("audit", {
  levels: {
    audit: 0,
  },
  level: "audit",
  defaultMeta,
  transports: [
    new transports.DailyRotateFile({
      level: "audit",
      dirname: `${logDir}/audit`,
      filename: `audit-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: configStore.get("/logFileMaxSize"),
      maxFiles: configStore.get("/auditLogTTL"),
      format: combine(
        timestamp({
          format: "YYYY-MM-DDTHH:MM:SS",
        }),
        ecsFormat()
      ),
    }),
  ],
});

winstonContainer.add("query", {
  levels: {
    query: 0,
  },
  level: "query",
  defaultMeta,
  transports: [
    new transports.DailyRotateFile({
      level: "query",
      dirname: `${logDir}/query`,
      filename: `query-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: configStore.get("/logFileMaxSize"),
      maxFiles: configStore.get("/logTTL"),
      format: combine(
        timestamp({
          format: "YYYY-MM-DDTHH:MM:SS",
        }),
        ecsFormat()
      ),
    }),
  ],
});

const Logger = winstonContainer.get("logger");
const AuditLogger = winstonContainer.get("audit");
const QueryLogger = winstonContainer.get("query");

const logger_error_old = Logger.error;
Logger.error = function (err) {
  if (err.message) {
    return logger_error_old.call(this, err.stack);
  } else {
    return logger_error_old.call(this, new Error().stack + ":" + err);
  }
};

module.exports = { Logger, AuditLogger, QueryLogger };