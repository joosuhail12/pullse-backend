const Handler = require('../../handlers/WorkspaceSettingHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/setting';
  let GetChatbotSettingRouteConfig = {
    url: base_url + "/chatbot",
    method: 'GET',
    name: "GetChatbotSettingAgent",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      tags: ['ChatbotSetting', "Agent"],
      summary: 'Get Chatbot Setting',
      description: 'API to get  Chatbot Setting.',
      required: ['workspace_id'],
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.getChatbotSetting(req, reply);
    }
  };
  app.route(GetChatbotSettingRouteConfig);
  GetChatbotSettingRouteConfig.url = base_url + "/chatbot/customer";
  GetChatbotSettingRouteConfig.name = "GetChatbotSettingCustomer";
  GetChatbotSettingRouteConfig.schema.tags.push("Customer");
  GetChatbotSettingRouteConfig.preHandler = authMiddlewares.checkClerkToken(AuthType.customer);
  GetChatbotSettingRouteConfig.handler = async (req, reply) => {
    return handler.getCustomerChatbotSetting(req, reply);
  }
  app.route(GetChatbotSettingRouteConfig);

  app.route({
    url: base_url + "/chatbot",
    method: 'PUT',
    name: "UpdateChatbotSetting",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      tags: ['ChatbotSetting'],
      summary: 'Update Chatbot Setting',
      description: 'API to update Chatbot Setting.',
      required: ['workspace_id'],
      body: {
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateChatbotSetting(req, reply);
    }
  });

  app.route({
    url: base_url + "/sentiment",
    method: 'GET',
    name: "GetSentimentSetting",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      tags: ['SentimentSetting'],
      summary: 'Get Sentiment Setting',
      description: 'API to get Sentiment Setting.',
      required: ['workspace_id'],
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.getSentimentSetting(req, reply);
    }
  });

  app.route({
    url: base_url + "/sentiment",
    method: 'PUT',
    name: "UpdateSentimentSetting",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      tags: ['SentimentSetting'],
      summary: 'Update Sentiment Setting',
      description: 'API to update Sentiment Setting.',
      required: ['workspace_id'],
      body: {
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateSentimentSetting(req, reply);
    }
  });

  app.route({
    url: base_url + "/quality-assurance",
    method: 'GET',
    name: "GetQualityAssuranceSetting",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      tags: ['QualityAssuranceSetting'],
      summary: 'Get Quality Assurance Setting',
      description: 'API to get Quality Assurance Setting.',
      required: ['workspace_id'],
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.getQualityAssuranceSetting(req, reply);
    }
  });

  app.route({
    url: base_url + "/quality-assurance",
    method: 'PUT',
    name: "UpdateQualityAssuranceSetting",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      tags: ['QualityAssuranceSetting'],
      summary: 'Update Quality Assurance Setting',
      description: 'API to update Quality Assurance Setting.',
      required: ['workspace_id'],
      body: {
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateQualityAssuranceSetting(req, reply);
    }
  });

}

module.exports = {
  activate
};