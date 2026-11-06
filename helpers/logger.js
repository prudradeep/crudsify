"use strict";

const { format, transports, Container } = require("winston");
require("winston-daily-rotate-file");
const { ecsFormat } = require("@elastic/ecs-winston-format");
const { combine, timestamp } = format;
const configStore = require("../config");
const logDir = configStore.get("/logDir");
const defaultMeta = {
  service: {
    name: configStore.get("/service"),
    version: configStore.get("/version"),
    environment: process.env.NODE_ENV || "development",
  },
};
const winstonContainer = new Container();

// Keep a full ISO-8601 timestamp (including milliseconds and UTC offset) in
// both file and console records so events can be compared across hosts.
const getStructuredFormat = () => combine(timestamp(), ecsFormat());

const getTransports = () => {
  let Transports = [
    new transports.DailyRotateFile({
      dirname: `${logDir}/combined`,
      filename: `combined-%DATE%.jsonl`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: configStore.get("/logFileMaxSize"),
      maxFiles: configStore.get("/logTTL"),
      format: getStructuredFormat(),
    }),
    new transports.DailyRotateFile({
      level: "error",
      dirname: `${logDir}/error`,
      filename: `error-%DATE%.jsonl`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: configStore.get("/logFileMaxSize"),
      maxFiles: configStore.get("/logTTL"),
      format: getStructuredFormat(),
    }),
    // Structured stdout/stderr is collected by common production runtimes,
    // and is also convenient during local development.
    new transports.Console({
      handleExceptions: true,
      format: getStructuredFormat(),
    }),
  ];
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
      filename: `audit-%DATE%.jsonl`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: configStore.get("/logFileMaxSize"),
      maxFiles: configStore.get("/auditLogTTL"),
      format: getStructuredFormat(),
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
      filename: `query-%DATE%.jsonl`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: configStore.get("/logFileMaxSize"),
      maxFiles: configStore.get("/logTTL"),
      format: getStructuredFormat(),
    }),
  ],
});

const Logger = winstonContainer.get("logger");
const AuditLogger = winstonContainer.get("audit");
const QueryLogger = winstonContainer.get("query");

const loggerError = Logger.error;
Logger.error = function (error, ...args) {
  if (!(error instanceof Error)) {
    return loggerError.call(this, error, ...args);
  }

  const [metadata = {}, ...rest] = args;
  const suppliedMetadata =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? metadata
      : {};

  return loggerError.call(this, error.message || error.name, {
    ...suppliedMetadata,
    error: {
      ...suppliedMetadata.error,
      type: error.name,
      message: error.message,
      stack: error.stack,
    },
  }, ...rest);
};

module.exports = { Logger, AuditLogger, QueryLogger };
