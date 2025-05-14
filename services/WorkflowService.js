const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const { v4: uuid } = require("uuid");

class WorkflowService extends BaseService {
    constructor() {
        super();
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
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

            // Create entry in workflownode table
            const { data: workflownodeData, error: workflownodeError } = await this.supabase
                .from('workflownode')
                .insert({ workflowId: workflowId, type: triggerType, isTrigger: true, positionX: triggerPosition.positionX, positionY: triggerPosition.positionY, reactFlowId: nodeId })
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
}

module.exports = WorkflowService;
