const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const { v4: uuid } = require("uuid");
const Ajv = require('ajv');
const { Engine, Rule, Operator } = require('json-rules-engine');
const TemporalServerUtils = require("../Utils/TemporalServerUtils");
const axios = require('axios');
const { subscribeToChatbotPrimary } = require("../ablyServices/listeners");

class WorkflowService extends BaseService {
    constructor() {
        super();
        this.entityName = 'Workflow';
        this.listingFields = ["id", "name", "description", "status", "affectedTicketsCount"];
        this.updatableFields = ["name", "summary", "description", "status", "ruleIds", "actionIds", "lastUpdatedBy"];
    }

    async validateAudienceRules(audienceRules, customerData) {
        try {
            if (!audienceRules || !audienceRules.rules || !Array.isArray(audienceRules.rules)) {
                return false;
            }

            const { rules, combinator = 'and' } = audienceRules;

            // Evaluate each rule against customer data
            const ruleResults = rules.map(rule => {
                const { field, table, value, operator, customFieldId, customObjectId, customObjectFieldId } = rule;

                let fieldValue = null;

                // Get the field value based on the table and field
                if (table === 'customer') {
                    fieldValue = customerData[field];
                } else if (table === 'company' && customerData.companyId) {
                    // For company fields, we'd need to fetch company data
                    // For now, we'll handle this in the main method
                    return false;
                }

                if (fieldValue === null || fieldValue === undefined) {
                    return false;
                }

                // Apply the operator
                switch (operator) {
                    case 'equals':
                        return fieldValue === value;
                    case 'contains':
                        return String(fieldValue).includes(value);
                    case 'starts_with':
                        return String(fieldValue).startsWith(value);
                    case 'ends_with':
                        return String(fieldValue).endsWith(value);
                    case 'not_equals':
                        return fieldValue !== value;
                    case 'not_contains':
                        return !String(fieldValue).includes(value);
                    default:
                        return false;
                }
            });

            // Apply combinator
            if (combinator === 'and') {
                return ruleResults.every(result => result === true);
            } else if (combinator === 'or') {
                return ruleResults.some(result => result === true);
            }

            return false;
        } catch (error) {
            console.log("Error in validateAudienceRules()", error);
            return false;
        }
    }

    async handleTicketCompleted(payload) {
        try {
            const ticketId = payload.id;
            const workspaceId = payload.workspaceId;
            const clientId = payload?.clientId ?? null;
            console.log("handleTicketCompleted()", ticketId, workspaceId, clientId);
            // fetch the ticket
            const { data: ticket, error: ticketError } = await this.supabase
                .from('tickets')
                .select('*')
                .eq('id', ticketId)
                .is('deletedAt', null)
                .single();

            if (ticketError) throw new Error(`Fetch failed: ${ticketError.message}`);
            console.log("ticket", ticket);
            if (ticket.channel === "chat") {
                if (ticket.assigneeId) {
                    // then check from the client if the ticket_ai_enabled is true
                    const { data: client, error: clientError } = await this.supabase
                        .from('clients')
                        .select('*')
                        .eq('id', ticket.clientId)
                        .single();

                    if (client.ticket_ai_enabled) {
                        // fetch the customer data related to the ticket
                        const { data: customer, error: customerError } = await this.supabase
                            .from('customers')
                            .select('*')
                            .eq('id', ticket.customerId)
                            .single();

                        if (customerError) throw new Error(`Fetch failed: ${customerError.message}`);

                        // fetch all chatbots with their audience_rules
                        const { data: chatbots, error: chatbotsError } = await this.supabase
                            .from('chatbots')
                            .select('id, name, audience_rules')
                            .eq('workspaceId', workspaceId)
                            .eq('clientId', clientId)

                        if (chatbotsError) throw new Error(`Fetch failed: ${chatbotsError.message}`);

                        // Check if any chatbot's audience rules match the customer data
                        let matchingChatbot = null;

                        for (const chatbot of chatbots) {
                            if (chatbot.audience_rules) {
                                const audienceRules = typeof chatbot.audience_rules === 'string'
                                    ? JSON.parse(chatbot.audience_rules)
                                    : chatbot.audience_rules;

                                // For rules that reference company data, fetch company data
                                let customerDataWithCompany = { ...customer };

                                if (audienceRules.rules && audienceRules.rules.some(rule => rule.table === 'company')) {
                                    if (customer.companyId) {
                                        const { data: company, error: companyError } = await this.supabase
                                            .from('companies')
                                            .select('*')
                                            .eq('id', customer.companyId)
                                            .single();

                                        if (!companyError && company) {
                                            customerDataWithCompany = { ...customer, ...company };
                                        }
                                    }
                                }

                                const isMatch = await this.validateAudienceRules(audienceRules, customerDataWithCompany);

                                if (isMatch) {
                                    matchingChatbot = chatbot;
                                    break;
                                }
                            }
                        }

                        if (matchingChatbot) {
                            console.log("Matching chatbot found:", matchingChatbot);
                            // Update ticket with matching chatbot
                            const { data: updateTicketData, error: updateTicketDataError } = await this.supabase
                                .from('tickets')
                                .update({
                                    chatbotId: matchingChatbot.id,
                                    aiEnabled: true
                                })
                                .eq('id', ticketId);

                            if (updateTicketDataError) throw new Error(`Fetch failed: ${updateTicketDataError.message}`);

                            // send this data to ably listener
                            // send a post request to https://https://prodai.pullseai.com/api/v1/chatbot/primary/message
                            const response = await axios.post('https://prodai.pullseai.com/api/v1/chatbot/primary/message', {
                                chatbotProfileId: matchingChatbot.id,
                                ticketId: ticketId,
                                message: ticket.title
                            })
                                .catch(error => {
                                    console.log("Error in handleTicketCompleted()", error);
                                });

                            if (response && response.status === 200) {
                                console.log("Ticket updated successfully with chatbot:", matchingChatbot.name);
                                // send the response to the ably listener
                                subscribeToChatbotPrimary(matchingChatbot.id, ticketId);
                            } else {
                                console.log("Ticket update failed");
                            }
                        } else {
                            console.log("No matching chatbot found for customer:", customer.email);
                        }
                    }
                } else {
                    // handle team level routing
                    const { data: channel, error: channelError } = await this.supabase
                        .from('widget')
                        .select('*')
                        .eq('clientId', ticket.clientId)
                        .eq('workspaceId', workspaceId)
                    if (channelError) throw new Error(`Fetch failed: ${channelError.message}`);

                    if (channel) {
                        console.log("Channel found:", channel);
                    }
                    // get teams from this channel
                    const { data: teams, error: teamsError } = await this.supabase
                        .from('teamChannels')
                        .select('teamId')
                        .in('widgetId', channel.map(c => c.id));

                    if (teamsError) throw new Error(`Fetch failed: ${teamsError.message}`);
                    if (teams && teams.length > 0) {
                        // create a row for each team in ticket_team table
                        for (const team of teams) {
                            const { data: ticketTeam, error: ticketTeamError } = await this.supabase
                                .from('ticket_teams')
                                .insert(
                                    {
                                        ticket_id: ticketId,
                                        team_id: team.teamId,
                                        client_id: ticket.clientId,
                                        workspace_id: workspaceId,
                                        created_at: new Date(),
                                        updated_at: new Date()
                                    });

                            if (ticketTeamError) throw new Error(`Fetch failed: ${ticketTeamError.message}`);
                            console.log("Ticket team created:", ticketTeam);
                        }
                    }
                }
            }
            else if (ticket.channel === "email") {
                // handle email channel
                console.log("Email channel found:", ticket);
                // get teams channel where channelId is ticket.emailChannelId
                const { data: teamsChannel, error: teamsChannelError } = await this.supabase
                    .from('teamChannels')
                    .select('teamId')
                    .eq('channelId', ticket.emailChannelId);
                if (teamsChannelError) throw new Error(`Fetch failed: ${teamsChannelError.message}`);
                    if (teamsChannel) {
                    // create a row for each team in ticket_team table
                    for (const team of teamsChannel) {
                        //check if team and ticket are already in ticket_teams table
                        const { data: ticketTeamCheck, error: ticketTeamCheckError } = await this.supabase
                            .from('ticket_teams')
                            .select('*')
                            .eq('team_id', team.teamId)
                            .eq('ticket_id', ticketId);
                        if (ticketTeamCheckError) throw new Error(`Fetch failed: ${ticketTeamCheckError.message}`);
                        if (ticketTeamCheck && ticketTeamCheck.length > 0) {
                            // team and ticket are already in ticket_teams table
                            continue;
                        }
                        const { data: ticketTeam, error: ticketTeamError } = await this.supabase
                            .from('ticket_teams')
                            .insert(
                                {
                                    ticket_id: ticketId,
                                    team_id: team.teamId,
                                    client_id: ticket.clientId,
                                    workspace_id: workspaceId,
                                    created_at: new Date(),
                                    updated_at: new Date()
                                });

                            if (ticketTeamError) throw new Error(`Fetch failed: ${ticketTeamError.message}`);
                            console.log("Ticket team created:", ticketTeam);
                        }
                    }
                
            }
        } catch (e) {
            console.log("Error in handleTicketCompleted()", e);
            return;
        }
    }

