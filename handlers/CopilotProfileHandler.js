// handlers/CopilotProfileHandler.js
const BaseHandler = require('./BaseHandler');
const CopilotProfileService = require('../services/CopilotProfileService');

class CopilotProfileHandler extends BaseHandler {
  constructor() {
    super();
  }

  async createProfile(req, reply) {
    const inst = new CopilotProfileService();
    const formData = req.body;

    // Add from authenticated user context
    formData.created_by = req.authUser.id;
    formData.client_id = req.authUser.clientId;
    formData.workspace_id = req.query.workspace_id;

    // Append avatar file if exists
    if (req.file) {
      formData.avatar_blob = req.file.buffer; // raw image buffer
      formData.avatar_mime = req.file.mimetype;
    }

    return this.responder(req, reply, inst.createProfile(formData));
  }
  
  async listProfiles(req, reply) {
    const inst = new CopilotProfileService();
    const query = {
      client_id: req.authUser.clientId
    };
    return this.responder(req, reply, inst.listProfiles(query));
  }
}

module.exports = CopilotProfileHandler;
