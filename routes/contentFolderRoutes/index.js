const Handler = require('../../handlers/ContentFolderHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/content-folder'

  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateFolder",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    handler: async (req, reply) => {
      return handler.createFolder(req, reply);
    }
  });

  app.route({
    url: base_url + "/list",
    method: 'GET',
    name: "ListFolders",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    handler: async (req, reply) => {
      return handler.listFolders(req, reply);
    }
  });
}

module.exports = {
  activate
};
