const _ = require("lodash");
const Promise = require("bluebird");
const errors = require("../errors");
const ChatBotUtility = require('../db/utilities/ChatBotUtility');
const BaseService = require("./BaseService");
const WorkflowRuleService = require("./WorkflowRuleService");
const LLMService = require("./LLMService");
const ChatbotDocumentService = require("./ChatbotDocumentService");
const ChatBotExternalService = require("../ExternalService/ChatBotExternalService");
const supabase = require("../db/supabaseClient");

class ChatBotProfileService extends BaseService {
    constructor() {
        super();
        this.entityName = 'ChatBot Profile';
        this.utilityInst = new ChatBotUtility();
        this.listingFields = [
          'id',
          'name',
          'persona',
          'avatar_url',
          'status',
          'tone',
          'behavior',
          'audience_rules',
          'knowledge_base_ids',
          'welcome_message',
          'handoff_message',
          'channels',
          'assistant_id'
        ];
    
        /* fields that callers are allowed to UPDATE later on */
        this.updatableFields = [
          'name',
          'persona',
          'avatar_url',
          'status',
          'tone',
          'custom_instructions',
          'behavior',
          'audience_rules',
          'knowledge_base_ids',
          'welcome_message',
          'handoff_message',
          'channels'
        ];
      }
    
      /**
       * Create a new chatbot profile.
       * @param {Object} payload – exactly what arrives from the React form.
       */
      // ChatBotProfileService.js  (only the createBotProfile method shown)


      // ChatBotProfileService.js  (add below the createBotProfile method)


      async fetchChatbotProfiles({ workspaceId, clientId }) {
        try {
          /* ──────────────────────────────────────────────
            1. Grab the base chatbot rows
            ────────────────────────────────────────────── */
          const { data: bots, error: botErr } = await supabase
            .from('chatbots')
            .select(`
              id,
              name,
              custom_instructions,
              status,
              created_at,
              tone,
              welcome_message,
              handoff_message,
              audience_rules,
              behavior,
              knowledge_base_ids
            `)
            .eq('workspaceId', workspaceId)
            .eq('clientId', clientId)
            .order('created_at');

          if (botErr) throw botErr;
          if (!bots.length) return [];
          /* ──────────────────────────────────────────────
            2. For each bot gather counts in parallel
            ────────────────────────────────────────────── */
          return await Promise.all(
            bots.map(async (botRow) => {
              /* Conversation count + last activity  */
              // const [{ count: convCount, error: convCntErr }] =
              //   await supabase
              //     .from('conversations')
              //     .select('id', { count: 'exact', head: true })
              //     .eq('chatbot_id', botRow.id);

              // if (convCntErr) throw convCntErr;

              // const { data: lastConv, error: lcErr } = await supabase
              //   .from('conversations')
              //   .select('created_at')
              //   .eq('chatbot_id', botRow.id)
              //   .order('created_at', { ascending: false })
              //   .limit(1)
              //   .maybeSingle();

              // if (lcErr) throw lcErr;

              /* Actions count (comment out if you don’t track actions separately) */
              let actionsCount = 0;
              // const [{ count: actCount, error: actErr }] =
              //   await supabase
              //     .from('actions')
              //     .select('id', { count: 'exact', head: true })
              //     .eq('chatbot_id', botRow.id);
              // if (actErr) throw actErr;
              // actionsCount = actCount ?? 0;

              /* Assemble in the UI’s exact shape */
              return {
                id:                     botRow.id,
                name:                   botRow.name,
                description:            botRow.custom_instructions ?? '',
                status:                 botRow.status,
                createdAt:              botRow.created_at,
                tone:                   botRow.tone,
                welcomeMessage:         botRow.welcome_message,
                humanHandoffMessage:    botRow.handoff_message,
                audienceRules:          botRow.audience_rules,
                behavior:               botRow.behavior,
                isActive:               botRow.status === 'active',
                conversations:          0,
                actions:                actionsCount,
                lastActiveAt:           null,
                connectedContentCount:  botRow.knowledge_base_ids.length
              };
            })
          );

        } catch (err) {
          return this.handleError(err);
        }
      }


