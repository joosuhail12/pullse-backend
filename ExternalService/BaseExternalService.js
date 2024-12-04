const _ = require("lodash");
const axios = require("axios");
const FormData = require("form-data");
const logger = require("../logger");
const errors = require("../errors");
const config = require("../config");

class BaseExternalService {
  constructor(baseURL) {
    this.entityName = "ExternalEntity";
    this.logger = logger;
    if (baseURL) {
      this.baseURL = baseURL;
    }
    this.loggerMetaData = {
      service: this.constructor.name,
    };
  }

  log({ message, data, level }) {
    let log = this.logger[level] || this.logger.info;
    log(message, {
      ...data,
      ...this.loggerMetaData,
    });
  }

  async request({ url, method = "get", headers = { "Content-Type": "application/json" } }, queryParam = {}, body={}, isFormData = false) {
    try {
      if (isFormData) {
        let data = new FormData();
        Object.keys(body).forEach(key => {
          data.append(key, body[key]);
        });
        // 'productImage', file, 'stickers.jpg');
        headers =  {
          ...headers,
          ...data.getHeaders()
        };
        body = data;
      }
      let config = {
        url,
        headers,
        method,
        // timeout: 1000 * 30,
        baseURL: this.baseURL,
        params: queryParam,
        data: body,
      };
      let res = await axios(config);
      return res;
    } catch (err) {
      return this.handleError(err);
    }
  }

  handleError(err) {
    this.log({
      level: "error",
      // message,
      data: {
        err,
      },
    });
    return Promise.reject(err);
  }

  parseFilters() {
    return {};
  }
}

module.exports = BaseExternalService;
