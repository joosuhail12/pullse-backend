const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const errors = require("../../errors");
const config = require("../../config");
const BaseService = require("./BaseService");
const UserTokenService = require("./UserTokenService");
const UserService = require("./UserService");
const WorkspacePermissionService = require("./WorkspacePermissionService");
const supabase = require('../db/supabaseClient');

class AuthService extends UserService {
    constructor(fields = null, dependencies = null) {
        super(fields, dependencies);
        this.entityName = "Auth";
        this.WorkspacePermission = WorkspacePermissionService;
        this.listingFields = ['id', 'role', 'accessToken'];
    }

    async login(email, password, userAgent = null, ip = null) {
        try {
            email = email?.toLowerCase();
            await this.loginValidator(email, password);

            let { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
            if (error || !user) throw new errors.InvalidCredentials();
            
            let checkPassword = await this.bcryptTokenCompare(password, user.password);
            if (!checkPassword) throw new errors.InvalidCredentials();

            if (!user.defaultWorkspaceId) throw new Error('Workspace Not Found');

            let { data: permission } = await supabase.from('workspacePermissions')
                .select('*')
                .eq('userId', user.id)
                .eq('workspaceId', user.defaultWorkspaceId)
                .single();

            if (!permission?.access) throw new Error('Access not allowed to this workspace. Please contact admin.');
            
            let accessToken = {
                token: uuidv4(),
                expiry: Date.now() + 3600000, // 1 hour from now
                issuedAt: new Date(),
                userAgent, ip
            };
            
            await supabase.from('users').update({ lastLoggedInAt: new Date() }).eq('id', user.id);
            return { id: user.id, accessToken, roleIds: user.roleIds, firstName: user.fname, lastName: user.lname, defaultWorkspaceId: user.defaultWorkspaceId };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async forgetPassword(email) {
        try {
            email = email?.toLowerCase();
            let { data: user } = await supabase.from('users').select('*').eq('email', email).single();
            if (!user) throw new errors.NotFound("Invalid Email.");

            let userTokenService = new UserTokenService();
            return userTokenService.sendForgetPasswordToken(user);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async resetPassword(token, password) {
        try {
            let userTokenService = new UserTokenService();
            let userToken = await userTokenService.verifyForgetPasswordToken(token);
            let { data: user } = await supabase.from('users').select('*').eq('id', userToken.userId).single();
            if (!user) throw new errors.NotFound("Invalid token.");

            let hash = await this.bcryptToken(password);
            await supabase.from('users').update({ password: hash }).eq('id', user.id);
            await userTokenService.markTokenAsUsed(userToken.id);

            return { message: "Password reset successfully." };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async verifyEmail(email) {
        try {
            email = email?.toLowerCase();
            let { data: user } = await supabase.from('users').select('*').eq('email', email).single();
            if (!user) throw new errors.NotFound("Invalid Email.");

            let userTokenService = new UserTokenService();
            return userTokenService.sendEmailVerificationToken(user);
        } catch (err) {
            return this.handleError(err);
        }
    }

    loginValidator(email, password) {
        if (!email) throw new errors.ValidationFailed("Email is required.", { fieldName: "email" });
    }

    generateJWTToken(data = {}, secret = config.auth.jwtSecret) {
        console.log(data, secret);
        return jwt.sign(data, secret);
    }

    verifyJWTToken(token, secret = config.auth.jwtSecret) {
        return jwt.verify(token, secret);
    }

    async findByCredentials(email, password) {
        try {
            let { data: user } = await supabase.from('users').select('*').eq('email', email).single();
            if (!user) throw new errors.InvalidCredentials();
            
            let checkPassword = await this.bcryptTokenCompare(password, user.password);
            if (!checkPassword) throw new errors.InvalidCredentials();
            
            return user;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async changePassword(email, { password, newPassword }, logoutAll) {
        try {
            let user = await this.findByCredentials(email, password);
            let hash = await this.bcryptToken(newPassword);
            let updateData = { password: hash };
            
            if (logoutAll) updateData.accessTokens = [];
            await supabase.from('users').update(updateData).eq('id', user.id);

            return { message: "Password changed successfully." };
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = AuthService;