      async createBotProfile(payload) {
        const {
          name,
          persona,
          avatarUrl,
          tone,
          customInstructions,
          welcomeMessage,
          humanHandoffMessage,
          behavior,
          audienceRules,        // entire rule tree (root object)
          knowledgeBaseIds,
          status,
          channels,
          workspaceId,
          clientId,
          createdBy
        } = payload;

        try {
          /* ──────────────────────────────────────────────
            1. Duplicate-name guard
            ────────────────────────────────────────────── */
          const { data: existing } = await supabase
            .from('chatbots')
            .select('id')
            .eq('name', name)
            .eq('workspaceId', workspaceId)
            .eq('clientId', clientId)
            .single();

          if (existing) {
            throw new errors.AlreadyExist(
              `${this.entityName} with name "${name}" already exists.`
            );
          }

          /* ──────────────────────────────────────────────
            2. (Optional) create LLM assistant first
            ────────────────────────────────────────────── */
          // const llmSvc = new LLMService();
          // const { assistant_id } = await llmSvc.addAssistant({ name, instructions: customInstructions, tone });

          /* ──────────────────────────────────────────────
            3. Insert chatbot row and grab its UUID
            ────────────────────────────────────────────── */
          const { data: botRows, error: botErr } = await supabase
            .from('chatbots')
            .insert([{
              name,
              persona,
              avatar_url:          avatarUrl,
              status,
              tone,
              custom_instructions: customInstructions,
              welcome_message:     welcomeMessage,
              handoff_message:     humanHandoffMessage,
              behavior,
              audience_rules:      audienceRules,      // keep original JSON for reference
              knowledge_base_ids:  knowledgeBaseIds,
              channels,
              workspaceId,
              clientId,
              createdBy,
              // assistantid:          assistant_id,    // uncomment if you created one
            }])
            .select();

          if (botErr) throw botErr;
          const chatbotId = botRows[0].id;            // we’ll need this below

          /* ──────────────────────────────────────────────
            4. Persist the Audience-Rule tree
            ────────────────────────────────────────────── */

          /**
           * Recursively writes a rule-group subtree.
           * @param {Object} groupObj  – current node from JSON
           * @param {uuid|null} parentId – FK to parent group (null = root)
           * @returns {uuid} groupId of the row just written
           */
          const saveGroup = async (groupObj, parentId = null) => {
            /* Insert the group row */
            const { data: grpRows, error: grpErr } = await supabase
              .from('chatbot_rule_groups')
              .insert([{
                chatbot_id:      parentId ? null : chatbotId, // only root has the FK
                parent_group_id: parentId,
                combinator:      groupObj.combinator || 'and',
                created_by:      createdBy
              }])
              .select();

            if (grpErr) throw grpErr;
            const groupId = grpRows[0].id;

            /* Walk over its children */
            for (const rule of groupObj.rules || []) {
              if (Array.isArray(rule.rules)) {
                // ─ nested group
                await saveGroup(rule, groupId);
              } else {
                // ─ leaf rule
                const { error: leafErr } = await supabase
                  .from('chatbot_rules')
                  .insert([{
                    group_id:               groupId,
                    field:                  rule.field,
                    operator:               rule.operator,
                    value:                  rule.value,             // stored as JSONB
                    source_table:           rule.table,
                    custom_field_id:        rule.customFieldId,
                    custom_object_id:       rule.customObjectId,
                    custom_object_field_id: rule.customObjectFieldId,
                    created_by:             createdBy
                  }]);

                if (leafErr) throw leafErr;
              }
            }

            return groupId;
          };

          /* Only save if we actually got rules */
          if (audienceRules?.rules?.length) {
            await saveGroup(audienceRules);   // root call (parentId = null)
          }

          /* ──────────────────────────────────────────────
            5. Success – return the full chatbot row
            ────────────────────────────────────────────── */
          return botRows[0];

        } catch (err) {
          return this.handleError(err);
        }
      }


