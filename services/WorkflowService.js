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
}

module.exports = WorkflowService;
