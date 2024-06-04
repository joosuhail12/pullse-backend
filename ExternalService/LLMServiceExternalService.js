const BaseExternalService = require("./BaseExternalService");
const BaseFileSystem = require("../FileManagement/BaseFileSystem");
const config = require('../config')


class LLMServiceExternalService extends BaseExternalService {

  constructor() {
    super();
    this.baseURL = "https://llm-service-dev.pullseai.com/api";
  }

  /*
  * @param {string} query
  *
  * @returns {Promise}
  * @fulfil {Object} - Intent object
  * @reject {Error} - Error object
  * @example
  * {
  *   "status": "Success",
  *   "message": "success",
  *   "data": {
  *       "json": {
  *           "intents": [
  *               {
  *                   "key": "workflow functionality not working",
  *                   "confidence": 80
  *               },
  *               {
  *                   "key": "connecting two workflows",
  *                   "confidence": 70
  *               }
  *           ],
  *           "status": "success",
  *           "message": "success"
  *       }
  *   }
  * }
  */
  async getQueryIntent(query) {
    let queryParam = {};
    let body = { query, };
    let method = "post";
    let url = '/v1/llm/intent';

    try {
      let res = await this.request({ method, url, }, queryParam, body);
      if (res?.data?.data?.json?.status === "success") {
        return res.data.data.json;
      }
    } catch (error) {
      console.log(error?.response?.data);
    }
    return Promise.reject("Something went wrong");
  }


  async getQuerySentiment(query) {
    let queryParam = {};
    let body = { query, };
    let method = "post";
    let url = '/v1/llm/sentiments/external';
    try {
      let res = await this.request({ method, url, }, queryParam, body);
      if (res?.data?.data?.json?.status === "success") {
        return res.data.data.json;
      }
    } catch (error) {
      console.log(error?.response?.data);
    }
    return Promise.reject("Something went wrong");
  }


  async getConversationScore(conversation) {
    let queryParam = {};
    let body = { query: conversation };
    let method = "post";
    let url = '/v1/llm/response-score';
    try {
      let res = await this.request({ method, url, }, queryParam, body);
      if (res?.data?.data?.json) {
        return res.data.data.json;
      }
    } catch (error) {
      console.log(error?.response?.data);
    }
    return Promise.reject("Something went wrong");
  }

  async expandText(query) {
    let queryParam = {};
    let body = { query };
    let method = "post";
    let url = '/v1/llm/explain-text'; // expand-text';
    let res;
    try {
      res = await this.request({ method, url, }, queryParam, body);
    } catch (error) {
      console.log(error?.response?.data);
      res = { data: { data: { } } };
    }
    return res.data?.data;
  }

  async rephraseText(query) {
    let queryParam = {};
    let body = { query };
    let method = "post";
    let url = '/v1/llm/rephrase-text';
    let res;
    try {
      res = await this.request({ method, url, }, queryParam, body);
    } catch (error) {
      console.log(error?.response?.data);
      res = { data: { data: { } } };
    }
    return res.data?.data;
  }

  async summarize(query) {
    let queryParam = {};
    let body = { query };
    let method = "post";
    let url = '/v1/llm/summarize';
    let res;
    try {
      res = await this.request({ method, url, }, queryParam, body);
    } catch (error) {
      console.log(error?.response?.data);
      res = { data: { data: { } } };
    }
    return res.data?.data;
  }

  async askQuery(query) {
    let queryParam = {};
    let body = { query };
    let method = "post";
    let url = '/v1/llm/query';
    let res;
    try {
      res = await this.request({ method, url, }, queryParam, body);
    } catch (error) {
      console.log(error?.response?.data);
      res = { data: { data: { } } };
    }
    return res.data?.data;
  }



  /*
  * Add document
  */
  async addData(dataType, dataSource, metadata = {}) {
    let body = { dataType, dataSource, metadata };
    let queryParam = {};
    let method = "post";
    let url = '/v1/llm';
    let res;
    try {
      res = await this.request({ method, url, }, queryParam, body);
    } catch (error) {
      console.log(error?.response?.data);
      return this.handleError(error);
    }
    return res.data?.data;
  }

  async addDocument(dataType, filePath, metadata = {}) {
    let fileSysInst = new BaseFileSystem();
    let body = {
      dataType,
      metadata: JSON.stringify(metadata),
      doc: await fileSysInst.getReadStream(filePath),
    };
    let queryParam = {};
    let method = "post";
    let url = '/v1/llm/file';
    let res;
    try {
      res = await this.request({ method, url, }, queryParam, body, true);
    } catch (error) {
      console.log(error?.response?.data?.detail);
      return this.handleError(error);
    }
    return res.data?.data;
  }

  async addAssistant(name, instructions) {
    let body = { name, instructions };
    let queryParam = {};
    let method = "post";
    let url = '/v1/llm/create-assistant';
    let res;
    try {
      res = await this.request({ method, url, }, queryParam, body);
    } catch (error) {
      console.log(error?.response?.data?.detail);
      return this.handleError(error);
    }
    return res.data?.data;
  }

  async addThread(assistant_id) {
    let body = { assistant_id};
    let queryParam = {};
    let method = "post";
    let url = '/v1/llm/new-thread';
    let res;
    try {
      res = await this.request({ method, url, }, queryParam, body);
    } catch (error) {
      console.log(error?.response?.data?.detail);
      return this.handleError(error);
    }
    return res.data?.data;
  }

  async addMessage(assistant_id, thread_id, message) {
    let body = { assistant_id, thread_id, message };
    let queryParam = {};
    let method = "post";
    let url = '/v1/llm/assistant/message';
    let res;
    try {
      res = await this.request({ method, url, }, queryParam, body);
    } catch (error) {
      console.log(error?.response?.data?.detail);
      return this.handleError(error);
    }
    return res.data?.data;
  }
};

module.exports = LLMServiceExternalService;
