"use strict";

const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const { combine, timestamp, label, colorize, printf, prettyPrint } = format;
const configStore = require("../config");
const logDir = configStore.get("/logDir");

const myFormat =
  process.env.NODE_ENV !== "production"
    ? printf(({ level, message, label, timestamp, service }) => {
        return `[${timestamp}] ${service} | ${level}: ${message}`;
      })
    : prettyPrint();

const getTransports = (label_ = "") => {
  const date = new Date().toJSON().split("T")[0];
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
        level:"error",
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

const logger = createLogger({
  level: configStore.get("/logLevel"),
  defaultMeta: { service: configStore.get("/service") },
  transports: getTransports(),
});

const logger_error_old = logger.error;
logger.error = function (err) {
  if (err.message) {
    return logger_error_old.call(this, err.stack);
  } else {
    return logger_error_old.call(this, new Error().stack + ":" + err);
  }
};

module.exports = logger;
