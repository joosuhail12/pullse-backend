const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const { v4: uuid } = require("uuid");
const Ajv = require('ajv');
class WorkflowService extends BaseService {
    constructor() {
        super();
        this.entityName = 'Workflow';
        this.listingFields = ["id", "name", "description", "status", "affectedTicketsCount"];
        this.updatableFields = ["name", "summary", "description", "status", "ruleIds", "actionIds", "lastUpdatedBy"];
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
                .select()
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
                .select('*')
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

            // Create entry in workflownode table
            const { data: workflownodeData, error: workflownodeError } = await this.supabase
                .from('workflownode')
                .insert({ workflowId: workflowId, type: triggerType, isTrigger: true, positionX: triggerPosition.positionX, positionY: triggerPosition.positionY, reactFlowId: nodeId, schemaVersion: getTriggerNodeSchema.schemaVersion, config: {} })
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

    async validateWorkflow(id, workspaceId, clientId) {
        try {
            // Get the workflow
            const { data: workflow, error: workflowError } = await this.supabase
                .from('workflow')
                .select('*')
                .eq('id', id)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null)
                .eq('status', 'live')
                .single();


            if (workflowError) throw new Error(`Fetch failed: ${workflowError.message}`);

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

            const totalHandles = handles.map(handle => handle.handles).flat();

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
                return;
            }

            for (const workflow of workflows) {
                const { data: node, error: nodesError } = await this.supabase
                    .from('workflownode')
                    .select('*')
                    .eq('workflowId', workflow.id)
                    .eq('type', 'ticket_created')
                    .is("isTrigger", true)
                    .single();

                if (node) {
                    // Validate the workflow
                    const isValid = await this.validateWorkflow(workflow.id, workspaceId, clientId);

                    if (!isValid) {
                        console.log("Workflow is not valid, skipping");
                        continue;
                    }

                    console.log("Found a active workflow, send to temporal")
                }
            }

            return;
        } catch (e) {
            console.log("Error in handleNewTicket()", e);
            return;
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
            const { operator: parentGroupOperator, workflowRules, workflowChildGroups, id: parentGroupIdFromReq } = workflowRuleParentGroup;

            await this.syncChannels(workflowChannels, workspaceId, workflowId, clientId, createdBy);

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

            // Get the workflow rules
            const { data: rules, error: rulesError } = await this.supabase.from("workflowrule").select("*").eq("workflowId", workflow.id).is("deletedAt", null);

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

            let parsedRules = {
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
            const tables = [
                {
                    name: "contact",
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
                    name: "company",
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
                {
                    name: "ticket",
                    fields: [{
                        entityType: "ticket",
                        columnname: "subject",
                        label: "Subject",
                        type: "text",
                        placeholder: "Enter subject",
                        table: "ticket"
                    }]
                }
            ];

            // Fetch custom fields
            const { data: customFields, error: customFieldsError } = await this.supabase.from("customfields").select("*").eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null);
            if (customFieldsError) {
                throw new errors.Internal(customFieldsError.message);
            }

            const customerCustomFields = customFields.filter(field => field.entityType === "contact");
            const companyCustomFields = customFields.filter(field => field.entityType === "company");
            const ticketCustomFields = customFields.filter(field => field.entityType === "ticket");

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

            ticketCustomFields.forEach(field => {
                tables[2].fields.push({
                    entityType: "custom_field",
                    columnname: field.id,
                    label: field.name,
                    type: field.fieldType,
                    options: field.options,
                    placeholder: field.placeholder,
                    table: "ticket"
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
                    name: customObject.name.toLowerCase(),
                    id: customObject.id,
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
}

module.exports = WorkflowService;
