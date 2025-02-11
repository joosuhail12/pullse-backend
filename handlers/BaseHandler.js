
const responseHandler = require('../ResponseHandler');

class BaseHandler {

  constructor() {
    this.serviceInst = null;
    this.errorResponse = {
      type: 'object',
      properties: {
        statusCode: 'number',
        code: 'string',
        error: 'string',
        message: 'string',
        data: 'object',
      }
    }
  }

  async responder(req, res, promise) {
    let response = await responseHandler(req, res, promise);
    console.log(response)
    return response;
  }
}

module.exports = BaseHandler;
