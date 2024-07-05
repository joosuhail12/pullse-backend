const Handler = require("../../handlers/WorkspaceHandler");
 
const authMiddlewares = require("../../middlewares/auth");
const AuthType = require("../../constants/AuthType");
 
async function activate(app) {
  let handler = new Handler();
 
  let base_url = "/api/workspace";
 
  app.route({
    url: base_url,
    method: "POST",
    name: "CreateWorkspace",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["Workspace"],
      summary: "Create Workspace",
      description: "API to create workspace.",
      body: {
        type: "object",
        required: ["name", "workspace_alternate_id"],
        properties: {
          name: {
            type: "string",
            minLength: 2,
          },
          workspace_alternate_id: {
            type: "string",
          },
          description: {
            type: "string",
          },
        },
        additionalProperties: false,
      },
    },
    handler: async (req, reply) => {
      return handler.createWorkspace(req, reply);
    },
  });
 
  app.route({
    url: base_url + "/:workspace_id/users/search",
    method: "GET",
    name: "ListUsers",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["Workspace"],
      summary: "List Users",
      description: "API to list all Users within a workspace.",
      required: [],
      query: {
        name: {
          type: "string",
          minLength: 2,
        },
        email: {
          type: "string",
          format: "email",
        },
        roleId: {
          type: "string",
        },
        teamId: {
          type: "string",
        },
        created_from: {
          type: "string",
          format: "date-time",
        },
        created_to: {
          type: "string",
          format: "date-time",
        },
        page: {
          type: "string",
        },
        skip: {
          type: "number",
        },
        limit: {
          type: "number",
        },
        sort_by: {
          type: "string",
        },
        sort_order: {
          type: "string",
        },
      },
    },
    handler: async (req, reply) => {
      try {
        const result = await handler.listUsers(req, reply);
        reply.send(result);
      } catch (error) {
        console.error("Error in listUsers:", error);
        reply
          .code(error.statusCode || 500)
          .send({ error: error.message || "Internal Server Error" });
      }
    },
  });
  app.route({
    url: base_url,
    method: "GET",
    name: "ListWorkspaces",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["Workspace"],
      summary: "List Workspaces",
      description: "API to list all Workspaces.",
      required: [],
      query: {
        name: {
          type: "string",
          minLength: 2,
        },
        page: {
          type: "string",
        },
        skip: {
          type: "number",
        },
        limit: {
          type: "number",
        },
        sort_by: {
          type: "string",
        },
        sort_order: {
          type: "string",
        },
      },
    },
    handler: async (req, reply) => {
      return handler.listWorkspace(req, reply);
    },
  });
 
  app.route({
    url: base_url + "/:workspace_id",
    method: "GET",
    name: "ShowWorkspaceDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["Workspace"],
      summary: "Show Workspace Detail",
      description: "API to show detail of a Workspace.",
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showWorkspaceDetail(req, reply);
    },
  });
  // app.route({
  //   url: base_url + "/createdby/:id",
  //   method: "GET",
  //   name: "CreatedBy",
  //   preHandler: authMiddlewares.checkToken(AuthType.user),
  //   schema: {
  //     tags: ["Workspace"],
  //     summary: "View Users",
  //     description: "API to View Creator of a Workspace",
  //     required: [],
  //   },
  //   handler: async (req, reply) => {
  //     return handler.viewUser(req, reply);
  //   },
  // });
  app.route({
    url: base_url + "/:workspace_id/users",
    method: "GET",
    name: "ViewUsers",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["Workspace"],
      summary: "View Users",
      description: "API to View Users of a Workspace",
      required: [],
    },
    handler: async (req, reply) => {
      return handler.viewUsers(req, reply);
    },
  });
 
  app.route({
    url: base_url + "/:workspace_id",
    method: "PUT",
    name: "UpdateWorkspace",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["Workspace"],
      summary: "Update Workspace",
      description: "API to update a Workspace.",
      required: [],
      body: {
        name: {
          type: "string",
          minLength: 2,
        },
        description: {
          type: "string",
        },
      },
    },
    handler: async (req, reply) => {
      return handler.updateWorkspace(req, reply);
    },
  });
 
  app.route({
    url: base_url + "/:workspace_id",
    method: "DELETE",
    name: "DeleteWorkspace",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["Workspace"],
      summary: "Delete Workspace",
      description: "API to delete a Workspace.",
      required: [],
      body: {},
    },
    handler: async (req, reply) => {
      return handler.deleteWorkspace(req, reply);
    },
  });
}
 
module.exports = {
  activate,
};