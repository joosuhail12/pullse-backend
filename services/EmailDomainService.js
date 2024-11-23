const Promise = require("bluebird");
const errors = require("../errors");
const EmailDomainUtility = require('../db/utilities/EmailDomainUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");
const formData =require('form-data')
const Mailgun = require('mailgun.js')
class EmailDomainService extends BaseService {

    constructor() {
        super();
        this.utilityInst = new EmailDomainUtility();
        this.entityName = 'EmailDomain';
        this.listingFields = ["id", "domain", "-_id"];
        this.updatableFields = [ "name", "domain", "description"];
    }

    async createEmailDomain(emailDomainData) {
        try {
            let { domain, clientId } = emailDomainData;
            let emailDomain = await this.findOne({ domain, clientId });
            const mailgun = new Mailgun(formData)
            let mg = mailgun.client({ 
                username: 'api', 
                key: process.env.MAILGUN_API_KEY 
            })
            if (!_.isEmpty(emailDomain)) {
                return Promise.reject(new errors.AlreadyExist(this.entityName + " already exist."));
            }

            await mg.domains.create({ name: domain }, (error, body) => {
                if(error) {
                    return Promise.reject(error)
                }
                return body
            }).then(async (response) => {
                return this.create(emailDomainData) 
            })

        } catch(err) {
            return this.handleError(err);
        }
    }

    async listDomainKeys(emailDomainData){
        try{
            let { id, clientId } = emailDomainData;
            console.error(id, clientId)
            let emailDomain = await this.findOne({ id, clientId });
            if(_.isEmpty(emailDomain)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            const mailgun = new Mailgun(formData)
            let mg = mailgun.client({ 
                username: 'api', 
                key: process.env.MAILGUN_API_KEY 
            })
            return await mg.domains.get(emailDomain.domain)
        }catch(err) {
            this.handleError(err)
        }
    }

    async verifyDomainKeys(emailDomainData){
        try{
            let { id, clientId } = emailDomainData;
            console.error(id, clientId)
            let emailDomain = await this.findOne({ id, clientId });
            if(_.isEmpty(emailDomain)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            const mailgun = new Mailgun(formData)
            let mg = mailgun.client({ 
                username: 'api', 
                key: process.env.MAILGUN_API_KEY 
            })
            return await mg.domains.verify(emailDomain.domain)
        }catch(err) {
            this.handleError(err)
        }
    }


    async getDetails(id, clientId) {
        try {
            let emailDomain = await this.findOne({ id, clientId });
            if (_.isEmpty(emailDomain)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            return emailDomain;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateEmailDomain({ id, workspaceId, clientId }, updateValues) {
        try {
            let emailDomain = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: emailDomain.id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }


    async deleteEmailDomain({ id, workspaceId, clientId }) {
        try {
            let emailDomain = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(emailDomain.id);
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

module.exports = EmailDomainService;
