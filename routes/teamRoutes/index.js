const Handler = require('../../handlers/TeamHandler');
const TicketService = require('../../services/TicketService');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/team'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateTeam",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['teams'],
      summary: 'Create User Team',
      description: 'API to create user team.',
      body: {
        required: ['name'],
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          description: {
            type: 'string',
          },
          workspaceId: {
            type: 'string',
          },
          clientId: {
            type: 'string',
          },
          members: {
            type: 'array',
            items: {
              type: 'string'
            },
            minItems: 1
          },
          channels: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          routingStrategy: {
            type: 'string'
          },
          officeHours: {
            type: 'object'
          },
          holidays: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          maxTotalTickets: {
            type: 'number'
          },
          maxOpenTickets: {
            type: 'number'
          },
          maxActiveChats: {
            type: 'number'
          },
          icon: {
            type: 'string'
          }
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createTeam(req, reply);
    }
  });


  app.route({
    url: base_url,
    method: 'GET',
    name: "ListTeams",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['teams'],
      summary: 'List Teams',
      description: 'API to list all Teams.',
      required: [],
      query: {
        page: {
          type: 'string',
        },
        skip: {
          type: 'number'
        },
        limit: {
          type: 'number'
        },
        sort_by: {
          type: 'string',
        },
        sort_order: {
          type: 'string',
        }
      }
    },
    handler: async (req, reply) => {
      return handler.listTeam(req, reply);
    }
  });

  app.route({
    url: base_url + "/:team_id",
    method: 'GET',
    name: "ShowTeamDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['teams'],
      summary: 'Show Team Detail',
      description: 'API to show detail of a Team.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showTeamDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:team_id",
    method: 'PUT',
    name: "UpdateTeam",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['teams'],
      summary: 'Update Team',
      description: 'API to update a Team.',
      body: {
        required: [],
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          description: {
            type: 'string',
          },
          workspaceId: {
            type: 'string',
          },
          clientId: {
            type: 'string',
          },
          members: {
            type: 'array',
            items: {
              type: 'string'
            },
            minItems: 1
          },
          channels: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          routingStrategy: {
            type: 'string'
          },
          officeHours: {
            type: 'object'
          },
          holidays: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          maxTotalTickets: {
            type: 'number'
          },
          maxOpenTickets: {
            type: 'number'
          },
          maxActiveChats: {
            type: 'number'
          },
          icon: {
            type: 'string'
          }
        }
      },
    },
    handler: async (req, reply) => {
      return handler.updateTeam(req, reply);
    }
  });

  app.route({
    url: base_url + "/:team_id",
    method: 'DELETE',
    name: "DeleteTeam",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['teams'],
      summary: 'Delete Team',
      description: 'API to delete a Team.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deleteTeam(req, reply);
    }
  });

  // Get tickets for a specific team
  app.route({
    url: base_url + "/:team_id/team-tickets",
    method: 'GET',
    name: "GetTeamTickets",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['teams'],
      summary: 'Get Team Tickets',
      description: 'API to fetch all tickets assigned to a specific team.',
      params: {
        type: 'object',
        properties: {
          team_id: {
            type: 'string'
          }
        }
      },
      query: {
        workspace_id: {
          type: 'string',
        },
        status: {
          type: 'string',
        },
        priority: {
          type: 'number',
        },
        skip: {
          type: 'number'
        },
        limit: {
          type: 'number'
        }
      }
    },
    handler: async (req, reply) => {
      return handler.getTeamTickets(req, reply);
    }
  });

  // Get tickets for all teams a user belongs to
  app.route({
    url: base_url + "/user/tickets",
    method: 'GET',
    name: "GetUserTeamTickets",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['teams'],
      summary: 'Get User Team Tickets',
      description: 'API to fetch all tickets assigned to teams that the current user belongs to.',
      query: {
        workspace_id: {
          type: 'string',
        },
        status: {
          type: 'string',
        },
        priority: {
          type: 'number',
        },
        skip: {
          type: 'number'
        },
        limit: {
          type: 'number'
        }
      }
    },
    handler: async (req, reply) => {
      return handler.getUserTeamTickets(req, reply);
    }
  });

  // Get all teams a user belongs to
  app.route({
    url: base_url + "/user/:user_id",
    method: 'GET',
    name: "GetUserTeams",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['teams'],
      summary: 'Get User Teams',
      description: 'API to fetch all teams that a specific user belongs to.',
      params: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'ID of the user whose teams you want to retrieve'
          }
        }
      },
      query: {
        workspace_id: {
          type: 'string',
          description: 'ID of the workspace'
        }
      }
    },
    handler: async (req, reply) => {
      return handler.getUserTeams(req, reply);
    }
  });

  // Get teammates of a user across all teams
  app.route({
    url: base_url + "/user/:user_id/teammates",
    method: 'GET',
    name: "GetUserTeammates",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['teams'],
      summary: 'Get User Teammates',
      description: 'API to fetch all teammates of a specific user across all teams.',
      params: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'ID of the user whose teammates you want to retrieve'
          }
        }
      },
      query: {
        workspace_id: {
          type: 'string',
          description: 'ID of the workspace'
        }
      }
    },
    handler: async (req, reply) => {
      return handler.getUserTeammates(req, reply);
    }
  });

  // Add teammate to team
  app.route({
    url: base_url + "/:team_id/add-teammate",
    method: 'POST',
    name: "AddTeammateToTeam",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['teams'],
      summary: 'Add Teammate to Team',
      description: 'API to add a teammate to an existing team.',
      params: {
        type: 'object',
        properties: {
          team_id: {
            type: 'string',
            description: 'ID of the team to add the teammate to'
          }
        }
      },
      query: {
        workspace_id: {
          type: 'string',
          description: 'ID of the workspace'
        }
      },
      body: {
        type: 'object',
        required: ['userId'],
        additionalProperties: false,
        properties: {
          userId: {
            type: 'string',
            description: 'ID of the user to add as a teammate'
          }
        }
      }
    },
    handler: async (req, reply) => {
      return handler.addTeammateToTeam(req, reply);
    }
  });

  // Get detailed team members list
  app.route({
    url: base_url + "/:team_id/members",
    method: 'GET',
    name: "GetTeamMembersDetailed",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['teams'],
      summary: 'Get Team Members with Details',
      description: 'API to fetch all team members with detailed information including status, last active, joined date, etc.',
      params: {
        type: 'object',
        properties: {
          team_id: {
            type: 'string',
            description: 'ID of the team whose members you want to retrieve'
          }
        }
      },
      query: {
        workspace_id: {
          type: 'string',
          description: 'ID of the workspace'
        }
      }
    },
    handler: async (req, reply) => {
      return handler.getTeamMembersDetailed(req, reply);
    }
  });

  // Assign ticket to team
  app.route({
    url: "/api/ticket/:ticket_id/assign-team",
    method: 'POST',
    name: "AssignTicketToTeam",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['tickets'],
      summary: 'Assign Ticket to Team',
      description: 'API to assign a ticket to a team.',
      consumes: ['application/json'],
      params: {
        type: 'object',
        properties: {
          ticket_id: {
            type: 'string'
          }
        }
      },
      body: {
        type: 'object',
        required: ['teamId'],
        properties: {
          teamId: {
            type: 'string'
          }
        }
      }
    },
    config: {
      // Explicitly disable file upload for this route
      disableFileUpload: true
    },
    handler: async (req, reply) => {
      const ticketId = req.params.ticket_id;
      const { teamId } = req.body;
      const clientId = req.authUser.clientId;
      const workspaceId = req.query.workspace_id;

      const ticketService = new TicketService();
      return handler.responder(req, reply, ticketService.assignTicketToTeam(
        ticketId,
        teamId,
        workspaceId,
        clientId
      ));
    }
  });
}

module.exports = {
  activate
};