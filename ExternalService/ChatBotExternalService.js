const BaseExternalService = require("./BaseExternalService");
const BaseFileSystem = require("../FileManagement/BaseFileSystem");
const config = require('../config')


class ChatBotExternalService extends BaseExternalService {

  constructor() {
    super();
    this.baseURL = "https://1pw8mvj523.execute-api.ap-south-1.amazonaws.com";
  }

  async uploadFile(filePath, docData={}, rga=false) {
    let queryParam = {};

    let fileSysInst = new BaseFileSystem();
    let body = {
      openAiKey: config.llm.open_api_key,
      callbackUrl: config.app.base_url + '/api/chatbot-document/status/' + docData.documentId,
      file: await fileSysInst.getReadStream(filePath),
    };

    if (docData.organizationId) {
      body.organizationId = docData.organizationId;
    }
    if (docData.documentSetId) {
      body.documentSetId = docData.documentSetId;
    }
    if (docData.documentId) {
      body.documentId = docData.documentId;
    }


    let method = "post";
    let url = '/api/v1/files/uploadOneToBaseline';
    if (rga) {
      url = '/api/v1/files/uploadOneToRAGV1';
    };
    let res = await this.request({ method, url, }, queryParam, body, true);
    return res;
  }

  async sendQuestion(docSetId, question, clientId, rga=false) {
    let queryParam = {};
    let body = {
      openAiKey: config.llm.open_api_key,
      query: question,
      docSetId: [
        docSetId
      ],
      orgId: clientId
    };
    let method = "post";
    let url = '/api/v1/query/queryToBaseline';
    if (rga) {
      url = '/api/v1/query/queryToRAGV1';
    };
    let res = await this.request({ method, url, }, queryParam, body);
    return res.data;
  }

};

module.exports = ChatBotExternalService;
