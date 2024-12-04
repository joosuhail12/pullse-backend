const Promise = require("bluebird");
const config = require('../config')
const errors = require("../errors");
const logger = require('../logger');

const fs = require('fs');

class BaseFileSystem {

  constructor() {
    this.logger = logger;
    this.loggerMetaData = {
      service: this.constructor.name
    };
  }

  /**
   * Creates a directory
   * @param {string} directoryName - The name of the directory to create.
   * @returns {string} A message indicating if the directory was created or already exists.
   * @description
   - Checks if a directory with the given name already exists.
  - If it exists, resolves the promise returning a message.
  - If it doesn't exist, uses fs.mkdir to create the directory recursively.
  - Handles errors and resolves/rejects the promise accordingly.
  */
  mkdir(directoryName) {
    if (fs.existsSync(directoryName)) {
      return Promise.resolve("Directory already exists");
    }
    return new Promise((resolve, reject) => {
      fs.mkdir(directoryName, { recursive: true }, (err) => {
        if (err) {
          console.error(err);
          return reject(err);
        }

        return resolve(`Directory ${directoryName} successfully created.`);
      });
    });
  }

  /**
   * Gets the content of a file asynchronously
   * @param {string} fileSrc - File source path.
   * @returns {string} File content.
   * @description
   *   - Reads the file content using fs.readFile asynchronously.
   *   - Returns a Promise that resolves with the file content.
   *   - Catches any errors and handles them.
   */
  async getFileContent(fileSrc) {
    let content;
    try {
      return new Promise((resolve, reject) => {
        fs.readFile(fileSrc, 'utf8', function(err, content) {
          if (err) {
            return reject(err);
          }
          return resolve(content);
        });
      });
    } catch(err) {
      return this.handleError(err)
    }
  }

  /**
   * Asynchronously writes data to a file, replacing the file if it already exists.
   * @param {string} fileSrc - Path to the file.
   * @param {string} content - Data to write.
   * @returns {string} - Returns a success message if write succeeds.
   * @description
   *   - Creates a Promise to write the file asynchronously.
   *   - Uses fs.writeFile to write the content to the fileSrc path.
   *   - Resolves the Promise on success or rejects it on error.
   *   - Catches any errors and handles them.
  */
  async writeFile(fileSrc, content) {
    try {
      return new Promise((resolve, reject) => {
        fs.writeFile(fileSrc, content, 'utf8', function(err) {
          if (err) {
            return reject(err);
          }
          return resolve("File saved successfully.");
        });
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getReadStream(filePath) {
    return fs.createReadStream(filePath);
  }


  log({ message, data, level }) {
    let log = this.logger[level] || this.logger.info;
    log(message, {
        ...data,
        ...this.loggerMetaData
    });
  }

  handleError(err) {
    this.log({
        level: "error",
        // message,
        data: {
            err
        }
    });
    return Promise.reject(err);
  }

}


module.exports = BaseFileSystem;
