const Promise = require("bluebird");
const errors = require("../../errors");
const UserTokenUtility = require('../db/utilities/UserTokenUtility');
const BaseService = require("./BaseService");
const EmailService = require("./EmailService");
const _ = require("lodash");

class UserTokenService extends BaseService {

    constructor() {
        super();
        this.utilityInst = new UserTokenUtility();
        this.entityName = 'UserToken';
        this.listingFields = ["id", "type", "expiresAt", "userId", "clientId", "usedAt", "-_id"];
        this.updatableFields = [ "name", ];
    }

    async createUserToken({ type, expiresAt, userId, clientId }) {
        try {
            return this.utilityInst.generateToken(type, expiresAt, userId, clientId);
        } catch(err) {
            return this.handleError(err);
        }
    }

    async sendForgetPasswordToken(user) {
        try {
            let { email, id, clientId, name } = user;
            let expiresAt = Date.now() + (1 * 60 * 60 * 1000); // 1 hour from now
            // let token = await this.utilityInst.generateToken("passwordReset", id, clientId, expiresAt);

            // check if token already generate within 10 minutes
            let isAlreadySent = await this.findOne({ type: "passwordReset", userId: id, clientId, createdAt: { $gte: Date.now() - (5 * 60 * 1000) }, usedAt: { $exists: false } });
            if (isAlreadySent) {
                return Promise.reject(new errors.BadRequest("Password reset email already sent."));
            }
            let token = await this.generateCryptoToken();
            await this.create({ type: "passwordReset", token, userId: id, clientId, expiresAt });
            let emailService = new EmailService();
            let emailData = {
                to: email,
                template: "passwordReset",
                data: { token, name }
            };
            await emailService.sendEmailTemplate(emailData);
            return Promise.resolve({ message: "Email sent successfully." });
        } catch(err) {
            return this.handleError(err);
        }
    }

    async verifyForgetPasswordToken(token) {
        try {
            // check for expiresAt also in query
            let userToken = await this.findOne({ type: "passwordReset", token, expiresAt: { $gte: Date.now() }, usedAt: { $exists: false } });
            if (!userToken) {
                return Promise.reject(new errors.NotFound("Invalid token."));
            }
            return Promise.resolve(userToken);
        } catch(err) {
            return this.handleError(err);
        }
    }

    async markTokenAsUsed(id) {
        await this.updateOne({ id }, { usedAt: new Date() });
    }

    async sendEmailVerificationToken(user) {
        try {
            let { email, id, clientId, name } = user;
            let expiresAt = Date.now() + (1 * 60 * 60 * 1000); // 1 hour from now
            // let token = await this.utilityInst.generateToken("emailVerification", id, clientId, expiresAt);
            let token = await this.generateCryptoToken();
            await this.create({ type, token, userId: id, clientId, expiresAt });
            let emailService = new EmailService();
            let emailData = {
                to: email,
                template: "emailVerification",
                data: { token, name }
            };
            await emailService.sendEmailTemplate(emailData);
            return Promise.resolve({ message: "Email sent successfully." });
        } catch(err) {
            return this.handleError(err);
        }
    }
}

module.exports = UserTokenService;
