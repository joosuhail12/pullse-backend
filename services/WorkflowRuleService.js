const Promise = require("bluebird");
const errors = require("../errors");
const WorkflowRuleUtility = require('../db/utilities/WorkflowRuleUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");
const { v4: uuid } = require("uuid");
const Operators = require("../Utils/WorkflowUtility/operators");

class WorkflowRuleService extends BaseService {

    constructor() {
        super();
        this.utilityInst = new WorkflowRuleUtility();
        this.entityName = 'WorkflowRule';
        this.listingFields = ["id", "name", "-_id"];
        this.updatableFields = ["name", "description", "summary", "matchType", "properties", "position", "status",];
    }

    async validateRuleData(ruleData, positionShouldBe) {
        let { name, matchType, position, properties } = ruleData;

        if (_.isEmpty(name)) {
            return Promise.reject(new errors.ValidationError("Rule name is required."));
        }
        if (_.isEmpty(matchType)) {
            return Promise.reject(new errors.ValidationError("Match Type is required."));
        }
        if (position !== positionShouldBe) {
            return Promise.reject(new errors.ValidationError(`Position should be ${positionShouldBe}.`));
        }
        if (_.isEmpty(properties)) {
            return Promise.reject(new errors.ValidationError("Rule properties are empty."));
        }
        for (let property of properties) {
            let { resource, field, operator, value } = property;
            if (_.isEmpty(resource)) {
                return Promise.reject(new errors.ValidationError("Resource is required."));
            }
            if (_.isEmpty(field)) {
                return Promise.reject(new errors.ValidationError("Field is required."));
            }
            if (_.isEmpty(operator)) {
                return Promise.reject(new errors.ValidationError("Operator is required."));
            }
            if (_.isEmpty(value)) {
                if ([Operators.isNotNull.id, Operators.isNull.id].includes(operator)) {
                    value = [ null ];
                    return Promise.resolve();
                }
                return Promise.reject(new errors.ValidationError("Value is required."));
            }
        }
        return Promise.resolve();
    }

    async createOrUpdateRules(rules, createdBy, workspaceId, clientId) {
        if (_.isEmpty(rules)) {
            return Promise.reject(new errors.ValidationError("Rules are empty."));
        }
        let ruleIds = [];
        let error = [];
        let position = 0;
        for (let rule of rules) {
            if (_.isEmpty(rule.name)) {
                rule.name = `Rule ${uuid()}`;
            }
            if (_.isEmpty(rule.position)) {
                rule.position = position;
            }
            if (rule.id) {
                await this.getDetails(rule.id, workspaceId, clientId)
                .catch(err => {
                    error.push({
                        position,
                        data: rule,
                        message: `Rule with id ${rule.id} not found.`,
                    });
                });
                continue;
            }
            await this.validateRuleData(rule, position)
            .catch(err => {
                error.push({
                    position,
                    data: rule,
                    message: err.message,
                });
                return Promise.resolve(rule);
            });
            let isRuleExistsWithName = await this.count({ name: { $regex : rule.name, $options: "i" }, clientId, workspaceId });
            if (isRuleExistsWithName) {
                error.push({
                    position,
                    data: rule,
                    message: `Rule with name ${rule.name} already exists.`,
                });
            }
            position++;
        }
        if (!_.isEmpty(error)) {
            return { ruleIds, error };
        }
        for (let rule of rules) {
            if (rule.id) {
                await this.update({ id: rule.id }, _.pick(rule, [ "name", "description", "summary", "matchType", "properties", "position", "status",  ]));
                ruleIds.push(rule.id);
                continue;
            }
            let ruleData = await this.create({ ...rule, createdBy, workspaceId, clientId });
            // console.log("created rule", ruleData);
            ruleIds.push(ruleData.id);
        }
        return { ruleIds, error };
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let workflowRule = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(workflowRule)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            return workflowRule;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateWorkflowRule({ id, workspaceId, clientId }, updateValues) {
        try {
            let workflowRule = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: workflowRule.id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }


    async deleteWorkflowRule({ id, workspaceId, clientId }) {
        try {
            let workflowRule = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(workflowRule.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = {};
        filters.workspaceId = workspaceId;
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

module.exports = WorkflowRuleService;
