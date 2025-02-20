const _ = require("lodash");
const Promise = require("bluebird");
const DemoRequestUtility = require("../db/utilities/DemoRequestUtility");
const BaseService = require("./BaseService");
const errors = require("../errors");

class DemoRequestService extends BaseService {
    constructor() {
        super();
        this.entityName = "DemoRequest";
        this.utilityInst = new DemoRequestUtility();
        this.listingFields = ["id", "name", "email", "count", "description", "status", "createdAt", "updatedAt"];
        this.updatableFields = ["count", "name", "description"];
    }

    async createDemoRequest({ name, email, description = null }) {
        try {
            let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
            if (!email.match(emailRegex)) {
                return Promise.reject(new errors.BadRequest("Invalid E-mail."));
            }
            let demoRequest = await this.findOne({ email });

            if (!demoRequest) {
                let data = { name, email, count: 1, description };
                return this.create(data).catch((err) => {
                    if (err instanceof errors.Conflict) {
                        return new errors.Conflict("DemoRequest already exists.");
                    }
                    return Promise.reject(err);
                });
            }

            let id = demoRequest.id;
            let count = demoRequest.count || 0;
            count++;
            await this.updateOne({ id }, { count });
            return { id, count };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteDemoRequest(id) {
        try {
            let res = await this.softDelete(id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = DemoRequestService;
