const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const EmailService = require("./EmailService");
const crypto = require("crypto");

class UserTokenService extends BaseService {
    constructor() {
        super();
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.entityName = 'UserToken';
    }

    async createUserToken({ type, expiresAt, userId, clientId }) {
        try {
            const token = crypto.randomBytes(32).toString("hex");
            const { data, error } = await this.supabase
                .from('UserTokens')
                .insert([{ type, token, expiresAt, userId, clientId }]);
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async sendForgetPasswordToken(user) {
        try {
            const { email, id, clientId, name } = user;
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
            const token = crypto.randomBytes(32).toString("hex");
            
            const { data: existingToken, error: findError } = await this.supabase
                .from('UserTokens')
                .select('*')
                .eq('type', 'passwordReset')
                .eq('userId', id)
                .eq('clientId', clientId)
                .gte('createdAt', new Date(Date.now() - 5 * 60 * 1000))
                .is('usedAt', null)
                .single();
            
            if (existingToken) {
                throw new errors.BadRequest("Password reset email already sent.");
            }

            const { error: insertError } = await this.supabase
                .from('UserTokens')
                .insert([{ type: "passwordReset", token, userId: id, clientId, expiresAt }]);
            if (insertError) throw insertError;

            const emailService = new EmailService();
            await emailService.sendEmailTemplate({ to: email, template: "passwordReset", data: { token, name } });
            return { message: "Email sent successfully." };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async verifyForgetPasswordToken(token) {
        try {
            const { data: userToken, error } = await this.supabase
                .from('UserTokens')
                .select('*')
                .eq('type', 'passwordReset')
                .eq('token', token)
                .gte('expiresAt', new Date())
                .is('usedAt', null)
                .single();

            if (!userToken) {
                throw new errors.NotFound("Invalid token.");
            }
            return userToken;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async markTokenAsUsed(id) {
        try {
            const { error } = await this.supabase
                .from('UserTokens')
                .update({ usedAt: new Date() })
                .eq('id', id);
            if (error) throw error;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async sendEmailVerificationToken(user) {
        try {
            const { email, id, clientId, name } = user;
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
            const token = crypto.randomBytes(32).toString("hex");
            
            const { error } = await this.supabase
                .from('UserTokens')
                .insert([{ type: "emailVerification", token, userId: id, clientId, expiresAt }]);
            if (error) throw error;

            const emailService = new EmailService();
            await emailService.sendEmailTemplate({ to: email, template: "emailVerification", data: { token, name } });
            return { message: "Email sent successfully." };
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = UserTokenService;
