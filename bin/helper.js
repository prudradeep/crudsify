"use strict";

const fs = require("fs");
const path = require("path");
const beautify = require("js-beautify");
const _ = require("lodash");
const { Sequelize } = require("sequelize");
const configStore = require("../config");

function format(i) {
  return parseInt(i, 10) < 10 ? "0" + i : i;
}

const validAttributeFunctionType = ["array", "enum"];

/**
 * Check the given dataType actual exists.
 * @param {string} dataType
 */
function validateDataType(dataType) {
  if (!Sequelize.DataTypes[dataType.toUpperCase()]) {
    throw new Error(`Unknown type '${dataType}'`);
  }

  return dataType;
}

function formatAttributes(attribute) {
  let result;
  const split = attribute.split(":");

  if (split.length === 2) {
    result = {
      fieldName: split[0],
      dataType: split[1],
      dataFunction: null,
      dataValues: null,
    };
  } else if (split.length === 3) {
    const validValues = /^\{(,? ?[A-z0-9 ]+)+\}$/;
    const isValidFunction =
      validAttributeFunctionType.indexOf(split[1].toLowerCase()) !== -1;
    const isValidValue =
      validAttributeFunctionType.indexOf(split[2].toLowerCase()) === -1 &&
      split[2].match(validValues) === null;
    const isValidValues = split[2].match(validValues) !== null;

    if (isValidFunction && isValidValue && !isValidValues) {
      result = {
        fieldName: split[0],
        dataType: split[2],
        dataFunction: split[1],
        dataValues: null,
      };
    }

    if (isValidFunction && !isValidValue && isValidValues) {
      result = {
        fieldName: split[0],
        dataType: split[1],
        dataFunction: null,
        dataValues: split[2]
          .replace(/(^\{|\}$)/g, "")
          .split(/\s*,\s*/)
          .map((s) => `'${s}'`)
          .join(", "),
      };
    }
  }

  return result;
}

function transformAttributes(flag) {
  /*
    possible flag formats:
    - first_name:string,last_name:string,bio:text,role:enum:{Admin, 'Guest User'},reviews:array:string
    - 'first_name:string last_name:string bio:text role:enum:{Admin, Guest User} reviews:array:string'
    - 'first_name:string, last_name:string, bio:text, role:enum:{Admin, Guest User} reviews:array:string'
  */
  const attributeStrings = flag
    .split("")
    .map(
      (() => {
        let openValues = false;
        return (a) => {
          if ((a === "," || a === " ") && !openValues) {
            return "  ";
          }
          if (a === "{") {
            openValues = true;
          }
          if (a === "}") {
            openValues = false;
          }

          return a;
        };
      })()
    )
    .join("")
    .split(/\s{2,}/);

  return attributeStrings.map((attribute) => {
    const formattedAttribute = formatAttributes(attribute);

    try {
      validateDataType(formattedAttribute.dataType);
    } catch (err) {
      throw new Error(
        `Attribute '${attribute}' cannot be parsed: ${err.message}`
      );
    }

    return formattedAttribute;
  });
}

function checkArguments(args) {
  if (!args.name) {
    console.error(`Missing required argument: --name`);
    process.exit(1);
  }

  if (!args.attributes) {
    console.error(`Missing required argument: --attributes`);
    process.exit(1);
  }
}

function getTableName(modelName) {
  return Sequelize.Utils.pluralize(modelName);
}

function render(path_, locals, options) {
  options = _.assign(
    {
      beautify: true,
      indent_size: 2,
      preserve_newlines: false,
    },
    options || {}
  );

  const template = fs
    .readFileSync(path.resolve(__dirname, ".", "assets", path_))
    .toString();
  let content = _.template(template)(locals || {});

  if (options.beautify) {
    content = beautify(content, options);
  }

  return content;
}

function writeFile(destinationPath, content) {
  fs.writeFileSync(destinationPath, content);
}

function getCurrentYYYYMMDDHHmms() {
  const date = new Date();
  return [
    date.getUTCFullYear(),
    format(date.getUTCMonth() + 1),
    format(date.getUTCDate()),
    format(date.getUTCHours()),
    format(date.getUTCMinutes()),
    format(date.getUTCSeconds()),
  ].join("");
}

/**
   * Copy directories/files to destination folder
   * @param source {string}: Source of the directory/folder
   * @param destination {string}: Destination of the directory
   * @returns {void}  
   */
function copyDirectory (source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination);
  }

  const files = fs.readdirSync(source);

  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);

    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

module.exports = {
  /**
   * Copy directories/files to destination folder
   * @param source {string}: Source of the directory/folder
   * @param destination {string}: Destination of the directory
   * @returns {void}  
   */
  copyDirectory,
  /**
   * Generate migration file
   * @param args {object}: Arguments object
   * @returns {void}  
   */
  generateMigration: (args) => {
    const destination = path.join(__dirname, "/../../../");
    if (!fs.existsSync(path.join(destination, "migrations"))) {
      fs.mkdirSync(path.join(destination, "migrations"));
    }

    checkArguments(args);

    const migration = render("migrations/create-table.js", {
      tableName: getTableName(args.name),
      attributes: transformAttributes(args.attributes),
      createdAt: args.underscored ? "created_at" : "createdAt",
      updatedAt: args.underscored ? "updated_at" : "updatedAt",
    });
    const migrationName =
      [
        getCurrentYYYYMMDDHHmms(),
        _.trimStart(_.kebabCase("create-" + args.name), "-"),
      ].join("-") + ".js";
    writeFile(path.join(destination, "migrations", migrationName), migration);
  },
    /**
   * Generate model file
   * @param args {object}: Arguments object
   * @returns {void}  
   */
  generateModel: (args) => {
    let destination = "";
    if (configStore.get("/absoluteModelPath") === true)
      destination = configStore.get("/modelPath");
    else
      destination = path.join(
        __dirname,
        "/../../../",
        configStore.get("/modelPath")
      );
    if (!fs.existsSync(path.join(destination))) {
      fs.mkdirSync(path.join(destination));
    }

    const modelName = args.name.toLowerCase() + ".js";
    if (fs.existsSync(path.join(destination, modelName))) {
      console.error(`Error: The file models/${modelName} already exists!`);
      process.exit(1);
    }
    const model = render("models/model.js", {
      name: args.name,
      attributes: transformAttributes(args.attributes),
      underscored: args.underscored,
    });
    writeFile(path.join(destination, modelName), model);
  },
};
