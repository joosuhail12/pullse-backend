const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Promise = require("bluebird");
const errors = require("../errors");
const config = require("../config");
const BaseService = require("./BaseService");
const UserTokenService = require("./UserTokenService");
const UserService = require("./UserService");
const WorkspacePermissionService = require("./WorkspacePermissionService");
const UserUtility = require('../db/utilities/UserUtility');
const AuthUtility = require('../db/utilities/AuthUtility');
const { createClient } = require('@supabase/supabase-js');
const authMiddlewares = require('../middlewares/auth');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
class AuthService extends UserService {

    constructor(fields = null, dependencies = null) {
        super(fields, dependencies);
        this.entityName = "Auth";
        this.supabase = supabase;
        this.authUtilityInst = new AuthUtility();
        this.WorkspacePermission = WorkspacePermissionService;
        this.utilityInst = new UserUtility();
        this.listingFields = ['id', 'role', 'accessToken'];
    }

    async login(email, password, userAgent = null, ip = null) {
        try {
            email = email?.toLowerCase();
            await this.loginValidator(email, password);

            let { data: user, error } = await this.supabase.from('users').select('*').eq('email', email).single();
            if (error || !user) throw new errors.InvalidCredentials();

            let checkPassword = await this.bcryptTokenCompare(password, user.password);
            if (!checkPassword) throw new errors.InvalidCredentials();

            if (!user.defaultWorkspaceId) throw new Error('Workspace Not Found');

            let { data: permission } = await this.supabase
                .from('workspacePermissions')
                .select('*')
                .eq('userId', user.id)
                .eq('workspaceId', user.defaultWorkspaceId)
                .single();

            if (!permission?.access) throw new Error('Access not allowed to this workspace. Please contact admin.');

            let accessToken = {
                token: uuidv4(),
                expiry: Date.now() + (1 * 60 * 60 * 1000), // Return as a timestamp
                issuedAt: new Date(),
                userAgent, ip
            };
            const { data: accessTokenData, error: accessTokenError } = await this.supabase.from('userAccessTokens').insert({
                user_id: user.id,
                token: accessToken.token,
                issuedAt: accessToken.issuedAt,
                expiry: new Date(accessToken.expiry), // Store as a Date object in the database
                userAgent: accessToken.userAgent,
                ip: accessToken.ip
            });

            return {
                id: user.id,
                accessToken,
                roleIds: user.roleIds,
                firstName: user.fname,
                lastName: user.lname,
                defaultWorkspaceId: user.defaultWorkspaceId
            };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async forgetPassword(email) {
        try {
            email = email?.toLowerCase();
            let { data: user } = await this.supabase.from('users').select('*').eq('email', email).single();
            if (!user) return Promise.reject(new errors.NotFound("Invalid Email."));

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

            let { data: user } = await this.supabase.from('users').select('*').eq('id', userToken.userId).single();
            if (!user) return Promise.reject(new errors.NotFound("Invalid token."));

            let hash = await this.bcryptToken(password);
            await this.supabase.from('users').update({ password: hash }).eq('id', user.id);
            await userTokenService.markTokenAsUsed(userToken.id);

            return { message: "Password reset successfully." };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async checkToken(token) {
        try {
            // Fetch user based on the token
            let { data: session, error: sessionError } = await supabase
                .from('userAccessTokens') // Assuming userSessions table stores access tokens
                .select('user_id, expiry')
                .eq('token', token)
                .single();
            if (sessionError || !session) {
                return Promise.reject(new errors.Unauthorized());
            }

            // Check if session expired
            if (session.expiry < Date.now()) {
                return Promise.reject(new errors.Unauthorized("Session expired, please login again."));
            }

            // Fetch full user details
            let { data: user, error: userError } = await supabase
                .from('users')
                .select('id, email, fName, lName, defaultWorkspaceId, clientId')
                .eq('id', session.user_id)
                .single();

            if (userError || !user) {
                return Promise.reject(new errors.Unauthorized());
            }

            // Fetch user role from workspacePermissions
            let { data: permission, error: permissionError } = await supabase
                .from('workspacePermissions')
                .select('role')
                .eq('userId', user.id)
                .eq('workspaceId', user.defaultWorkspaceId)
                .single();

            return {
                ...user,
                role: permission?.role || null, // Add role if available
            };
        } catch (err) {
            console.log(err);
            return this.handleError(err);
        }
    }

    async verifyEmail(email) {
        try {
            email = email?.toLowerCase();
            let { data: user } = await this.supabase.from('users').select('*').eq('email', email).single();
            if (!user) return Promise.reject(new errors.NotFound("Invalid Email."));

            let userTokenService = new UserTokenService();
            return userTokenService.sendEmailVerificationToken(user);
        } catch (err) {
            return this.handleError(err);
        }
    }

    loginValidator(email, password) {
        if (!email) {
            return Promise.reject(new errors.ValidationFailed("Email is required.", { fieldName: "email" }));
        }
    }

    generateJWTToken(data = {}, secret = config.auth.jwtSecret) {
        let signOptions = {
            algorithm: 'RS256',
            issuer: config.app.baseUrl,
            subject: 'customer',
            audience: config.app.baseUrl,
            tokenId: uuidv4(),
        };
        const token = jwt.sign(data, '$$SUPER_SECRET_JWT_SECRET!@#$%5')
        console.log(token);
        return token;
    }

    verifyJWTToken(token, secret = '$$SUPER_SECRET_JWT_SECRET!@#$%5') {
        console.log(jwt.verify(token, secret));
        return jwt.verify(token, secret);
    }

    bcryptTokenCompare(pass1, passwordHash) {
        return bcrypt.compare(pass1, passwordHash)
            .then(res => res ? Promise.resolve(true) : Promise.resolve(false));
    }

    async findByCredentials(email, password) {
        try {
            let { data: user } = await this.supabase.from('users').select('*').eq('email', email).single();
            if (!user) return Promise.reject(new errors.InvalidCredentials());

            let checkPassword = await this.bcryptTokenCompare(password, user.password);
            if (!checkPassword) return Promise.reject(new errors.InvalidCredentials());

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
            await this.supabase.from('users').update(updateData).eq('id', user.id);

            return { message: "Password changed successfully." };
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = AuthService;
