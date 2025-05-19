const BaseHandler = require('./BaseHandler');

// ⬇️ note the “.default”
const ContentFolderService = require('../services/ContentFolderService').default;

class ContentFolderHandler extends BaseHandler {
  constructor() {
    super();
    // you don’t need dependencies here; just keep one instance
    this.folderSvc = new ContentFolderService();
  }

  async createFolder(req, reply) {
    try {
      const userId = req.authUser.id;
      const clientId = req.authUser.clientId;
      const workspaceId = req.query.workspace_id;
      return this.responder(req, reply, this.folderSvc.createFolder({name: req.body.name, parentId: req.body.parentId, clientId, workspaceId}));
    } catch (error) {
      console.log(error);
      return this.responder(req, reply, error);
    }
  }

  async listFolders(req, reply) {
    try {
      const { clientId } = req.authUser;
      const workspaceId  = req.query.workspace_id;
    return this.responder(
      req,
      reply,
        this.folderSvc.listFoldersWithCounts({ clientId, workspaceId })
      );
    } catch (error) {
      console.log(error);
      return this.responder(req, reply, error);
    }
  }
}

module.exports = ContentFolderHandler;
