"use strict";

const { createLogger, format, transports, Container } = require("winston");
require("winston-daily-rotate-file");
const { combine, timestamp, label, colorize, printf, prettyPrint } = format;
const configStore = require("../config");
const logDir = configStore.get("/logDir");

const winstonContainer = new Container();

const myFormat =
  process.env.NODE_ENV !== "production"
    ? printf(({ level, message, label, timestamp, service }) => {
        return `[${timestamp}] ${service} | ${level}: ${message}`;
      })
    : prettyPrint();

const getTransports = (label_ = "") => {
  let Transports = [
    new transports.DailyRotateFile({
      dirname: `${logDir}/combined`,
      filename: `combined-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "15d",
      format: combine(
        label({
          label: label_,
          message: false,
        }),
        timestamp({
          format: "YY-MM-DD HH:MM:SS",
        }),
        myFormat
      ),
    }),
    new transports.DailyRotateFile({
      level: "error",
      dirname: `${logDir}/error`,
      filename: `error-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "15d",
      format: combine(
        label({
          label: label_,
          message: false,
        }),
        timestamp({
          format: "YY-MM-DD HH:MM:SS",
        }),
        myFormat
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
          label({
            label: label_,
            message: false,
          }),
          timestamp({
            format: "YY-MM-DD HH:MM:SS",
          }),
          myFormat
        ),
      })
    );
  }

  return Transports;
};

winstonContainer.add("logger", {
  level: configStore.get("/logLevel"),
  defaultMeta: { service: configStore.get("/service") },
  transports: getTransports(),
});

winstonContainer.add("audit", {
  levels: {
    audit: 0,
  },
  level: configStore.get("/logLevel"),
  defaultMeta: { service: configStore.get("/service") },
  transports: [
    new transports.DailyRotateFile({
      level: "audit",
      dirname: `${logDir}/audit`,
      filename: `audit-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: configStore.get("/auditLogTTL"),
      format: combine(
        label({
          label: "",
          message: false,
        }),
        timestamp({
          format: "YY-MM-DD HH:MM:SS",
        }),
        myFormat
      ),
    }),
  ],
});

const Logger = winstonContainer.get("logger");
const AuditLogger = winstonContainer.get("audit");

const logger_error_old = Logger.error;
Logger.error = function (err) {
  if (err.message) {
    return logger_error_old.call(this, err.stack);
  } else {
    return logger_error_old.call(this, new Error().stack + ":" + err);
  }
};

module.exports = {Logger, AuditLogger};
