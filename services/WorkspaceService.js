const Promise = require("bluebird");
const errors = require("../errors");
const WorkspaceUtility = require("../db/utilities/WorkspaceUtility");
const UserUtility = require("../db/utilities/UserUtility");
const BaseService = require("./BaseService");
 
const mongoose = require("mongoose"); // Ensure mongoose is imported
 
const _ = require("lodash");
const config = require("../config");
 
class WorkspaceService extends BaseService {
  constructor(fields = null, dependencies = {}) {
    super();
    this.utilityInst = new WorkspaceUtility();
    this.userUtilityInst = new UserUtility();
    this.AuthService = dependencies.AuthService;
 
    this.entityName = "Workspace";
    this.listingFields = [
      "id",
      "name",
      "-_id",
      "clientId",
      "createdAt",
      "createdBy",
      "description",
      "users",
    ];
 
    this.updatableFields = [
      "name",
      "description",
      "chatbotSetting",
      "sentimentSetting",
      "qualityAssuranceSetting",
      "users",
    ];
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
  // async createWorkspace(workspaceData) {
  //     try {
  //         let { name, clientId } = workspaceData;
  //         let workspace = await this.findOne({ name: { $regex : `^${name}$`, $options: "i" } , clientId });
  //         if (!_.isEmpty(workspace)) {
  //             return Promise.reject(new errors.NotFound(this.entityName + " not found."));
  //         }
  //         workspace = await this.create(workspaceData);
  //         return workspace;
  //     } catch(err) {
  //         return this.handleError(err);
  //     }
  // }
  async createWorkspace(workspaceData) {
    try {
      let { workspace_alternate_id, name, clientId, createdBy } = workspaceData;
 
      // Check if a workspace with the same name and clientId exists
      let workspaceByName = await this.findOne({
        name: { $regex: `^${name}$`, $options: "i" },
        clientId,
      });
      if (!_.isEmpty(workspaceByName)) {
        return Promise.reject(
          new errors.NotFound(this.entityName + " not found.")
        );
      }
 
      // Check if workspace_alternate_id already exists
      let workspaceByAlternateId = await this.findOne({
        workspace_alternate_id,
      });
      if (!_.isEmpty(workspaceByAlternateId)) {
        return Promise.reject(
          new errors.BadRequest("workspace_alternate_id already exists.")
        );
      }
      // Ensure createdBy is an ObjectId reference
      workspaceData.createdBy = mongoose.Types.ObjectId(createdBy);
 
      // Create the workspace
      let workspace = await this.create(workspaceData);
      return workspace;
    } catch (err) {
      return this.handleError(err);
    }
  }
 
 // -----------------------------------------------------------
 async populateWorkspaceCreators(workspaces) {
  try {
    // Log the initial workspaces data
    console.log(
      "Original workspaces data:",
      JSON.stringify(workspaces, null, 2)
    );

    console.log(
      "------------------------------------------------------------"
    );
    
    const populatedDocs = await Promise.all(
     // console.log("MY WORKSPACES", workspaces);
      // Map through each workspace in the docs array
      workspaces.data.data.docs.map(async (workspace) => {
        // Log the current workspace being processed
        console.log("Processing workspace:", workspace);
        console.log("Processing workspace:", workspace.id);

        const populatedWorkspace = await mongoose
          .model("workspace")
          .findOne({ id: workspace.id }) // Use workspace.id as the identifier
          .populate("createdBy") // Populate the createdBy field with the email
          .exec();

        // Log the populated workspace data
        console.log(
          "------------------------------------------------------------"
        );
        console.log("Populated workspace:", populatedWorkspace.length);

        return populatedWorkspace
          ? {
              ...workspace, // Spread the original workspace object
              createdBy: populatedWorkspace.createdBy.email, // Overwrite the createdBy field with the email
            }
          : workspace; // If not found, return the original workspace object
      })
    );

    // Construct the output with the same structure as the input
    const result = {
      ...workspaces, // Spread the original workspaces object
      data: {
        ...workspaces.data, // Spread the original data object
        data: {
          ...workspaces.data.data, // Spread the nested data object
          docs: populatedDocs, // Replace the docs array with the populatedDocs
        },
      },
    };

    // Log the final result
    console.log(
      "Final populated workspaces data:",
      JSON.stringify(result, null, 2)
    );

    return result;
  } catch (error) {
    console.error("Error populating creator email:", error);
    // Return the original workspaces object in case of an error
    return workspaces;
  }
} 
 
  async findByWorkspaceId({ id }) {
    try {
      let users = await this.userUtilityInst.find({ defaultWorkspaceId: id });
 
      return users;
    } catch (err) {
      return this.handleError(err);
    }
  }
  // async findUserById(id) {
  //   try {
  //     let user = await this.userUtilityInst.findOne({ id: id });
  //     console.log("----------------------------------");
  //     console.log("==================================");
  //     console.log(user);
  //     console.log("==================================");
  //     console.log("----------------------------------");
  //     return user || "empty";
  //   } catch (err) {
  //     return this.handleError(err);
  //   }
  // }
  async getDetails(id, clientId) {
    try {
      let workspace = await this.findOne(
        { id, clientId },
        "id name clientId createdAt createdBy description users"
      );
      if (_.isEmpty(workspace)) {
        return Promise.reject(
          new errors.NotFound(this.entityName + " not found.")
        );
      }
      workspace = await this.utilityInst.populate("client", workspace);
      //
    //   workspace = await this.utilityInst.populate("createdBy", workspace);
      workspace.email = `${workspace.id}@${config.app.email_domain}`;
      let authInst = new this.AuthService();
      workspace.clientToken = authInst.generateJWTToken({
        client: new Buffer(`${workspace.id}:${clientId}`).toString("base64"),
      });
      let usersList = await this.findByWorkspaceId(id);
      // let user = await this.findUserById(workspace.createdBy);
      // let username = user.name;
      // console.log("----------------------------------");
      // console.log("==================================");
      // console.log(username);
      // console.log("==================================");
      // console.log("----------------------------------");
 
      let usersCount = usersList.length;
 
      workspace.users = usersCount;
      // workspace.createdBy = username;
     
      await this.updateOne({ users: usersCount });
 
      return workspace;
    } catch (err) {
      return this.handleError(err);
    }
  }
 
  async updateWorkspace({ id, clientId }, updateValues) {
    try {
      let workspace = await this.getDetails(id, clientId);
      await this.update({ id: workspace.id }, updateValues);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }
 
  async updateChatbotSetting({ id, clientId }, chatbotSetting) {
    try {
      let workspace = await this.getDetails(id, clientId);
      let updateValues = { chatbotSetting };
      await this.update({ id: workspace.id }, updateValues);
      return Promise.resolve();
    } catch (error) {
      return this.handleError(error);
    }
  }
 
  async updateSentimentSetting({ id, clientId }, sentimentSetting) {
    try {
      let workspace = await this.getDetails(id, clientId);
      let updateValues = { sentimentSetting };
      await this.update({ id: workspace.id }, updateValues);
      return Promise.resolve();
    } catch (error) {
      return this.handleError(error);
    }
  }
 
  async updateQualityAssuranceSetting(
    { id, clientId },
    qualityAssuranceSetting
  ) {
    try {
      let workspace = await this.getDetails(id, clientId);
      let updateValues = { qualityAssuranceSetting };
      await this.update({ id: workspace.id }, updateValues);
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
    } catch (err) {
      return this.handleError(err);
    }
  }
 
  parseFilters({ name, createdFrom, createdTo, clientId }) {
    let filters = {};
    filters.clientId = clientId;
 
    if (name) {
      filters.name = { $regex: `^${name}`, $options: "i" };
    }
 
    if (createdFrom) {
      if (!filters.createdAt) {
        filters.createdAt = {};
      }
      filters.createdAt["$gte"] = new Date(createdFrom);
    }
    if (createdTo) {
      if (!filters.createdAt) {
        filters.createdAt = {};
      }
      filters.createdAt["$lt"] = new Date(createdTo);
    }
 
    return filters;
  }
}
 
module.exports = WorkspaceService;