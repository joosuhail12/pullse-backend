const BaseHandler = require('./BaseHandler');
const TagService = require('../services/TagService');


class TagHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createTag(req, reply) {
    let inst = new TagService();
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    return this.responder(req, reply, inst.createTag(req.body));
  }

  async listTag(req, reply) {
    let inst = new TagService();
    req.query.clientId = req.authUser.clientId;

    return this.responder(req, reply, inst.paginate(req.query));
  }

  async showTagDetail(req, reply) {
    let inst = new TagService();
    return this.responder(req, reply, inst.findOrFail(req.params.tag_id));
  }

  async updateTag(req, reply) {
    let tag_id = req.params.tag_id;
    let toUpdate = req.body;
    let inst = new TagService();
    return this.responder(req, reply, inst.updateTag(tag_id, toUpdate));
  }

  async deleteTag(req, reply) {
    let tag_id = req.params.tag_id;
    let inst = new TagService();
    return this.responder(req, reply, inst.deleteTag(tag_id));
  }

}

module.exports = TagHandler;