    async getDetails(id, workspaceId, clientId) {
        try {
            const { data: chatbotProfile, error } = await supabase
                .from('chatbot')
                .select('*')
                .eq('id', id)
                .eq('workspace_id', workspaceId)
                .eq('client_id', clientId)
                .single();

            if (!chatbotProfile) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }
            return chatbotProfile;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getChatbotRuleFields(workspaceId, clientId) {
      try {
          const tables = [
              {
                  name: "Contact",
                  fields: [{
                      entityType: "contact",
                      columnname: "firstname",
                      label: "First Name",
                      type: "text",
                      placeholder: "Enter first name",
                      table: "contact"
                  },
                  {
                      entityType: "contact",
                      columnname: "lastname",
                      label: "Last Name",
                      type: "text",
                      placeholder: "Enter last name",
                      table: "contact"
                  },
                  {
                      entityType: "contact",
                      columnname: "email",
                      label: "Email",
                      type: "text",
                      placeholder: "Enter email",
                      table: "contact"
                  },
                  {
                      entityType: "contact",
                      columnname: "phone",
                      label: "Phone",
                      type: "text",
                      placeholder: "Enter phone",
                      table: "contact"
                  },
                  {
                      entityType: "contact",
                      columnname: "twitter",
                      label: "Twitter",
                      type: "text",
                      placeholder: "Enter twitter",
                      table: "contact"
                  },
                  {
                      entityType: "contact",
                      columnname: "linkedin",
                      label: "LinkedIn",
                      type: "text",
                      placeholder: "Enter linkedin",
                      table: "contact"
                  },
                  {
                      entityType: "contact",
                      columnname: "address",
                      label: "Address",
                      type: "text",
                      placeholder: "Enter address",
                      table: "contact"
                  }
                  ]
              },
              {
                  name: "Company",
                  fields: [{
                      entityType: "company",
                      columnname: "name",
                      label: "Name",
                      type: "text",
                      placeholder: "Enter company name",
                      table: "company"
                  },
                  {
                      entityType: "company",
                      columnname: "description",
                      label: "Description",
                      type: "text",
                      placeholder: "Enter company description",
                      table: "company"
                  },
                  {
                      columnname: "phone",
                      label: "Phone",
                      type: "text",
                      placeholder: "Enter company phone",
                      table: "company"
                  },
                  {
                      entityType: "company",
                      columnname: "website",
                      label: "Website",
                      type: "text",
                      placeholder: "Enter company website",
                      table: "company"
                  }
                  ]
              },
          ];

          // Fetch custom fields
          const { data: customFields, error: customFieldsError } = await this.supabase.from("customfields").select("*").eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null);
          if (customFieldsError) {
              throw new errors.Internal(customFieldsError.message);
          }

          const customerCustomFields = customFields.filter(field => field.entityType === "customer");
          const companyCustomFields = customFields.filter(field => field.entityType === "company");

          customerCustomFields.forEach(field => {
              tables[0].fields.push({
                  entityType: "custom_field",
                  columnname: field.id,
                  label: field.name,
                  type: field.fieldType,
                  options: field.options,
                  placeholder: field.placeholder,
                  table: "contact"
              });
          });

          companyCustomFields.forEach(field => {
              tables[1].fields.push({
                  entityType: "custom_field",
                  columnname: field.id,
                  label: field.name,
                  type: field.fieldType,
                  options: field.options,
                  placeholder: field.placeholder,
                  table: "company"
              });
          });

          // List all custom objects and send them as tables with  their custom object fields
          const { data: customObjects, error: customObjectsError } = await this.supabase.from("customobjects").select("*").eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null).order("createdAt", { ascending: false });

          if (customObjectsError) {
              throw new errors.Internal(customObjectsError.message);
          }

          const promises = customObjects.map(async (customObject) => {
              const customObjectFields = [];
              const { data: customObjectFieldsData, error: customObjectFieldsError } = await this.supabase.from("customobjectfields").select("*").eq("workspaceId", workspaceId).eq("clientId", clientId).eq("customObjectId", customObject.id).is("deletedAt", null).order("createdAt", { ascending: false });

              if (customObjectFieldsError) {
                  throw new errors.Internal(customObjectFieldsError.message);
              }
              const fieldPromises = customObjectFieldsData.map(field => {
                  customObjectFields.push({
                      entityType: "custom_object_field",
                      columnname: field.id,
                      label: field.name,
                      type: field.fieldType,
                      options: field.options,
                      placeholder: field.placeholder,
                      table: customObject.name
                  });
              });
              await Promise.all(fieldPromises);
              tables.push({
                  name: customObject.name,
                  fields: customObjectFields
              });
          });

          await Promise.all(promises);

          return {
              tables
          }
      } catch (error) {
          console.error(error);
          throw error;
      }
  }

    async updateChatbotProfile({ id, workspaceId, clientId }, updateValues) {
        try {
            let chatbotProfile = await this.getDetails(id, workspaceId, clientId);
            if (updateValues.name) {
                const { data: botProfile } = await supabase
                    .from('chatbot')
                    .select('id')
                    .eq('name', updateValues.name)
                    .eq('workspace_id', workspaceId)
                    .eq('client_id', clientId)
                    .neq('id', id)
                    .single();

                if (botProfile) {
                    return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${updateValues.name}" already exists.`));
                }
            }

            const { error } = await supabase
                .from('chatbot')
                .update(updateValues)
                .eq('id', id);

            if (error) throw error;
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteChatbotProfile({ id, workspaceId, clientId }) {
        try {
            await this.getDetails(id, workspaceId, clientId);
            const { error } = await supabase
                .from('chatbot')
                .update({ deleted_at: new Date() })
                .eq('id', id);

            if (error) throw error;
            return Promise.resolve();
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getAnswerFromBot({ id, workspaceId, clientId }, query) {
        try {
            await this.getDetails(id, workspaceId, clientId);
            let externalBotInst = new ChatBotExternalService();
            let answer = await externalBotInst.sendQuestion(clientId, query, clientId);
            return answer;
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = ChatBotProfileService;
