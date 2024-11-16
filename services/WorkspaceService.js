const Promise = require("bluebird");
const errors = require("../errors");
const WorkspaceUtility = require('../db/utilities/WorkspaceUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");
const config = require("../config");

class WorkspaceService extends BaseService {

    constructor(fields=null, dependencies={}) {
        super();
        this.utilityInst = new WorkspaceUtility();
        this.AuthService = dependencies.AuthService;
        this.UserService = dependencies.UserService;
        this.WorkspacePermission = dependencies.WorkspacePermissionService;
        this.entityName = 'Workspace';
        this.listingFields = ["id", "name", "-_id"];
        this.updatableFields = [ "name", "description", "chatbotSetting", "sentimentSetting", "qualityAssuranceSetting" ];
    }

    /**
     * Creates a new workspace
     * @param {Object} workspaceData - Workspace data object containing name, clientId, and createdBy.
     * @returns {Object} Created workspace object
     * @description
     - Finds an existing workspace by name and clientId to check for duplicates.
    - Creates a new workspace using the provided workspace data if no duplicate is found.
    - Catches any errors and handles them.
    */
    async createWorkspace(workspaceData) {
        try {
            let { name, description, createdBy, clientId, } = workspaceData;
            let workspace = await this.findOne({ name: { $regex : `^${name}$`, $options: "i" } , clientId });
            if (!_.isEmpty(workspace)) {
                return Promise.reject(new errors.NotFound(this.entityName + " Already exist."));
            }
            workspace = await this.create({name, clientId, description, createdBy});
            return workspace;
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, clientId, userId) {
        try {
            let workspace = await this.findOne({ id, clientId });
            if (_.isEmpty(workspace)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            let workspace1 = await this.utilityInst.aggregate([{
                    $match: {
                        $and: [
                            { id: id },              // replace `id` with the actual workspace ID to match
                            { clientId: clientId }   // replace `clientId` with the actual clientId to match
                        ]
                    }
            }, {
                $lookup: {
                    from: 'workspacepermissions',    // Collection to join with (e.g., 'workspacepermissions')
                    let: { client_id: "$clientId", workspace: "$id", user_id: userId }, // Variables for `clientId`, `workspace`, `userId`
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$clientId", "$$client_id"] },
                                        { $eq: ["$workspaceId", "$$workspace"] },
                                        { $eq: ["$userId", "$$user_id"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'workspacePermissions'        // Output field to hold matched permissions data
                }
            },
            {
                $unwind: { path: "$workspacePermissions", preserveNullAndEmptyArrays: true } // Flatten if only one permission document is expected
            }])
            let email = `${workspace.id}@${config.app.email_domain}`;
            let authInst = new this.AuthService();
             let clientToken = authInst.generateJWTToken({client: (new Buffer(`${workspace.id}:${clientId}`)).toString('base64')});
            return {...workspace1[0], email,clientToken}
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async getMyWorkspace({userId,clientId}){
        console.log(userId,clientId,'userId,clientId')
        let workspPerInst = new this.WorkspacePermission()
        let workspaces = workspPerInst.aggregate([ 
            {
                $match: {
                  userId: userId, // Find permissions for the specific user
                  clientId
                },
              },
              {
                $lookup: {
                  from: "workspaces",   
                  localField: "workspaceId",    
                  foreignField: "id", // `_id` or `id` in workspaces
                  as: "workspace", // Output field for the joined workspace
                },
              },
              {
                $unwind: {
                  path: "$workspace", // Flatten the workspace array
                  preserveNullAndEmptyArrays: true, // Keep the document even if no matching workspace
                },
              },
              {
                $group: {
                  _id: "$workspace._id", // Group by workspace ID to consolidate permissions
                  workspace: { $first: "$workspace" }, // Keep workspace data
                  permissions: { 
                    $first: { // Use $first to get a single permission object
                      _id: "$_id",
                      id: "$id",
                      userId: "$userId",
                      clientId: "$clientId",
                      workspaceId: "$workspaceId",
                      role: "$role",
                      createdBy: "$createdBy",
                      createdAt: "$createdAt",
                      updatedAt: "$updatedAt",
                    } 
                  }
                },
              },
              {
                $replaceRoot: {
                  newRoot: {
                    $mergeObjects: [
                      "$workspace", // Use workspace fields as the main document structure
                      { permission: "$permissions" } // Add a single permission object to each workspace
                    ],
                  },
                },
              },
              {
                $project: {
                  "__v": 0  
                },
              },
            
        ])

        return workspaces
    }
    
    async updateWorkspace({ id, clientId }, updateValues) {
        try {
            let workspace = await this.getDetails(id, clientId);
            await this.update({ id: workspace.id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }


    async updateChatbotSetting({ id, clientId }, chatbotSetting) {
        try {
            let workspace = await this.getDetails(id, clientId);
            let updateValues = { chatbotSetting };
            await this.update({ id: workspace.id}, updateValues);
            return Promise.resolve();
        } catch (error) {
            return this.handleError(error);
        }
    }

    async updateSentimentSetting({ id, clientId }, sentimentSetting) {
        try {
            let workspace = await this.getDetails(id, clientId);
            let updateValues = { sentimentSetting };
            await this.update({ id: workspace.id}, updateValues);
            return Promise.resolve();
        } catch (error) {
            return this.handleError(error);
        }
    }

    async updateQualityAssuranceSetting({ id, clientId }, qualityAssuranceSetting) {
        try {
            let workspace = await this.getDetails(id, clientId);
            let updateValues = { qualityAssuranceSetting };
            await this.update({ id: workspace.id}, updateValues);
            return Promise.resolve();
        } catch (error) {
            return this.handleError(error);
        }
    }

    async deleteWorkspace({ id, clientId }) {
        try {
            let workspace = await this.getDetails(id, clientId);
            let res = await this.softDelete(workspace.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }


    async getWorkspaceDetails(workspaceId, clientId, userId) {
        let data = await this.aggregate([
            {
                $match: {
                    id: workspaceId,  // Match workspace by workspaceId
                    clientId: clientId // Filter by clientId
                }
            },
            {
                $lookup: {
                    from: 'workspacepermissions',  // The collection where workspace permissions are stored
                    localField: 'id',              // Field in the workspace collection (matching workspaceId)
                    foreignField: 'workspaceId',   // Field in the workspacepermissions collection (matching workspaceId)
                    as: 'workspacePermissions'     // Alias for the resulting array of permissions
                }
            },
            {
                $unwind: {
                    path: '$workspacePermissions',  // Unwind the workspacePermissions array to work with individual permissions
                    preserveNullAndEmptyArrays: true // Ensures workspaces without any permissions are still processed
                }
            },
            {
                $lookup: {
                    from: 'users',                // The users collection
                    localField: 'workspacePermissions.userId',  // Field to join on (userId in workspacePermissions)
                    foreignField: 'id',          // Match the _id field in the users collection
                    as: 'workspacePermissions.user'             // Embed the user details in the permission object
                }
            },
           
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    description: { $first: '$description' },
                    clientId: { $first: '$clientId' },
                    workspacePermissions: { $push: '$workspacePermissions' }  // Re-group permissions with userDetails embedded
                }
            }
            
        ]);
    
        return data;
    }
    

    parseFilters({ name, createdFrom, createdTo, clientId }) {
        let filters = {};
        filters.clientId = clientId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
        }

        if (createdFrom) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$gte'] = createdFrom;
        }
        if (createdTo) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$lt'] = createdTo;
        }

        return filters;
    }

}

module.exports = WorkspaceService;