    async createWorkflowFolder(data) {
        try {
            const { name, workspaceId, clientId, createdBy, description } = data;

            // Check if the folder name already exists
            const { data: existingFolder, error: existingFolderError } = await this.supabase
                .from('workflowfolder')
                .select('*')
                .eq('name', name)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null)
                .single();

            if (existingFolderError && existingFolderError.code !== "PGRST116") {
                console.log("Error in createWorkflowFolder()", existingFolderError);
                throw new errors.BadRequestError(existingFolderError.message);
            }

            if (existingFolder) {
                throw new errors.BadRequestError("Folder name already exists");
            }


            const { data: newFolder, error } = await this.supabase
                .from('workflowfolder')
                .insert({ name, workspaceId, clientId, createdBy, description })
                .select(
                    `*,
                    workflow (
                        id
                    )
                `
                )
                .single();
            if (error) {
                console.log("Error in createWorkflowFolder()", error);
                throw new errors.BadRequestError(error.message);
            }

            return {
                ...newFolder,
                workflowIds: [],
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getWorkflowFolders(data) {
        try {
            const { workspaceId, clientId } = data;
            const { data: folders, error } = await this.supabase
                .from('workflowfolder')
                .select(`*,
                    workflow (
                        id
                    )
                `)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null)
                .order('createdAt', { ascending: false });

            if (error) {
                console.log("Error in getWorkflowFolders()", error);
                throw new errors.InternalServerError(error.message);
            }

            return folders;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async deleteWorkflowFolder(id) {
        try {
            const { data: deletedFolder, error } = await this.supabase
                .from('workflowfolder')
                .update({ deletedAt: new Date() })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.log("Error in deleteWorkflowFolder()", error);
                throw new errors.InternalServerError(error.message);
            }

            return deletedFolder;
        } catch (error) {
            console.log("Error in deleteWorkflowFolder()", error);
            return this.handleError(error);
        }
    }


    async updateWorkflowFolder(id, data) {
        try {
            const { name, description, clientId, workspaceId } = data;
            const { data: updatedFolder, error } = await this.supabase
                .from('workflowfolder')
                .update({ name, description, updatedAt: `now()` })
                .eq('id', id)
                .eq('clientId', clientId)
                .eq('workspaceId', workspaceId)
                .is('deletedAt', null)
                .select()
                .single();

            if (error) {
                console.log("Error in updateWorkflowFolder()", error);
                throw new errors.InternalServerError(error.message);
            }

            return updatedFolder;
        } catch (error) {
            console.log("Error in updateWorkflowFolder()", error);
            return this.handleError(error);
        }
    }

    generateEmptyObjectFromSchema(schema) {
        if (Object.keys(schema).length === 0) return {};
        if (!schema || typeof schema !== 'object') return {};

        switch (schema.type) {
            case 'object':
                const obj = {};
                if (schema.properties) {
                    for (const key of Object.keys(schema.properties)) {
                        obj[key] = this.generateEmptyObjectFromSchema(schema.properties[key]);
                    }
                }
                return obj;

            case 'array':
                return [];

            case 'string':
                return schema.default ?? '';

            case 'number':
            case 'integer':
                return schema.default ?? null;

            case 'boolean':
                return schema.default ?? false;

            default:
                return {};
        }
    }


    async createWorkflow(data) {
        try {
            const { clientId, workspaceId, createdBy, triggerType, triggerPosition, nodeId } = data;

            const workflow = {
                name: "New Workflow",
                description: "New Workflow",
                status: "draft",
                numberOfExecutions: 0,
                tags: null,
                workflowFolderId: null,
                clientId: clientId,
                workspaceId: workspaceId,
                createdBy: createdBy,
            }

            // Create entry in workflow table
            const { data: workflowData, error: workflowError } = await this.supabase
                .from('workflow')
                .insert(workflow)
                .select()
                .single();

            if (workflowError) {
                console.log("Error in createWorkflow()", workflowError);
                throw new errors.InternalServerError(workflowError.message);
            }

            const workflowId = workflowData.id;

            const { data: getTriggerNodeSchema, error: getTriggerNodeSchemaError } = await this.supabase
                .from('workflownodeschema')
                .select('*')
                .eq('nodeType', triggerType)
                .eq('type', 'draft')
                .single();


            if (getTriggerNodeSchemaError) {
                console.log("Error in createWorkflow()", getTriggerNodeSchemaError);
                throw new errors.InternalServerError(getTriggerNodeSchemaError.message);
            }

            // Create a new json object with empty config based on the schema
            const emptyConfig = this.generateEmptyObjectFromSchema(getTriggerNodeSchema.schema);

            // Create entry in workflownode table
            const { data: workflownodeData, error: workflownodeError } = await this.supabase
                .from('workflownode')
                .insert({ workflowId: workflowId, type: triggerType, isTrigger: true, positionX: triggerPosition.positionX, positionY: triggerPosition.positionY, reactFlowId: nodeId, schemaVersion: getTriggerNodeSchema.schemaVersion, config: emptyConfig })
                .select()
                .single();

            if (workflownodeError) {
                console.log("Error in createWorkflow()", workflownodeError);
                throw new errors.InternalServerError(workflownodeError.message);
            }

            const workflownodeId = workflownodeData.id;

            // Update workflow table with workflownodeId
            const { data: updatedWorkflow, error: updatedWorkflowError } = await this.supabase
                .from('workflow')
                .update({ triggerNodeId: workflownodeId })
                .eq('id', workflowId)
                .select()
                .single();

            if (updatedWorkflowError) {
                console.log("Error in createWorkflow()", updatedWorkflowError);
                throw new errors.InternalServerError(updatedWorkflowError.message);
            }

            return updatedWorkflow;
        } catch (error) {
            console.log("Error in createWorkflow()", error);
            return this.handleError(error);
        }
    }

    async calculateAverageSuccessRate(workflows) {
        try {
            let totalSuccessRate = 0;
            let totalExecutions = 0;
            for (let workflow of workflows) {
                totalSuccessRate += workflow.successRate;
                totalExecutions += workflow.totalExecutions;
            }

            return totalSuccessRate / totalExecutions;
        } catch (error) {
            return 0;
        }
    }

    async calculateTotalExecutions(workflows) {
        try {
            let totalExecutions = 0;
            for (let workflow of workflows) {
                totalExecutions += workflow.totalExecutions;
            }
            return totalExecutions;
        } catch (error) {
            return 0;
        }
    }

    async getAllWorkflows(data) {
        try {
            const { workspaceId, clientId } = data;

            const { data: workflows, error } = await this.supabase
                .from('workflow')
                .select(`
                    *,
                    workflowfolder (
                        id,
                        name,
                        description
                    )
                `)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null);

            if (error) {
                console.log("Error in getAllWorkflows()", error);
                throw new errors.InternalServerError(error.message);
            }

            // Get all workflowFolders
            const { data: workflowFolders, error: workflowFoldersError } = await this.supabase
                .from('workflowfolder')
                .select('id, name, description')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null);

            if (workflowFoldersError) {
                console.log("Error in getAllWorkflows()", workflowFoldersError);
                throw new errors.InternalServerError(workflowFoldersError.message);
            }

            if (workflowFolders) {
                workflowFolders.forEach(folder => {
                    folder.workflowIds = [];
                });
            }

            if (workflows && workflows.length > 0 && workflowFolders && workflowFolders.length > 0) {
                // Add workflowIds to their respective folders if workflows exist
                if (workflows && workflows.length > 0) {
                    for (let workflow of workflows) {
                        const workflowFolder = workflowFolders?.find(folder => folder.id === workflow.workflowFolderId);
                        if (workflowFolder) {
                            workflowFolder.workflowIds.push(workflow.id);
                        }
                    }
                }
            }

            // Get all tags from db for the workspace and client
            const { data: tags, error: tagsError } = await this.supabase
                .from('tags')
                .select('id, name, color')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null);

            if (tagsError && tagsError.code !== "PGRST116") {
                console.log("Error in getAllWorkflows()", tagsError);
                throw new errors.InternalServerError(tagsError.message);
            }

            const allTags = tags;

            if (!workflows || workflows.length === 0) return {
                workflows: [],
                totalWorkflows: 0,
                activeWorkflows: 0,
                successRate: 0,
                totalExecutions: 0,
                workflowFolders: workflowFolders || [],
                tags: allTags || [],
            };


            // Step 1: Collect all tag IDs
            const tagIds = Array.from(
                new Set(
                    workflows.flatMap(workflow => workflow.tags || [])
                )
            );

            if (tagIds.length === 0) return {
                workflows: workflows,
                totalWorkflows: workflows.length,
                activeWorkflows: workflows.filter(workflow => workflow.status === "live").length,
                successRate: await this.calculateAverageSuccessRate(workflows) || 0,
                totalExecutions: await this.calculateTotalExecutions(workflows) || 0,
                workflowFolders: workflowFolders || [],
                tags: allTags || [],
            };

            // Step 2: Build a tag map for quick lookup
            const tagMap = {};
            for (let tag of allTags) {
                tagMap[tag.id] = tag;
            }

            // Step 3: Attach tags to workflows
            for (let workflow of workflows) {
                workflow.tags = (workflow.tags || []).map(tagId => tagMap[tagId]).filter(Boolean);
            }

            return {
                workflows: workflows,
                totalWorkflows: workflows.length,
                activeWorkflows: workflows.filter(workflow => workflow.status === "live").length,
                successRate: await this.calculateAverageSuccessRate(workflows) || 0,
                totalExecutions: await this.calculateTotalExecutions(workflows) || 0,
                workflowFolders: workflowFolders || [],
                tags: allTags || [],
            };
        } catch (error) {
            return this.handleError(error);
        }
    }


    async getWorkflowById(data) {
        try {
            const { id, workspaceId, clientId } = data;

            // Give all the details of the workflow
            const { data: workflow, error } = await this.supabase
                .from('workflow')
                .select('*')
                .eq('id', id)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null)
                .single();

            if (error) {
                console.log("Error in getWorkflowById()", error);
                throw new errors.InternalServerError(error.message);
            }

            if (!workflow) {
                throw new errors.NotFoundError("Workflow not found");
            }

            // Get all the nodes of the workflow
            const { data: nodes, error: nodesError } = await this.supabase
                .from('workflownode')
                .select('*')
                .eq('workflowId', id)

            if (nodesError) {
                console.log("Error in getWorkflowById()", nodesError);
                throw new errors.InternalServerError(nodesError.message);
            }

            workflow.nodes = nodes;

            // Get all the edges of the workflow
            const { data: edges, error: edgesError } = await this.supabase
                .from('workflowedge')
                .select('*')
                .eq('workflowId', id);

            if (edgesError) {
                console.log("Error in getWorkflowById()", edgesError);
                throw new errors.InternalServerError(edgesError.message);
            }

            workflow.edges = edges;

            return workflow;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async deleteWorkflow(data) {
        try {
            const { id, workspaceId, clientId } = data;

            // Delete nodes
            const { data: nodes, error: nodesError } = await this.supabase
                .from('workflownode')
                .delete()
                .eq('workflowId', id);

            if (nodesError) {
                console.log("Error in deleteWorkflow()", nodesError);
                throw new errors.InternalServerError(nodesError.message);
            }

            // Delete workflow
            const { data: workflow, error: workflowError } = await this.supabase
                .from('workflow')
                .delete()
                .eq('id', id)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId);

            if (workflowError) {
                console.log("Error in deleteWorkflow()", workflowError);
                throw new errors.InternalServerError(workflowError.message);
            }

            return {
                error: false,
                message: "Workflow deleted successfully",
            };
        } catch (error) {
            return this.handleError(error);
        }
    }


    async updateWorkflowTags(data) {
        try {
            const { id, workspaceId, clientId, tags } = data;

            // Update tags for workflow
            const { data: updatedWorkflow, error: updatedWorkflowError } = await this.supabase
                .from('workflow')
                .update({ tags: tags })
                .eq('id', id)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId);

            if (updatedWorkflowError) {
                console.log("Error in updateWorkflowTags()", updatedWorkflowError);
                throw new errors.InternalServerError(updatedWorkflowError.message);
            }

            return {
                error: false,
                message: "Workflow tags updated successfully",
            };

        } catch (error) {
            return this.handleError(error);
        }
    }


    async updateWorkflow({ id, workspaceId, clientId, workflowConfig, nodes, edges }) {
        try {
            // Get workspace and check if its live
            const { data: workspace, error: workspaceError } = await this.supabase
                .from('workspace')
                .select('*')
                .eq('id', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null)
                .single();

            if (workspaceError) throw new Error(`Fetch failed: ${workspaceError.message}`);

            // Update the workflow config
            const { data: updatedWorkflow, error: updatedWorkflowError } = await this.supabase
                .from('workflow')
                .update({ name: workflowConfig.name, status: "draft" })
                .eq('id', id)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId);

            if (updatedWorkflowError) throw new Error(`Update failed: ${updatedWorkflowError.message}`);

            // Add all the node types in an array
            const nodeTypes = nodes.map(node => node.type);

            // 1. Validate schema (TODO: Implement AJV validation here)
            // Get all the schemas for the node types
            const { data: schemas, error: schemasError } = await this.supabase
                .from('workflownodeschema')
                .select('*')
                .in('nodeType', nodeTypes)
                .eq('type', 'draft');

            if (schemasError) throw new Error(`Fetch failed: ${schemasError.message}`);

            // Validate the schemas before proceeding forward for each node using ajv
            const ajv = new Ajv();
            for (const node of nodes) {
                const schema = schemas.find(schema => schema.nodeType === node.type);
                if (!schema) throw new Error(`Schema not found for node type: ${node.type}`);

                const validate = ajv.compile(schema.schema);
                const valid = validate(node.data);
                console.log(node.data, valid, schema.schema, "hehehe")
                if (!valid) throw new Error(`Invalid data for node type: ${node.type}`);
            }

            // map all schema versions to the node types by creating a new Set
            const schemaVersionMap = new Map();
            for (const schema of schemas) {
                schemaVersionMap.set(schema.nodeType, schema.schemaVersion);
            }

            // 2. Fetch current state in a single query with related edges
            const { data: dbNodes, error: fetchError } = await this.supabase
                .from('workflownode')
                .select('*')
                .eq('workflowId', id);

            const { data: dbEdges, error: edgesError } = await this.supabase
                .from('workflowedge')
                .select('*')
                .eq('workflowId', id);

            if (fetchError) throw new Error(`Fetch failed: ${fetchError.message}`);
            if (edgesError) throw new Error(`Fetch failed: ${edgesError.message}`);

            // 3. Prepare batch operations
            const existingNodeIds = new Set();
            const existingEdgeIds = new Set();
            const nodeUpdates = [];
            const nodeInserts = [];
            const edgeUpdates = [];
            const edgeInserts = [];
            const newIdsMap = new Map();

            // Process Nodes
            for (const node of nodes) {
                if (node.dbId) {
                    existingNodeIds.add(node.dbId);
                    nodeUpdates.push({
                        id: node.dbId,
                        type: node.type,
                        positionX: node.position.x,
                        positionY: node.position.y,
                        config: node.data,
                        workflowId: id,
                        reactFlowId: node.id,
                    });
                } else {
                    nodeInserts.push({
                        type: node.type,
                        positionX: node.position.x,
                        positionY: node.position.y,
                        config: node.data,
                        workflowId: id,
                        reactFlowId: node.id,
                        isTrigger: false,
                        schemaVersion: schemaVersionMap.get(node.type)
                    });
                }
            }

            // Process Edges
            for (const edge of edges) {
                if (edge.dbId) {
                    existingEdgeIds.add(edge.dbId);
                    edgeUpdates.push({
                        id: edge.dbId,
                        reactflowSourceId: edge.source,
                        reactflowSourceHandle: edge.sourceHandle,
                        reactflowTargetId: edge.target,
                        reactflowTargetHandle: edge.targetHandle,
                        workflowId: id
                    });
                } else {
                    edgeInserts.push({
                        reactflowSourceId: edge.source,
                        reactflowSourceHandle: edge.sourceHandle,
                        reactflowTargetId: edge.target,
                        reactflowTargetHandle: edge.targetHandle,
                        workflowId: id
                    });
                }
            }

            // 4. Execute batch operations
            // Update existing nodes
            if (nodeUpdates.length > 0) {
                const { error } = await this.supabase
                    .from('workflownode')
                    .upsert(nodeUpdates);
                if (error) throw error;
            }

            // Insert new nodes and capture IDs
            if (nodeInserts.length > 0) {
                const { data: newNodes, error } = await this.supabase
                    .from('workflownode')
                    .insert(nodeInserts)
                    .select('id, reactFlowId');
                if (error) throw error;

                newNodes.forEach(({ id: dbId, reactFlowId }) => {
                    newIdsMap.set(reactFlowId, dbId);
                });
            }

            // Update existing edges
            if (edgeUpdates.length > 0) {
                const { error } = await this.supabase
                    .from('workflowedge')
                    .upsert(edgeUpdates);
                if (error) throw error;
            }

            // Insert new edges
            if (edgeInserts.length > 0) {
                const { data: newEdges, error } = await this.supabase
                    .from('workflowedge')
                    .insert(edgeInserts)
                    .select('id, reactflowSourceId');
                if (error) throw error;
            }

            // 5. Handle deletions
            const currentNodes = dbNodes.map(n => n.id);
            const currentEdges = dbEdges.map(e => e.id);

            // Delete nodes not present in the update
            const nodesToDelete = currentNodes.filter(id => !existingNodeIds.has(id));
            if (nodesToDelete.length > 0) {
                await this.supabase
                    .from('workflownode')
                    .delete()
                    .in('id', nodesToDelete);
            }

            // Delete edges not present in the update
            const edgesToDelete = currentEdges.filter(id => !existingEdgeIds.has(id));
            if (edgesToDelete.length > 0) {
                await this.supabase
                    .from('workflowedge')
                    .delete()
                    .in('id', edgesToDelete);
            }

            return {
                error: false,
                message: "Workflow updated successfully",
                newIds: Object.fromEntries(newIdsMap) // Map of reactFlowId → dbId
            };

        } catch (error) {
            console.error("Workflow update failed:", error);
            return this.handleError({
                error: true,
                message: "Workflow update failed",
                data: error,
                httpCode: 400,
                code: "WORKFLOW_UPDATE_FAILED"
            });
        }
    }

    getSendMessageNodeHandles(node) {
        if (node.config.buttons.length > 0) {
            const idArray = [`${node.reactFlowId}:entry`];
            const buttons = node.config.buttons;

            for (const button of buttons) {
                idArray.push(`${button.id}`);
            }
            return idArray;
        } else {
            return [`${node.reactFlowId}:entry`, `${node.reactFlowId}:exit`]
        }
    }

    async getWorkflowNodeHandles(node) {
        switch (node.type) {
            case "ticket_created":
                return [
                    `${node.reactFlowId}:exit`
                ]
            case "send_message":
                return this.getSendMessageNodeHandles(node);
            case "end":
                return [`${node.reactFlowId}:entry`]
            default:
                return false;
        }
    }

    async validateChannels(ticketId, channels = []) {
        try {
            if (channels.length === 0) return true;

            const ticketData = await this.supabase
                .from('ticket')
                .select('*')
                .eq('id', ticketId)
                .is('deletedAt', null)
                .single();

            if (!ticketData) throw new Error("Ticket not found");

            const channel = ticketData.channel;

            const isChannelPresent = channels.some(c => c.channelType === channel);

            if (!isChannelPresent) throw new Error("Ticket is not associated with the workflow");

            if (channel === 'email') {
                const emailChannelIdInTicket = ticketData.emailChannelId;
                const matchingChannel = channels.find(c => c.emailChannelId === emailChannelIdInTicket);

                if (!matchingChannel) throw new Error("Email channel is not associated with the workflow");
            } else if (channel === 'chatwidget') {
                const chatwidgetChannelIdInTicket = ticketData.chatWidgetId;
                const matchingChannel = channels.find(c => c.widgetId === chatwidgetChannelIdInTicket);

                if (!matchingChannel) throw new Error("Chatwidget channel is not associated with the workflow");
            }

            return true;
        } catch (error) {
            console.log("Error in validateChannels()", error);
            return false;
        }
    }

    async fieldsToFetchFromDb(fields, ticketId = null, contactId = null, companyId = null) {
        if (!ticketId && !contactId && !companyId) throw new Error("No ticket, contact or company id provided");
        let ticketData = null;
        let contactData = null;
        let companyData = null;
        let data = {};

        for (const field of Object.keys(fields)) {
            data[field] = {};
        }

        if (Object.keys(fields["ticket"]).length > 0 || Object.keys(fields["contact"]).length > 0 || Object.keys(fields["company"]).length > 0) {
            if (!ticketId && Object.keys(fields["ticket"]).length > 0) {
                for (const columnname of fields["ticket"]) {
                    data["ticket"][columnname] = null;
                }
            } else {
                const { data: ticket, error: ticketError } = await this.supabase
                    .from('tickets')
                    .select('*')
                    .eq('id', ticketId)
                    .is('deletedAt', null)
                    .single();

                if (ticketError) throw new Error(`Fetch failed: ${ticketError.message}`);
                ticketData = ticket;

                if (Object.keys(fields["ticket"]).length > 0) {
                    for (const columnname of fields["ticket"]) {
                        data["ticket"][columnname] = ticketData?.[columnname] || null;
                    }
                }
            }
        }

        if (Object.keys(fields["contact"]).length > 0 || Object.keys(fields["company"]).length > 0) {
            if (!contactId && !ticketData?.customerId && Object.keys(fields["contact"]).length > 0) {
                for (const columnname of fields["contact"]) {
                    data["contact"][columnname] = null;
                }
            } else {
                const { data: contact, error: contactError } = await this.supabase
                    .from('customers')
                    .select('*')
                    .eq('id', contactId || ticketData?.customerId)
                    .is('deletedAt', null)
                    .single();

                if (contactError) throw new Error(`Fetch failed: ${contactError.message}`);
                contactData = contact;

                if (Object.keys(fields["contact"]).length > 0) {
                    for (const columnname of fields["contact"]) {
                        data["contact"][columnname] = contactData?.[columnname];
                    }
                }
            }
        }

        if (Object.keys(fields["company"]).length > 0) {
            if (!companyId && !contactData?.companyId) {
                for (const columnname of fields["company"]) {
                    data["company"][columnname] = null;
                }
            } else {
                const { data: company, error: companyError } = await this.supabase
                    .from('companies')
                    .select('*')
                    .eq('id', companyId || contactData?.companyId)
                    .is('deletedAt', null)
                    .single();

                if (companyError) throw new Error(`Fetch failed: ${companyError.message}`);
                companyData = company;

                for (const columnname of fields["company"]) {
                    data["company"][columnname] = companyData?.[columnname];
                }
            }
        }

        if (fields["custom_field"].length > 0) {
            const { data: customFields, error: customFieldsError } = await this.supabase
                .from('customfields')
                .select('*')
                .in('id', fields.custom_field)
                .is('deletedAt', null);

            if (customFieldsError) throw new Error(`Fetch failed: ${customFieldsError.message}`);

            // Fetch date from data table
            for (const customField of fields.custom_field) {
                let query = this.supabase
                    .from('customfielddata')
                    .select('*')
                    .eq('customfieldId', customField)
                    .eq('entityType', customFields.find(cf => cf.id === customField).entityType);

                if (ticketId) {
                    query = query.eq('ticketId', ticketId);
                }
                if (contactId) {
                    query = query.eq('contactId', contactId);
                }
                if (companyId) {
                    query = query.eq('companyId', companyId);
                }

                const { data: customFieldData, error: dataError } = await query.single();

                if (dataError) {
                    data.custom_field[customField] = null;
                } else {
                    data.custom_field[customField] = customFieldData?.data;
                }
            }

        }

        if (fields["custom_object_field"].length > 0) {
            const { data: customObjectFields, error: customObjectFieldsError } = await this.supabase
                .from('customobjectfields')
                .select('*, customobjects!customobjecfields_customObjectId_fkey(id, name, connectionType)')
                .in('id', fields.custom_object_field);

            if (customObjectFieldsError) throw new Error(`Fetch failed: ${customObjectFieldsError.message}`);

            const customObjectFieldsGroupedByCustomObjectId = customObjectFields.reduce((acc, cof) => {
                if (!acc[cof.customObjectId]) acc[cof.customObjectId] = [];
                acc[cof.customObjectId].push(cof);
                return acc;
            }, {});

            for (const customObjectId of Object.keys(customObjectFieldsGroupedByCustomObjectId)) {
                const customObjectFields = customObjectFieldsGroupedByCustomObjectId[customObjectId];
                const connectionType = customObjectFieldsGroupedByCustomObjectId[customObjectId][0].customobjects.connectionType;

                for (const customObjectField of customObjectFields) {
                    const { data: customObjectFieldData, error: customObjectFieldError } = await this.supabase
                        .from('customobjectfielddata')
                        .select('*')
                        .eq('customobjectfieldId', customObjectField.id)
                        .eq('entityType', connectionType);

                    if (customObjectFieldError) {
                        // If the key is not present, then add it
                        if (!data.custom_object_field[customObjectId]) {
                            data.custom_object_field[customObjectId] = {};
                        }
                        data.custom_object_field[customObjectId][customObjectField.id] = null;
                    } else {
                        // If the key is not present, then add it
                        if (!data.custom_object_field[customObjectId]) {
                            data.custom_object_field[customObjectId] = {};
                        }
                        data.custom_object_field[customObjectId][customObjectField.id] = customObjectFieldData;
                    }
                }
            }
        }

        return data;
    }

    async validateRules(rules, ticketId = null, contactId = null, companyId = null) {
        try {
            const parentGroup = rules.find(r => r.workflowrulegroup.parentGroupId === null)?.workflowrulegroup;
            if (!parentGroup) throw new Error("Parent group not found");
            const parentGroupOperator = parentGroup.operator === "and" ? "all" : "any";
            const parentGroupId = parentGroup.id;
            const fieldsToFetchFromDb = {
                custom_field: [],
                custom_object_field: [],
                contact: [],
                company: [],
                ticket: []
            };
            rules.forEach(r => {
                if (r.entityType === 'custom_field') {
                    fieldsToFetchFromDb.custom_field.push(r.customFieldId);
                } else if (r.entityType === 'custom_object_field') {
                    fieldsToFetchFromDb.custom_object_field.push(r.customObjectFieldId);
                } else if (r.entityType === 'contact') {
                    fieldsToFetchFromDb.contact.push(r.standardFieldName);
                } else if (r.entityType === 'company') {
                    fieldsToFetchFromDb.company.push(r.standardFieldName);
                } else if (r.entityType === 'ticket') {
                    fieldsToFetchFromDb.ticket.push(r.standardFieldName);
                }
            });

            const facts = await this.fieldsToFetchFromDb(fieldsToFetchFromDb, ticketId, contactId, companyId);

            const conditions = {
                [parentGroupOperator]: []
            };

            const rulesGroupedByGroupIds = rules.reduce((acc, rule) => {
                const groupId = rule.workflowrulegroup.id;
                if (!acc[groupId]) {
                    acc[groupId] = [];
                }
                acc[groupId].push(rule);
                return acc;
            }, {});

            const rulesWithinParentGroup = rulesGroupedByGroupIds[parentGroupId];
            const childGroups = Object.keys(rulesGroupedByGroupIds).filter(r => r !== parentGroupId);

            if (childGroups.length > 0) {
                for (const groupId of childGroups) {
                    const groupOperator = rulesGroupedByGroupIds[groupId][0].workflowrulegroup.operator === "and" ? "all" : "any";
                    const groupRules = rulesGroupedByGroupIds[groupId];

                    conditions[parentGroupOperator].push({
                        [groupOperator]: groupRules.map(r => {
                            return {
                                fact: r.entityType === 'custom_field' ? `custom_field.${r.customFieldId}` : r.entityType === 'custom_object_field' ? `custom_object_field.${r.customObjectId}.${r.customObjectFieldId}` : `${r.entityType}.${r.standardFieldName}`,
                                operator: r.operator.toLowerCase(),
                                value: r.value
                            }
                        })
                    })
                }
            }

            if (rulesWithinParentGroup.length > 0) {
                for (const rule of rulesWithinParentGroup) {
                    let fact = '';
                    if (rule.entityType === 'custom_field') {
                        fact = `custom_field.${rule.customFieldId}`;
                    } else if (rule.entityType === 'custom_object_field') {
                        fact = `custom_object_field.${rule.customObjectId}.${rule.customObjectFieldId}`;
                    } else {
                        fact = `${rule.entityType}.${rule.standardFieldName}`;
                    }

                    conditions[parentGroupOperator].push({
                        fact,
                        operator: rule.operator.toLowerCase(),
                        value: rule.value
                    });
                }
            }

            function flatten(obj, prefix = '', res = {}) {
                for (const key in obj) {
                    const value = obj[key];
                    const prefixedKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'object' && value !== null) {
                        flatten(value, prefixedKey, res);
                    } else {
                        res[prefixedKey] = value;
                    }
                }
                return res;
            }


            console.log(conditions, conditions.all, "conditions");
            console.log(facts, "facts");
            console.log(flatten(facts), "flattened facts");

            // Use json rule engine to validate the conditions
            const engine = new Engine();


            engine.addOperator('equals', (factValue, jsonValue) => {
                return factValue === jsonValue;
            });

            engine.addOperator('contains', (factValue, jsonValue) => {
                return factValue.includes(jsonValue);
            });

            engine.addOperator('starts_with', (factValue, jsonValue) => {
                return factValue.startsWith(jsonValue);
            });

            engine.addOperator('ends_with', (factValue, jsonValue) => {
                return factValue.endsWith(jsonValue);
            });

            engine.addOperator('not_contains', (factValue, jsonValue) => {
                return !factValue.includes(jsonValue);
            });

            engine.addRule({
                conditions,
                event: {
                    type: "ticket_created",
                    data: {
                        ticketId: ticketId
                    }
                }
            });

            const result = await engine.run(flatten(facts));
            if (result && result?.failureEvents.length > 0) {
                return false;
            }

            return true;
        } catch (error) {
            console.log("Error in validateRules()", error);
            return false;
        }
    }

    async validateWorkflow(id, workspaceId, clientId, checkChannels = false, checkRules = false, ticketId = null, contactId = null, companyId = null) {
        try {
            if (checkRules) {
                // Get all rules and get all groups
                const { data: rules, error: rulesError } = await this.supabase
                    .from('workflowrule')
                    .select('*, workflowrulegroup!workflowrule_workflowRuleGroupId_fkey(id, operator, parentGroupId)')
                    .eq('workflowId', id)
                    .is('deletedAt', null);

                if (rulesError) throw new Error(`Fetch failed: ${rulesError.message}`);

                if (rules.length > 0) {
                    const isValid = await this.validateRules(rules, ticketId, contactId, companyId);

                    if (!isValid) throw new Error("Workflow rules are not valid");
                    console.log("Workflow rules are valid")
                }
            }



            if (checkChannels) {
                // Check if the workflow is activated for selected channels
                const { data: channels, error: channelsError } = await this.supabase
                    .from('workflowchannel')
                    .select('*')
                    .eq('workflowId', id)
                    .is('deletedAt', null);

                if (channelsError) throw new Error(`Fetch failed: ${channelsError.message}`);

                // If the length is 0 then workflow is activated for all channels
                if (channels.length !== 0) {
                    // Function to handle the channel validation
                    const isValid = await this.validateChannels(ticketId, channels);

                    if (!isValid) throw new Error("Ticket is not associated with the workflow");
                }
            }

            // Get all nodes
            const { data: nodes, error: nodesError } = await this.supabase
                .from('workflownode')
                .select('*')
                .eq('workflowId', id);

            if (nodesError) throw new Error(`Fetch failed: ${nodesError.message}`);

            // Get all edges
            const { data: edges, error: edgesError } = await this.supabase
                .from('workflowedge')
                .select('*')
                .eq('workflowId', id);

            if (edgesError) throw new Error(`Fetch failed: ${edgesError.message}`);

            // Add all the node types in an array
            const nodeTypes = nodes.map(node => node.type);

            // Get all the schemas for the node types
            const { data: schemas, error: schemasError } = await this.supabase
                .from('workflownodeschema')
                .select('*')
                .in('nodeType', nodeTypes)
                .eq('type', 'live');

            if (schemasError) throw new Error(`Fetch failed: ${schemasError.message}`);

            // Step 1: Validate the schemas before proceeding forward for each node using ajv
            const ajv = new Ajv();
            for (const node of nodes) {
                const schema = schemas.find(schema => schema.nodeType === node.type);
                if (!schema) throw new Error(`Schema not found for node type: ${node.type}`);

                const validate = ajv.compile(schema.schema);
                const valid = validate(node.config);
                if (!valid) throw new Error(`Invalid data for node type: ${node.type}`);
            }

            // Step 2: Check if the workflow contains minimum of one exit node and one trigger node
            const hasTrigger = nodes.some(n => n.isTrigger);
            const hasEnd = nodes.some(n => n.type === 'end');
            if (!hasTrigger || !hasEnd) throw new Error("Workflow must contain at least one trigger and one exit node");

            // Get all the handles for the nodes in the workflow
            const handles = [];
            for (const node of nodes) {
                const nodeHandles = await this.getWorkflowNodeHandles(node);
                handles.push({
                    id: node.id,
                    handles: nodeHandles
                });
            }

            const usedHandles = [];
            for (const edge of edges) {
                usedHandles.push(edge.reactflowSourceHandle);
                usedHandles.push(edge.reactflowTargetHandle);
            }

            const totalHandles = handles.map(handle => {
                if (handle.handles) {
                    return handle.handles;
                }
                // continue
                return [];
            }).flat();

            // Step 3: Check the used handles in the edges if there is any handle that is not used in the edges, throw an error
            for (const handle of totalHandles) {
                if (!usedHandles.includes(handle)) {
                    throw new Error("The workflow has an unused handle");
                }
            }

            // Step 4: Use DFS to check if the workflow is connected and the last nodes are exit nodes
            // 1. Create a map for node lookups
            const nodeMap = new Map(nodes.map(n => [n.reactFlowId, n]));

            // 2. Create adjacency list for handles
            const edgeMap = new Map();

            edges.forEach(edge => {
                const key = `${edge.reactflowSourceId}:${edge.reactflowSourceHandle}`;
                if (!edgeMap.has(key)) edgeMap.set(key, []);
                edgeMap.get(key).push({
                    node: edge.reactflowTargetId,
                    handle: edge.reactflowTargetHandle
                });
            });

            // 3. DFS function to validate paths
            function dfs(currentNodeId, currentHandle, path, pathSet) {
                const currentKey = `${currentNodeId}:${currentHandle}`;

                if (pathSet.has(currentKey)) {
                    throw new Error(`❌ Circular reference detected: ${path.join(' -> ')}`);
                }

                pathSet.add(currentKey); // Mark this node-handle as "in progress"
                const nextNodes = edgeMap.get(currentKey) || [];

                // If no outgoing edge, must end on an 'end' node
                if (nextNodes.length === 0) {
                    const currentNode = nodeMap.get(currentNodeId);
                    if (!currentNode || currentNode.type !== 'end') {
                        throw new Error(`❌ Dead end at non-end node: ${currentNodeId}`);
                    }
                    pathSet.delete(currentKey); // Backtrack
                    return;
                }

                // Explore next connected nodes
                for (const next of nextNodes) {
                    const nextNode = nodeMap.get(next.node);
                    if (!nextNode) {
                        throw new Error(`❌ Missing node in path: ${next.node}`);
                    }

                    dfs(next.node, next.handle, [...path, next.node], pathSet);
                }

                pathSet.delete(currentKey); // Done exploring this path
            }

            // 4. Run DFS from each trigger node and its exit handles
            const triggers = nodes.filter(n => n.isTrigger);

            for (const trigger of triggers) {
                const triggerHandles = handles.find(h => h.id === trigger.reactFlowId)?.handles || [];
                const exitHandles = triggerHandles.filter(h => h.endsWith(':exit'));

                for (const exitHandle of exitHandles) {
                    const pathSet = new Set();
                    dfs(trigger.reactFlowId, exitHandle, [trigger.reactFlowId], pathSet);
                }
            }

            return true;
        } catch (error) {
            console.log("Error in validateWorkflow()", error);
            return false;
        }
    }

    async activateWorkflow({ id, workspaceId, clientId }) {
        try {
            const isValid = await this.validateWorkflow(id, workspaceId, clientId);

            if (!isValid) throw new Error("Workflow is not valid");

            console.log("✅ Workflow is valid. No cycles or invalid dead ends.");

            // Update status of the workflow to active
            const { data: updatedWorkflow, error: updatedWorkflowError } = await this.supabase
                .from('workflow')
                .update({ status: 'live' })
                .eq('id', id)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId);

            if (updatedWorkflowError) throw new Error(`Update failed: ${updatedWorkflowError.message}`);

            return updatedWorkflow;
        } catch (error) {
            console.log("Error in activateWorkflow()", error);
            return this.handleError({
                error: true,
                message: "Workflow activation failed",
                data: error,
                httpCode: 400,
                code: "WORKFLOW_ACTIVATION_FAILED"
            });
        }
    }


    async disableWorkflow({ id, workspaceId, clientId }) {
        try {
            const { data: updatedWorkflow, error: updatedWorkflowError } = await this.supabase
                .from('workflow')
                .update({ status: 'draft' })
                .eq('id', id)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId);

            if (updatedWorkflowError) throw new Error(`Update failed: ${updatedWorkflowError.message}`);

            return updatedWorkflow;
        } catch (error) {
            console.log("Error in disableWorkflow()", error);
            return this.handleError({
                error: true,
                message: "Workflow disable failed",
                data: error,
                httpCode: 400,
                code: "WORKFLOW_DISABLE_FAILED"
            });
        }
    }

    async handleNewTicket(payload) {
        try {
            const ticketId = payload.new.id;
            const workspaceId = payload.new.workspaceId;
            const clientId = payload.new.clientId;

            if (!ticketId || !workspaceId || !clientId) {
                console.log("Invalid payload");
                return;
            }

            // Check the workspace for the client and workspace if any workflows are active for ticket_created trigger node
            const { data: workflows, error: workflowsError } = await this.supabase
                .from('workflow')
                .select('*')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .eq('status', 'live');

            if (workflowsError) throw new Error(`Fetch failed: ${workflowsError.message}`);

            if (workflows.length === 0) {
                console.log("No active workflows found");
                this.handleTicketCompleted({ id: ticketId, workspaceId: workspaceId, clientId: clientId });
                return;
            }

            let isWorkflowTriggered = false;

            for (const workflow of workflows) {
                this.checkUnresponsiveTriggerNodes(ticketId, workflow.id);
                const { data: node, error: nodesError } = await this.supabase
                    .from('workflownode')
                    .select('*')
                    .eq('workflowId', workflow.id)
                    .eq('type', 'ticket_created')
                    .is("isTrigger", true)
                    .single();

                if (node) {
                    // Validate the workflow
                    const isValid = await this.validateWorkflow(workflow.id, workspaceId, clientId, true, true, ticketId, ticketId?.customerId, null);

                    if (!isValid) {
                        console.log("Workflow is not valid, skipping");
                        continue;
                    }

                    isWorkflowTriggered = true;

                    const data = {
                        workflowId: workflow.id,
                        ticketId: ticketId,
                        contactId: payload?.new?.customerId,
                    };

                    // Find the company id of the customer if exists
                    if (ticketId?.customerId) {
                        const { data: company, error: companyError } = await this.supabase
                            .from('company')
                            .select('*')
                            .eq('id', ticketId.customerId)
                            .is('deletedAt', null)
                            .single();

                        if (company && !companyError) {
                            data["companyId"] = company.id;
                        }
                    }

                    const temporalServerUtils = TemporalServerUtils.getInstance();
                    temporalServerUtils.startWorkflow(data);
                    console.log("Found a active workflow, send to temporal")
                }
            }

            if (!isWorkflowTriggered) {
                this.handleTicketCompleted({ id: ticketId, workspaceId: workspaceId, clientId: clientId });
            }

            return;
        } catch (e) {
            console.log("Error in handleNewTicket()", e);
            return;
        }
    }

    checkUnresponsiveTriggerNodes(ticketId, workflowId) {
        try {
            console.log("Checking unresponsive trigger nodes for ticket", ticketId, "and workflow", workflowId);
            this.supabase
                .from('workflownode')
                .select('*')
                .eq('workflowId', workflowId)
                .in('type', ['customer_unresponsive', 'teammate_unresponsive'])
                .is("isTrigger", true)
                .single()
                .then(({ data: res, error: resError }) => {
                    if (res) {
                        const config = res.config;
                        const timeout = config.timeout;
                        const timeoutUnit = config.timeoutUnit;
                        const timeoutInMinutes = timeout * (timeoutUnit === 'minutes' ? 1 : timeoutUnit === 'hours' ? 60 : 1440);
                        // Insert a entry in ticketworkflowunresponsiverelation table
                        this.supabase
                            .from('ticketworkflowunresponsiverelation')
                            .insert({
                                ticketId: ticketId,
                                workflowId: workflowId,
                                workflowNodeId: res.id,
                                timeInMinutes: timeoutInMinutes,
                                typeOfUnresponsiveness: res.type === 'customer_unresponsive' ? 'customer' : 'agent'
                            })
                            .then(({ data: entry, error: entryError }) => {
                                if (entryError) throw new Error(`Insert failed: ${entryError.message}`);
                                console.log("Entry inserted", entry);
                            });

                    } else {
                        console.log("No unresponsive trigger nodes found");
                    }
                });
        } catch (e) {
            console.log("Error in checkUnresponsiveTriggerNodes()", e);
        }
    }

    getRuleBodyBasedOnField(rule, parentGroupId, workflowId) {
        const { entityType, operator, value, id } = rule;

        const ruleBody = {
            entityType,
            operator: operator.toLowerCase(),
            value,
            workflowRuleGroupId: parentGroupId,
            workflowId
        };

        if (id) ruleBody.id = id;

        switch (entityType) {
            case 'contact':
            case 'company':
            case 'ticket':
                ruleBody.standardFieldName = rule.standardFieldName;
                break;
            case 'custom_field':
                ruleBody.customFieldId = rule.customFieldId;
                break;
            case 'custom_object_field':
                ruleBody.customObjectId = rule.customObjectId;
                ruleBody.customObjectFieldId = rule.customObjectFieldId;
                break;
            default:
                throw new Error(`Unsupported entity type: ${entityType}`);
        }

        return ruleBody;
    }

    diffEntitiesById(frontendList, dbList) {
        const toCreate = frontendList.filter(f => !dbList.some(d => d.id === f.id));
        const toDelete = dbList.filter(d => !frontendList.some(f => f.id === d.id));
        const toUpdate = frontendList.filter(f => dbList.some(d => d.id === f.id));
        return { toCreate, toDelete, toUpdate };
    }


    async syncWorkflowRules(workflowRules, parentGroupId, workflowId) {
        try {
            const { data: existingRules, error: fetchError } = await this.supabase
                .from("workflowrule")
                .select("*")
                .eq("workflowId", workflowId)
                .eq("workflowRuleGroupId", parentGroupId)
                .is("deletedAt", null);

            if (fetchError) throw new Error(`Fetch rules failed: ${fetchError.message}`);

            const { toCreate, toDelete, toUpdate } = this.diffEntitiesById(workflowRules, existingRules);

            if (toDelete.length > 0) {
                await this.supabase
                    .from("workflowrule")
                    .delete()
                    .in("id", toDelete.map(r => r.id));
            }

            if (toCreate.length > 0) {
                const ruleBodies = toCreate.map(r => this.getRuleBodyBasedOnField(r, parentGroupId, workflowId));
                const { data: createdRules, error: createError } = await this.supabase.from("workflowrule").insert(ruleBodies);
                if (createError) throw new Error(`Create rules failed: ${createError.message}`);
            }

            if (toUpdate.length > 0) {
                await Promise.all(toUpdate.map(async rule => {
                    const ruleBody = this.getRuleBodyBasedOnField(rule, parentGroupId, workflowId);
                    const { error: updateError } = await this.supabase.from("workflowrule").update(ruleBody).eq("id", rule.id);
                    if (updateError) throw new Error(`Update rules failed: ${updateError.message}`);
                }));
            }

            return { message: "Rules synced" };
        } catch (e) {
            return this.handleError({
                error: true,
                message: "Rule sync failed",
                data: e,
                code: "RULE_SYNC_ERROR"
            });
        }
    }

    async syncChannels(workflowChannels, workspaceId, workflowId, clientId, createdBy) {
        try {
            const { data: existingChannels, error } = await this.supabase
                .from("workflowchannel")
                .select("*")
                .eq("workflowId", workflowId)
                .is("deletedAt", null);

            if (error) throw new Error(`Fetch channels failed: ${error.message}`);

            if (workflowChannels === null) {
                // Delete all channels in db
                await this.supabase.from("workflowchannel").delete().eq("workflowId", workflowId);
                return { message: "Channels deleted" };
            }


            const existingEmailChannels = existingChannels.filter(c => c.channelType === "email");
            const channelsToCreate = [];

            const emailToKeep = new Set();
            for (const ch of (workflowChannels.emailChannels || [])) {
                const existing = existingEmailChannels.find(c => c.id === ch.id);
                if (existing) {
                    emailToKeep.add(ch.id);
                    if (existing.emailChannelId !== ch.emailChannelId) {
                        const { error: updateError } = await this.supabase.from("workflowchannel").update({ emailChannelId: ch.emailChannelId }).eq("id", ch.id);
                        console.log("updateChannel Error", updateError);
                        if (updateError) throw new Error(`Update email channel failed: ${updateError.message}`);
                    }
                } else {
                    channelsToCreate.push({
                        channelType: "email",
                        emailChannelId: ch.emailChannelId,
                        workflowId
                    });
                }
            }

            const emailToDelete = existingEmailChannels
                .filter(c => !emailToKeep.has(c.id))
                .map(c => c.id);

            if (emailToDelete.length > 0) {
                const { error: deleteError } = await this.supabase.from("workflowchannel").delete().in("id", emailToDelete);
                console.log("delete Channel Error", deleteError);
                if (deleteError) throw new Error(`Delete email channel failed: ${deleteError.message}`);
            }

            const existingChat = existingChannels.find(c => c.channelType === "chat");
            if (workflowChannels.chatWidgetChannel) {
                if (!existingChat) {
                    const { data: widget, error: widgetError } = await this.supabase
                        .from("widget")
                        .select("*")
                        .eq("workspaceId", workspaceId)
                        .eq("clientId", clientId)
                        .is("deletedAt", null)
                        .single();

                    if (widgetError) throw new Error(`Fetch widget failed: ${widgetError.message}`);

                    channelsToCreate.push({
                        channelType: "chat",
                        widgetId: widget.id,
                        workflowId,
                    });
                }
            } else if (existingChat) {
                const { error: deleteError } = await this.supabase.from("workflowchannel").delete().eq("id", existingChat.id);
                console.log("delete Channel Error", deleteError);
                if (deleteError) throw new Error(`Delete chat channel failed: ${deleteError.message}`);
            }
            if (channelsToCreate.length > 0) {
                const { error: createError } = await this.supabase.from("workflowchannel").insert(channelsToCreate);
                console.log("create Channel Error", createError);
                if (createError) throw new Error(`Create channels failed: ${createError.message}`);
                return { message: "Channels synced" };
            }
        } catch (e) {
            console.error("Error in syncChannels()", e);
            return this.handleError({
                error: true,
                message: "Channel sync failed",
                data: e,
                httpCode: 400,
                code: "CHANNEL_SYNC_ERROR"
            });
        }
    }

    async updateWorkflowConfiguration({ id, workspaceId, clientId, createdBy, workflowConfig }) {
        try {
            const workflowId = id;
            const { workflowChannels, workflowRuleParentGroup } = workflowConfig;
            const { operator: parentGroupOperator, workflowRules, workflowChildGroups, id: parentGroupIdFromReq } = workflowRuleParentGroup || {};

            await this.syncChannels(workflowChannels, workspaceId, workflowId, clientId, createdBy);

            if (workflowRuleParentGroup === null) {
                // Delete all rule groups and rules in db
                await this.supabase.from("workflowrulegroup").delete().eq("workflowId", workflowId);
                await this.supabase.from("workflowrule").delete().eq("workflowId", workflowId);
                return { message: "Workflow configuration updated successfully" };
            }

            let parentGroupId = parentGroupIdFromReq;

            if (!parentGroupId) {
                const { error: deleteError } = await this.supabase.from("workflowrulegroup").delete().eq("workflowId", workflowId);
                if (deleteError) throw new Error(`Delete parent group failed: ${deleteError.message}`);

                const { data: parentGroup, error: parentGroupError } = await this.supabase
                    .from("workflowrulegroup")
                    .insert({ workflowId, operator: parentGroupOperator, createdBy, parentGroupId: null })
                    .select("id").single();

                if (parentGroupError) throw new Error(`Create parent group failed: ${parentGroupError.message}`);

                parentGroupId = parentGroup.id;
            }

            await this.syncWorkflowRules(workflowRules, parentGroupId, workflowId);

            // Get existing child groups
            const { data: existingGroups } = await this.supabase
                .from("workflowrulegroup")
                .select("*")
                .eq("workflowId", workflowId)
                .is("deletedAt", null);

            const childGroups = existingGroups.filter(g => g.parentGroupId === parentGroupId);

            // Check if we have any child groups with IDs in the request
            const hasChildGroupIds = workflowChildGroups.some(g => g.id);

            if (hasChildGroupIds) {
                // If we have IDs, use diff to determine what to create/update/delete
                const { toCreate, toDelete, toUpdate } = this.diffEntitiesById(workflowChildGroups, childGroups);

                if (toDelete.length > 0) {
                    const deleteIds = toDelete.map(g => g.id);
                    const { error: deleteError } = await this.supabase.from("workflowrulegroup").delete().in("id", deleteIds);
                    if (deleteError) throw new Error(`Delete child groups failed: ${deleteError.message}`);
                }

                for (const group of toCreate) {
                    const { data: createdGroup } = await this.supabase
                        .from("workflowrulegroup")
                        .insert({
                            workflowId,
                            operator: group.operator,
                            createdBy,
                            parentGroupId
                        }).select("id").single();

                    if (group.rules?.length) {
                        await this.syncWorkflowRules(group.rules, createdGroup.id, workflowId);
                    }
                }

                for (const group of toUpdate) {
                    await this.supabase
                        .from("workflowrulegroup")
                        .update({
                            operator: group.operator,
                            updatedBy: createdBy,
                            updatedAt: new Date()
                        }).eq("id", group.id);

                    if (group.rules?.length) {
                        await this.syncWorkflowRules(group.rules, group.id, workflowId);
                    }
                }
            } else {
                // If we don't have IDs, delete all existing child groups
                if (childGroups.length > 0) {
                    const deleteIds = childGroups.map(g => g.id);
                    const { error: deleteError } = await this.supabase.from("workflowrulegroup").delete().in("id", deleteIds);
                    if (deleteError) throw new Error(`Delete child groups failed: ${deleteError.message}`);
                }

                // Create all new child groups
                for (const group of workflowChildGroups) {
                    const { data: createdGroup } = await this.supabase
                        .from("workflowrulegroup")
                        .insert({
                            workflowId,
                            operator: group.operator,
                            createdBy,
                            parentGroupId
                        }).select("id").single();

                    if (group.rules?.length) {
                        await this.syncWorkflowRules(group.rules, createdGroup.id, workflowId);
                    }
                }
            }

            return { message: "Workflow configuration updated successfully" };
        } catch (e) {
            console.error("Error in updateWorkflowConfiguration()", e);
            return this.handleError({
                error: true,
                message: "Workflow configuration update failed",
                data: e,
                httpCode: 400,
                code: "WORKFLOW_CONFIGURATION_UPDATE_FAILED"
            });
        }
    }

    async getWorkflowConfiguration(id, workspaceId, clientId) {
        try {
            //  Get workflow details
            const { data: workflow, error: workflowError } = await this.supabase.from("workflow").select("*").eq("workspaceId", workspaceId).eq("clientId", clientId).eq("id", id).is("deletedAt", null).single();
            if (workflowError) throw new Error(`Fetch workflow failed: ${workflowError.message}`);

            // Get the workflow channels
            const { data: channels, error: channelsError } = await this.supabase.from("workflowchannel").select("*").eq("workflowId", workflow.id).is("deletedAt", null);

            // Get the workflow groups
            const { data: groups, error: groupsError } = await this.supabase.from("workflowrulegroup").select("*").eq("workflowId", workflow.id).is("deletedAt", null);

            if (groupsError) throw new Error(`Fetch groups failed: ${groupsError.message}`);
            if (groups.length === 0) {
                return {
                    channels,
                    rules: []
                }
            }

            // Get the workflow rules
            const { data: rules, error: rulesError } = await this.supabase.from("workflowrule").select("*").eq("workflowId", workflow.id).is("deletedAt", null);
            if (rulesError) throw new Error(`Fetch rules failed: ${rulesError.message}`);

            // Group the childGroups within the parent group
            const parentGroup = groups.filter(group => group.parentGroupId === null);
            const childGroups = groups.filter(group => group.parentGroupId !== null);

            //  IF parsed rules contains custom_field or custom_object_field, then we need to get the custom fields and custom object fields
            const customFields = rules.filter(rule => rule.entityType === "custom_field").map(rule => rule.customFieldId);
            const customObjectFields = rules.filter(rule => rule.entityType === "custom_object_field").map(rule => rule.customObjectId);

            //  Get the custom fields and custom object fields
            const { data: customFieldsData, error: customFieldsError } = await this.supabase.from("customfields").select("*").in("id", customFields).is("deletedAt", null);
            const { data: customObjectFieldsData, error: customObjectFieldsError } = await this.supabase.from("customobjectfields").select("*").in("id", customObjectFields).is("deletedAt", null);

            // Add the custom fields and custom object field data to the mapped rules
            const mappedRules = rules.map(rule => {
                if (rule.entityType === "custom_field") {
                    rule.customFieldData = customFieldsData.find(field => field.id === rule.customFieldId);
                } else if (rule.entityType === "custom_object_field") {
                    rule.customObjectFieldData = customObjectFieldsData.find(field => field.id === rule.customObjectId);
                }
                return rule;
            });

            const parsedRules = {
                ...parentGroup[0],
                rules: [
                    ...mappedRules.filter(rule => rule.workflowRuleGroupId === parentGroup[0].id),
                    ...childGroups.map(group => ({
                        ...group,
                        rules: mappedRules.filter(rule => rule.workflowRuleGroupId === group.id)
                    }))
                ]
            };



            return {
                channels,
                rules: parsedRules
            }

        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    async getWorkflowRuleFields(workspaceId, clientId) {
        try {
            // Define standard tables and their fields
            const standardTables = [
                {
                    name: "contact",
                    fields: [
                        {
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
                    name: "company",
                    fields: [
                        {
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
                            entityType: "company",
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
                {
                    name: "ticket",
                    fields: [
                        {
                            entityType: "ticket",
                            columnname: "summary",
                            label: "Summary",
                            type: "text",
                            placeholder: "Enter summary",
                            table: "ticket"
                        }
                    ]
                }
            ];

            // Fetch and process custom fields
            const { data: customFields, error: customFieldsError } = await this.supabase
                .from("customfields")
                .select("*")
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .is("deletedAt", null);

            if (customFieldsError) {
                throw new errors.Internal(customFieldsError.message);
            }

            // Group custom fields by entity type
            const customFieldsByType = customFields.reduce((acc, field) => {
                if (!acc[field.entityType]) {
                    acc[field.entityType] = [];
                }
                acc[field.entityType].push({
                    entityType: "custom_field",
                    columnname: field.id,
                    label: field.name,
                    type: field.fieldType,
                    options: field.options,
                    placeholder: field.placeholder,
                    table: field.entityType
                });
                return acc;
            }, {});

            // Add custom fields to their respective tables
            standardTables.forEach(table => {
                const customFieldsForTable = customFieldsByType[table.name] || [];
                table.fields.push(...customFieldsForTable);
            });

            // Fetch and process custom objects
            const { data: customObjects, error: customObjectsError } = await this.supabase
                .from("customobjects")
                .select("*")
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .is("deletedAt", null)
                .order("createdAt", { ascending: false });

            if (customObjectsError) {
                throw new errors.Internal(customObjectsError.message);
            }

            if (customObjects.length === 0) {
                return { tables: standardTables };
            }

            // Fetch custom object fields
            const customObjectIds = customObjects.map(obj => obj.id);
            const { data: customObjectFieldsData, error: customObjectFieldsError } = await this.supabase
                .from("customobjectfields")
                .select("*")
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .in("customObjectId", customObjectIds)
                .is("deletedAt", null)
                .order("createdAt", { ascending: false });

            if (customObjectFieldsError) {
                throw new errors.Internal(customObjectFieldsError.message);
            }

            // Map id with name of custom object to avoid using find 
            const customObjectMap = customObjects.reduce((acc, customObject) => {
                acc[customObject.id] = customObject.name;
                return acc;
            }, {});

            // Group custom object fields by their custom object
            const fieldsByCustomObject = customObjectFieldsData.reduce((acc, field) => {
                if (!acc[field.customObjectId]) {
                    acc[field.customObjectId] = [];
                }
                acc[field.customObjectId].push({
                    entityType: "custom_object_field",
                    columnname: field.id,
                    label: field.name,
                    type: field.fieldType,
                    options: field.options,
                    placeholder: field.placeholder,
                    table: customObjectMap[field.customObjectId]
                });
                return acc;
            }, {});

            // Create custom object tables
            const customObjectTables = customObjects.map(customObject => ({
                id: customObject.id,
                name: customObject.name,
                fields: fieldsByCustomObject[customObject.id] || []
            }));

            // Combine standard tables with custom object tables
            const tables = [...standardTables, ...customObjectTables];

            return { tables };
        } catch (error) {
            console.error("Error in getWorkflowRuleFields:", error);
            throw error;
        }
    }

    async getWorkflowReusableNodes(workspaceId, clientId) {
        try {
            // Get all workflows for the workspace
            const {
                data: workflows,
                error: workflowsError
            } = await this.supabase.from("workflow").select("*").eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null);

            if (workflowsError) {
                throw new errors.Internal(workflowsError.message);
            }

            // Map the workflow ids in an array
            const workflowIds = workflows.map(workflow => workflow.id);

            // Get all reusable nodes for the workspace
            const {
                data: reusableNodes,
                error: reusableNodesError
            } = await this.supabase.from("workflownode").select("*").eq("type", "reusable_workflow").in("workflowId", workflowIds);

            if (reusableNodesError) {
                throw new errors.Internal(reusableNodesError.message);
            };

            // Get schema for reusable_workflow node
            const { data: getTriggerNodeSchema, error: getTriggerNodeSchemaError } = await this.supabase
                .from('workflownodeschema')
                .select('*')
                .eq('nodeType', "reusable_workflow")
                .eq('type', 'live')
                .single();

            if (getTriggerNodeSchemaError) {
                throw new errors.Internal(getTriggerNodeSchemaError.message);
            }

            let validNodes = [];

            // Validate all the nodes using ajv
            const ajv = new Ajv();
            for (const node of reusableNodes) {
                const schema = getTriggerNodeSchema;
                if (!schema) throw new Error(`Schema not found for node type: ${node.type}`);

                const validate = ajv.compile(schema.schema);
                const valid = validate(node?.config);
                if (valid) {
                    validNodes.push({
                        id: node.id,
                        branchName: node?.config?.branchName
                    });
                }
            }

            return validNodes;

        } catch (e) {
            console.error("Error in getWorkflowReusableNodes:", e);
            return this.handleError({
                error: true,
                message: "Error in getWorkflowReusableNodes",
                data: e,
                httpCode: 500,
                code: "WORKFLOW_REUSABLE_NODES_ERROR"
            });
        }
    }

    async handleNewConversation(payload) {
        try {
            const ticketId = payload.new.ticketId;
            const workspaceId = payload.new.workspaceId;
            const clientId = payload.new.clientId;
            const userType = payload.new.userType;

            if (userType !== 'customer') {
                console.log("Not a customer message, skipping");
                return;
            }

            // Check the workspace for the client and workspace if any workflows are active for customer_message trigger node
            const { data: workflows, error: workflowsError } = await this.supabase
                .from('workflow')
                .select('*')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .eq('status', 'live');

            if (workflowsError) throw new Error(`Fetch failed: ${workflowsError.message}`);

            if (workflows.length === 0) {
                console.log("No active workflows found");
                return;
            }

            for (const workflow of workflows) {
                const { data: node, error: nodesError } = await this.supabase
                    .from('workflownode')
                    .select('*')
                    .eq('workflowId', workflow.id)
                    .eq('type', 'customer_message')
                    .is("isTrigger", true)
                    .single();

                if (node) {
                    // Validate the workflow
                    const isValid = await this.validateWorkflow(workflow.id, workspaceId, clientId, true, true, ticketId, null, null);

                    if (!isValid) {
                        console.log("Workflow is not valid, skipping");
                        continue;
                    }

                    const data = {
                        workflowId: workflow.id,
                        ticketId: ticketId,
                        contactId: payload?.new?.customerId,
                    };

                    // Find the company id of the customer if exists
                    if (ticketId?.customerId) {
                        const { data: company, error: companyError } = await this.supabase
                            .from('company')
                            .select('*')
                            .eq('id', ticketId.customerId)
                            .is('deletedAt', null)
                            .single();

                        if (company && !companyError) {
                            data["companyId"] = company.id;
                        }
                    }

                    const temporalServerUtils = TemporalServerUtils.getInstance();
                    temporalServerUtils.startWorkflow(data);
                    console.log("Found a active workflow, send to temporal")
                }
            }

            return;
        } catch (e) {
            console.log("Error in handleNewConversation()", e);
            return;
        }
    }

    async handleNewNoteAddedToConversation(payload) {
        try {
            const ticketId = payload.new.ticketId;
            const workspaceId = payload.new.workspaceId;
            const clientId = payload.new.clientId;

            // Check the workspace for the client and workspace if any workflows are active for note_added trigger node
            const { data: workflows, error: workflowsError } = await this.supabase
                .from('workflow')
                .select('*')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .eq('status', 'live');

            if (workflowsError) throw new Error(`Fetch failed: ${workflowsError.message}`);

            if (workflows.length === 0) {
                console.log("No active workflows found");
                return;
            }

            for (const workflow of workflows) {
                const { data: node, error: nodesError } = await this.supabase
                    .from('workflownode')
                    .select('*')
                    .eq('workflowId', workflow.id)
                    .eq('type', 'note_added')
                    .is("isTrigger", true)
                    .single();

                if (node) {
                    // Validate the workflow
                    const isValid = await this.validateWorkflow(workflow.id, workspaceId, clientId, true, true, ticketId, null, null);

                    if (!isValid) {
                        console.log("Workflow is not valid, skipping");
                        continue;
                    }

                    const data = {
                        workflowId: workflow.id,
                        ticketId: ticketId,
                        contactId: payload?.new?.customerId,
                    };

                    // Find the company id of the customer if exists
                    if (ticketId?.customerId) {
                        const { data: company, error: companyError } = await this.supabase
                            .from('company')
                            .select('*')
                            .eq('id', ticketId.customerId)
                            .is('deletedAt', null)
                            .single();

                        if (company && !companyError) {
                            data["companyId"] = company.id;
                        }
                    }

                    const temporalServerUtils = TemporalServerUtils.getInstance();
                    temporalServerUtils.startWorkflow(data);
                    console.log("Found a active workflow, send to temporal")
                }
            }

            return;
        } catch (e) {
            console.log("Error in handleNewNoteAddedToConversation()", e);
            return;
        }
    }

    async handleTicketReassigned(payload) {
        try {
            const ticketId = payload.new.id;
            const workspaceId = payload.new.workspaceId;
            const clientId = payload.new.clientId;
            const oldAssignedTo = payload.old.assignedTo;
            const newAssignedTo = payload.new.assignedTo;

            // Check the workspace for the client and workspace if any workflows are active for assign_ticket trigger node
            const { data: workflows, error: workflowsError } = await this.supabase
                .from('workflow')
                .select('*')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .eq('status', 'live');

            if (workflowsError) throw new Error(`Fetch failed: ${workflowsError.message}`);

            if (workflows.length === 0) {
                console.log("No active workflows found");
                return;
            }

            for (const workflow of workflows) {
                const { data: node, error: nodesError } = await this.supabase
                    .from('workflownode')
                    .select('*')
                    .eq('workflowId', workflow.id)
                    .eq('type', 'assign_ticket')
                    .is("isTrigger", true)
                    .single();

                if (node) {
                    // Validate the workflow
                    const isValid = await this.validateWorkflow(workflow.id, workspaceId, clientId, true, true, ticketId, null, null);

                    if (!isValid) {
                        console.log("Workflow is not valid, skipping");
                        continue;
                    }
                    const data = {
                        workflowId: workflow.id,
                        ticketId: ticketId,
                        contactId: payload?.new?.customerId,
                    };

                    // Find the company id of the customer if exists
                    if (ticketId?.customerId) {
                        const { data: company, error: companyError } = await this.supabase
                            .from('company')
                            .select('*')
                            .eq('id', ticketId.customerId)
                            .is('deletedAt', null)
                            .single();

                        if (company && !companyError) {
                            data["companyId"] = company.id;
                        }
                    }

                    const temporalServerUtils = TemporalServerUtils.getInstance();
                    temporalServerUtils.startWorkflow(data);
                    console.log("Found a active workflow, send to temporal")
                }
            }

            return;
        } catch (e) {
            console.log("Error in handleTicketReassigned()", e);
            return;
        }
    }

    async handleTicketDataChanged(payload) {
        try {
            const ticketId = payload.new.id;
            const workspaceId = payload.new.workspaceId;
            const clientId = payload.new.clientId;

            // Check the workspace for the client and workspace if any workflows are active for data_change trigger node
            const { data: workflows, error: workflowsError } = await this.supabase
                .from('workflow')
                .select('*')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .eq('status', 'live');

            if (workflowsError) throw new Error(`Fetch failed: ${workflowsError.message}`);

            if (workflows.length === 0) {
                console.log("No active workflows found");
                return;
            }

            for (const workflow of workflows) {
                const { data: node, error: nodesError } = await this.supabase
                    .from('workflownode')
                    .select('*')
                    .eq('workflowId', workflow.id)
                    .eq('type', 'data_change')
                    .is("isTrigger", true)
                    .single();

                if (node) {
                    // Need to check here if the data changed in the workflow payload matches the data change node config
                    const config = node.config;
                    const newData = payload.new;
                    const oldData = payload.old;
                    const dataChanged = Object.keys(newData).filter(key => newData[key] !== oldData[key]);

                    // Compare both arrays and check if we have any common values
                    const ticketConfigFields = config?.fields?.filter(field => field.table === "ticket");
                    const isTriggerValid = ticketConfigFields.length > 0 && dataChanged.some(item => ticketConfigFields.map(field => field.field).includes(item));

                    if (!isTriggerValid) {
                        console.log("Workflow is not valid, skipping");
                        return;
                    }

                    // Validate the workflow
                    const isValid = await this.validateWorkflow(workflow.id, workspaceId, clientId, true, true, ticketId, null, null);

                    if (!isValid) {
                        console.log("Workflow is not valid, skipping");
                        continue;
                    }
                    const data = {
                        workflowId: workflow.id,
                        ticketId: ticketId,
                        contactId: payload?.new?.customerId,
                    };

                    // Find the company id of the customer if exists
                    if (ticketId?.customerId) {
                        const { data: company, error: companyError } = await this.supabase
                            .from('company')
                            .select('*')
                            .eq('id', ticketId.customerId)
                            .is('deletedAt', null)
                            .single();

                        if (company && !companyError) {
                            data["companyId"] = company.id;
                        }
                    }

                    const temporalServerUtils = TemporalServerUtils.getInstance();
                    temporalServerUtils.startWorkflow(data);
                    console.log("Found a active workflow, send to temporal")
                }
            }

            return;
        } catch (e) {
            console.log("Error in handleTicketReassigned()", e);
            return;
        }
    }

    async handleCustomFieldDataChanged(payload) {
        try {
            const customFieldId = payload.new.customfieldId;

            // Fetch custom field for the custom field id
            const { data: customField, error: customFieldError } = await this.supabase
                .from('customfields')
                .select('id, workspaceId, clientId')
                .eq('id', customFieldId)
                .single();

            if (customFieldError) throw new Error(`Fetch failed: ${customFieldError.message}`);

            if (!customField) {
                console.log("Custom field not found");
                return;
            }

            const workspaceId = customField.workspaceId;
            const clientId = customField.clientId;

            // Check the workspace for the client and workspace if any workflows are active for data_change trigger node
            const { data: workflows, error: workflowsError } = await this.supabase
                .from('workflow')
                .select('*')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .eq('status', 'live');

            if (workflowsError) throw new Error(`Fetch failed: ${workflowsError.message}`);

            if (workflows.length === 0) {
                console.log("No active workflows found");
                return;
            }

            for (const workflow of workflows) {
                const { data: node, error: nodesError } = await this.supabase
                    .from('workflownode')
                    .select('*')
                    .eq('workflowId', workflow.id)
                    .eq('type', 'data_change')
                    .is("isTrigger", true)
                    .single();

                if (node) {
                    // Need to check here if the data changed in the workflow payload matches the data change node config
                    const config = node.config;
                    const tableName = payload.new?.entityType || "";

                    // Compare both arrays and check if we have any common values
                    const customFieldConfigFields = config?.fields?.filter(field => field.table === tableName);
                    const isTriggerValid = customFieldConfigFields.length > 0 && customFieldConfigFields.map(field => field.customFieldId).includes(customFieldId);

                    if (!isTriggerValid) {
                        console.log("Workflow is not valid, skipping");
                        return;
                    }

                    // Validate the workflow
                    const isValid = await this.validateWorkflow(workflow.id, workspaceId, clientId, true, true, payload?.new?.ticketId || null, payload?.new?.contactId || null, payload?.new?.companyId || null);

                    if (!isValid) {
                        console.log("Workflow is not valid, skipping");
                        continue;
                    }
                    console.log("Found a active workflow, send to temporal")
                }
            }

            return;
        } catch (e) {
            console.log("Error in handleCustomFieldDataChanged()", e);
            return;
        }
    }

    async handleCustomObjectFieldDataChanged(payload) {
        try {
            const customObjectFieldId = payload.new.customObjectFieldId;

            // Fetch custom object field for the custom object field id
            const { data: customObjectField, error: customObjectFieldError } = await this.supabase
                .from('customobjectfields')
                .select('id, workspaceId, clientId, customobjects!customobjecfields_customObjectId_fkey(id, name, connectionType)')
                .eq('id', customObjectFieldId)
                .single();

            if (customObjectFieldError) throw new Error(`Fetch failed: ${customObjectFieldError.message}`);

            if (!customObjectField) {
                console.log("Custom object field not found");
                return;
            }

            const workspaceId = customObjectField.customobjects.workspaceId;
            const clientId = customObjectField.customobjects.clientId;

            // Check the workspace for the client and workspace if any workflows are active for data_change trigger node
            const { data: workflows, error: workflowsError } = await this.supabase
                .from('workflow')
                .select('*')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .eq('status', 'live');

            if (workflowsError) throw new Error(`Fetch failed: ${workflowsError.message}`);

            if (workflows.length === 0) {
                console.log("No active workflows found");
                return;
            }

            for (const workflow of workflows) {
                const { data: node, error: nodesError } = await this.supabase
                    .from('workflownode')
                    .select('*')
                    .eq('workflowId', workflow.id)
                    .eq('type', 'data_change')
                    .is("isTrigger", true)
                    .single();

                if (node) {
                    // Need to check here if the data changed in the workflow payload matches the data change node config
                    const config = node.config;
                    const tableName = payload.new?.entityType || "";

                    // Compare both arrays and check if we have any common values
                    const customObjectFields = config?.fields?.filter(field => field.table === "custom_object");
                    const isTriggerValid = customObjectFields.length > 0 && customObjectFields.map(field => field.customObjectFieldId).includes(customObjectFieldId);

                    if (!isTriggerValid) {
                        console.log("Workflow is not valid, skipping");
                        return;
                    }

                    // Validate the workflow
                    const isValid = await this.validateWorkflow(workflow.id, workspaceId, clientId, true, true, payload?.new?.ticketId || null, payload?.new?.contactId || null, payload?.new?.companyId || null);

                    if (!isValid) {
                        console.log("Workflow is not valid, skipping");
                        continue;
                    }
                    console.log("Found a active workflow, send to temporal")
                }
            }

            return;
        } catch (e) {
            console.log("Error in handleCustomObjectFieldDataChanged()", e);
            return;
        }
    }

    async handleCustomerDataChanged(payload) {
        try {
            const contactId = payload.new.id;
            const workspaceId = payload.new.workspaceId;
            const clientId = payload.new.clientId;

            // Check the workspace for the client and workspace if any workflows are active for data_change trigger node
            const { data: workflows, error: workflowsError } = await this.supabase
                .from('workflow')
                .select('*')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .eq('status', 'live');

            if (workflowsError) throw new Error(`Fetch failed: ${workflowsError.message}`);

            if (workflows.length === 0) {
                console.log("No active workflows found");
                return;
            }

            for (const workflow of workflows) {
                const { data: node, error: nodesError } = await this.supabase
                    .from('workflownode')
                    .select('*')
                    .eq('workflowId', workflow.id)
                    .eq('type', 'data_change')
                    .is("isTrigger", true)
                    .single();

                if (node) {
                    // Need to check here if the data changed in the workflow payload matches the data change node config
                    const config = node.config;
                    const newData = payload.new;
                    const oldData = payload.old;
                    const dataChanged = Object.keys(newData).filter(key => newData[key] !== oldData[key]);

                    // Compare both arrays and check if we have any common values
                    const contactConfigFields = config?.fields?.filter(field => field.table === "contact");
                    const isTriggerValid = contactConfigFields.length > 0 && dataChanged.some(item => contactConfigFields.map(field => field.field).includes(item));

                    if (!isTriggerValid) {
                        console.log("Workflow is not valid, skipping");
                        return;
                    }

                    // Validate the workflow
                    const isValid = await this.validateWorkflow(workflow.id, workspaceId, clientId, true, true, null, contactId, null);

                    if (!isValid) {
                        console.log("Workflow is not valid, skipping");
                        continue;
                    }
                    const data = {
                        workflowId: workflow.id,
                        ticketId: null,
                        contactId: contactId,
                    };

                    // Find the company id of the customer if exists
                    if (payload?.new?.companyId) {
                        data["companyId"] = payload?.new?.companyId;
                    }

                    const temporalServerUtils = TemporalServerUtils.getInstance();
                    temporalServerUtils.startWorkflow(data);
                    console.log("Found a active workflow, send to temporal")
                }
            }

            return;
        } catch (e) {
            console.log("Error in handleCustomerDataChanged()", e);
            return;
        }
    }

    async handleCompanyDataChanged(payload) {
        try {
            const companyId = payload.new.id;
            const workspaceId = payload.new.workspaceId;
            const clientId = payload.new.clientId;

            // Check the workspace for the client and workspace if any workflows are active for data_change trigger node
            const { data: workflows, error: workflowsError } = await this.supabase
                .from('workflow')
                .select('*')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .eq('status', 'live');

            if (workflowsError) throw new Error(`Fetch failed: ${workflowsError.message}`);

            if (workflows.length === 0) {
                console.log("No active workflows found");
                return;
            }

            for (const workflow of workflows) {
                const { data: node, error: nodesError } = await this.supabase
                    .from('workflownode')
                    .select('*')
                    .eq('workflowId', workflow.id)
                    .eq('type', 'data_change')
                    .is("isTrigger", true)
                    .single();

                if (node) {
                    // Need to check here if the data changed in the workflow payload matches the data change node config
                    const config = node.config;
                    const newData = payload.new;
                    const oldData = payload.old;
                    const dataChanged = Object.keys(newData).filter(key => newData[key] !== oldData[key]);

                    // Compare both arrays and check if we have any common values
                    const companyConfigFields = config?.fields?.filter(field => field.table === "company");
                    const isTriggerValid = companyConfigFields.length > 0 && dataChanged.some(item => companyConfigFields.map(field => field.field).includes(item));

                    if (!isTriggerValid) {
                        console.log("Workflow is not valid, skipping");
                        return;
                    }

                    // Validate the workflow
                    const isValid = await this.validateWorkflow(workflow.id, workspaceId, clientId, true, true, null, null, companyId);

                    if (!isValid) {
                        console.log("Workflow is not valid, skipping");
                        continue;
                    }
                    const data = {
                        workflowId: workflow.id,
                        ticketId: null,
                        contactId: null,
                        companyId: companyId,
                    };


                    const temporalServerUtils = TemporalServerUtils.getInstance();
                    temporalServerUtils.startWorkflow(data);
                    console.log("Found a active workflow, send to temporal")
                }
            }

            return;
        } catch (e) {
            console.log("Error in handleCompanyDataChanged()", e);
            return;
        }
    }

    async handleChatTicketReassigned(payload) {
        try {
            const ticketId = payload.new.id;
            const workspaceId = payload.new.workspaceId;
            const clientId = payload.new.clientId;
            const assignedTo = payload.new.assignedTo;

            // Fetch the user from user table to get the name of the user
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .select('name')
                .eq('id', assignedTo)
                .single();

            if (userError) throw new Error(`Fetch failed at handleChatTicketReassigned(): ${userError.message}`);

            if (!user) {
                console.log("User not found");
                return;
            }

            console.log("User found", user);

            const senderName = user && user?.name || "System";

            const { data: conversationDataInsert, error: conversationErrorInsert } = await this.supabase
                .from('conversations').insert({
                    message: "Ticket reassigned to " + senderName,
                    type: 'chat',
                    ticketId,
                    senderName: senderName,
                    clientId: clientId,
                    userType: "system-notice",
                    workspaceId: workspaceId,
                    messageType: "text",
                    senderType: "system-notice",
                }).select('id').single();

            if (conversationErrorInsert) {
                console.error('Error saving conversation at handleChatTicketReassigned():', conversationErrorInsert);
                return;
            }

            const ably = new Ably.Rest(process.env.ABLY_API_KEY);
            const ch = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
            await ch.publish('message_reply', {
                ticketId: ticketId,
                id: conversationDataInsert && conversationDataInsert.id,
                message: "Ticket reassigned to " + senderName,
                type: "system-notice",
                senderType: "system-notice",
                messageType: "text"
            });

            return;
        } catch (e) {
            console.log("Error in handleChatTicketReassigned()", e);
            return;
        }
    }


    async checkUnresponsiveness() {
        try {
            // Fetch the ticket ids and workflow ids from the table
            const { data: ticketWorkflowUnresponsiveRelation, error: ticketWorkflowUnresponsiveRelationError } = await this.supabase
                .from('ticketworkflowunresponsiverelation')
                .select('*');

            if (ticketWorkflowUnresponsiveRelationError) throw new Error(`Fetch failed: ${ticketWorkflowUnresponsiveRelationError.message}`);

            if (ticketWorkflowUnresponsiveRelation.length === 0) {
                console.log("No unresponsiveness found");
                return;
            }

            console.log("Ticket workflow unresponsiveness relation", ticketWorkflowUnresponsiveRelation);

            // Check the tickets that have to be checked for unresponsiveness
            let ticketsToCheck = ticketWorkflowUnresponsiveRelation.filter((item) => {
                const lastCheckTime = new Date(item.lastCheckTime).getTime(); //Timestampz
                const timeInMinutes = item.timeInMinutes; // Time in minutes to wait for 
                const now = Date.now(); // Current timestamp
                const timeDiff = now - lastCheckTime; // Time difference in milliseconds
                console.log("Time difference", timeDiff);
                console.log("Time in minutes", timeInMinutes);
                console.log("Now", now);
                console.log("Last check time", lastCheckTime);
                return timeDiff >= timeInMinutes * 60 * 1000; // Check if the time difference is greater than the time in minutes
            });

            if (ticketsToCheck.length === 0) {
                console.log("No tickets to check");
                return;
            }

            console.log("Tickets to check", ticketsToCheck);

            // Filter out all the tickets which have been closed and delete them from db as well
            const { data: closedTickets, error: closedTicketsError } = await this.supabase
                .from('tickets')
                .select('*')
                .in('id', ticketsToCheck.map((item) => item.ticketId))
                .eq('status', 'closed');

            if (closedTicketsError) throw new Error(`Fetch failed: ${closedTicketsError.message}`);

            console.log("Closed tickets", closedTickets);

            // Delete the closed tickets from the ticketsToCheck array
            ticketsToCheck = ticketsToCheck.filter((item) => !closedTickets.some((closedTicket) => closedTicket.id === item.ticketId));

            // Delete the closed tickets from the ticketWorkflowUnresponsiveRelation array
            const { data: deletedClosedTickets, error: deletedClosedTicketsError } = await this.supabase
                .from('ticketworkflowunresponsiverelation')
                .delete()
                .in('ticketId', closedTickets.map((item) => item.id));

            if (deletedClosedTicketsError) throw new Error(`Delete failed: ${deletedClosedTicketsError.message}`);
            console.log("Deleted closed tickets", deletedClosedTickets);

            // Divide tickets into the one for customer unresponsiveness and the one for teammate unresponsiveness
            const customerUnresponsivenessTickets = ticketsToCheck.filter((item) => item.typeOfUnresponsiveness === 'customer');
            const teammateUnresponsivenessTickets = ticketsToCheck.filter((item) => item.typeOfUnresponsiveness === 'agent');

            console.log("Customer unresponsiveness tickets", customerUnresponsivenessTickets);
            console.log("Teammate unresponsiveness tickets", teammateUnresponsivenessTickets);

            // now get all last message of customer and agent
            if (customerUnresponsivenessTickets.length > 0) {
                for (const ticket of customerUnresponsivenessTickets) {
                    // Fetch last message of customer
                    const { data: customerLastMessages, error: customerLastMessageError } = await this.supabase
                        .from('conversations')
                        .select('*')
                        .eq('ticketId', ticket.ticketId)
                        .eq('userType', 'customer')
                        .order('createdAt', { ascending: false })
                        .limit(1)
                        .single();

                    if (customerLastMessageError) throw new Error(`Fetch failed: ${customerLastMessageError.message}`);

                    console.log("Customer last message", customerLastMessages);

                    // Check if the last message is older than the time in minutes
                    if (Date.now() - new Date(customerLastMessages.createdAt).getTime() > ticket.timeInMinutes * 60 * 1000) {
                        console.log("Customer last message is older than the time in minutes");
                        // Delete the ticket from the ticketWorkflowUnresponsiveRelation array
                        const { data: deletedTicket, error: deletedTicketError } = await this.supabase
                            .from('ticketworkflowunresponsiverelation')
                            .delete()
                            .eq('ticketId', ticket.ticketId)
                            .eq('typeOfUnresponsiveness', 'customer');

                        if (deletedTicketError) throw new Error(`Delete failed: ${deletedTicketError.message}`);
                        console.log("Deleted ticket", deletedTicket);

                        // Fetch the ticket from db
                        const { data: ticketData, error: ticketDataError } = await this.supabase
                            .from('tickets')
                            .select('*')
                            .eq('id', ticket.ticketId)
                            .single();

                        if (ticketDataError) throw new Error(`Fetch failed: ${ticketDataError.message}`);

                        const isValid = await this.validateWorkflow(ticket.workflowId, ticketData.workspaceId, ticketData.clientId, true, true, ticket.ticketId, null, null);

                        if (!isValid) {
                            console.log("Workflow is not valid, skipping");
                            continue;
                        }

                        const data = {
                            workflowId: workflow.id,
                            ticketId: ticket.ticketId,
                            contactId: ticketData?.customerId,
                        };

                        // Find the company id of the customer if exists
                        if (ticketData?.customerId) {
                            const { data: company, error: companyError } = await this.supabase
                                .from('company')
                                .select('*')
                                .eq('id', ticketData.customerId)
                                .is('deletedAt', null)
                                .single();

                            if (company && !companyError) {
                                data["companyId"] = company.id;
                            }
                        }

                        const temporalServerUtils = TemporalServerUtils.getInstance();
                        temporalServerUtils.startWorkflow(data);
                        console.log("Found a active workflow, send to temporal");
                    } else {
                        // Update the last check time
                        const { data: updatedTicket, error: updatedTicketError } = await this.supabase
                            .from('ticketworkflowunresponsiverelation')
                            .update({ lastCheckTime: 'now()' }) // Use postgres now() function to get the current timestamp
                            .eq('ticketId', ticket.ticketId)
                            .eq('typeOfUnresponsiveness', 'customer');

                        if (updatedTicketError) throw new Error(`Update failed: ${updatedTicketError.message}`);
                        console.log("Updated last check time", updatedTicket);
                    }
                }
            }

            if (teammateUnresponsivenessTickets.length > 0) {
                for (const ticket of teammateUnresponsivenessTickets) {
                    // Fetch last message of customer
                    const { data: agentLastMessages, error: agentLastMessageError } = await this.supabase
                        .from('conversations')
                        .select('*')
                        .eq('ticketId', ticket.ticketId)
                        .eq('userType', 'agent')
                        .order('createdAt', { ascending: false })
                        .limit(1)
                        .single();

                    if (agentLastMessageError) throw new Error(`Fetch failed: ${agentLastMessageError.message}`);

                    console.log("Agent last message", agentLastMessages);

                    // Check if the last message is older than the time in minutes
                    if (Date.now() - new Date(agentLastMessages.createdAt).getTime() > ticket.timeInMinutes * 60 * 1000) {
                        console.log("Agent last message is older than the time in minutes");

                        // Delete the ticket from the ticketWorkflowUnresponsiveRelation array
                        const { data: deletedTicket, error: deletedTicketError } = await this.supabase
                            .from('ticketworkflowunresponsiverelation')
                            .delete()
                            .eq('ticketId', ticket.ticketId)
                            .eq('typeOfUnresponsiveness', 'agent');

                        if (deletedTicketError) throw new Error(`Delete failed: ${deletedTicketError.message}`);
                        console.log("Deleted ticket", deletedTicket);

                        // Fetch the ticket from db
                        const { data: ticketData, error: ticketDataError } = await this.supabase
                            .from('tickets')
                            .select('*')
                            .eq('id', ticket.ticketId)
                            .single();

                        if (ticketDataError) throw new Error(`Fetch failed: ${ticketDataError.message}`);

                        const isValid = await this.validateWorkflow(ticket.workflowId, ticketData.workspaceId, ticketData.clientId, true, true, ticket.ticketId, null, null);

                        if (!isValid) {
                            console.log("Workflow is not valid, skipping");
                            continue;
                        }

                        const data = {
                            workflowId: workflow.id,
                            ticketId: ticket.ticketId,
                            contactId: ticketData?.customerId,
                        };

                        // Find the company id of the customer if exists
                        if (ticketData?.customerId) {
                            const { data: company, error: companyError } = await this.supabase
                                .from('company')
                                .select('*')
                                .eq('id', ticketData.customerId)
                                .is('deletedAt', null)
                                .single();

                            if (company && !companyError) {
                                data["companyId"] = company.id;
                            }
                        }

                        const temporalServerUtils = TemporalServerUtils.getInstance();
                        temporalServerUtils.startWorkflow(data);
                        console.log("Found a active workflow, send to temporal");
                    } else {
                        // Update the last check time
                        const { data: updatedTicket, error: updatedTicketError } = await this.supabase
                            .from('ticketworkflowunresponsiverelation')
                            .update({ lastCheckTime: 'now()' }) // Use postgres now() function to get the current timestamp
                            .eq('ticketId', ticket.ticketId)
                            .eq('typeOfUnresponsiveness', 'agent');

                        if (updatedTicketError) throw new Error(`Update failed: ${updatedTicketError.message}`);
                        console.log("Updated last check time", updatedTicket);
                    }
                }
            }

        } catch (e) {
            console.log("Error in checkUnresponsiveness()", e);
            return;
        }
    }
}

module.exports = WorkflowService;
