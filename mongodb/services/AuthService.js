const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Promise = require("bluebird");
const errors = require("../../errors");
const config = require("../../config");
const BaseService = require("./BaseService");
const UserTokenService = require("./UserTokenService");
const UserService = require("./UserService");
const WorkspacePermissionService = require("./WorkspacePermissionService");
const UserUtility = require('../db/utilities/UserUtility');
const AuthUtility = require('../db/utilities/AuthUtility');

class AuthService extends UserService {

    constructor(fields=null, dependencies=null) {
        super(fields, dependencies);
        this.entityName = "Auth";
        this.authUtilityInst = new AuthUtility;
        this.WorkspacePermission = WorkspacePermissionService
        this.utilityInst = new UserUtility();
        this.listingFields = ['id', 'role', 'accessToken', "-_id" ];
    }

    async login(email, password, userAgent=null, ip=null) {
        try {

            email = email && email.toLowerCase();

            await this.loginValidator(email, password);

            let user = await this.findByCredentials(email, password);
            if(!user?.defaultWorkspaceId){
                throw new Error('Worksapce Not Found');
            }
            let workspacePerInst = new this.WorkspacePermission();
            let permission = await workspacePerInst.findOne({userId:user.id, workspaceId:user?.defaultWorkspaceId})
            if(!permission?.access){    
                throw new Error('Access not Allowed to this workspace please contact admin') 
            }

            // if (!user.defaultWorkspaceId) {
            //     let defaultWorkspace = await this.getUserDefaultWorkspace(user).catch(() => {
            //         return {id: null};
            //     });
            //     user.defaultWorkspaceId = defaultWorkspace.id;
            // }

            let accessToken = {
                token: uuidv4(),
                expiry: (Date.now() + (1 * 60 * 60 * 1000)), // 1 hour from now
                issuedAt: new Date(),
                userAgent, ip
            };
            await this.updateOne({ id: user.id }, {$push: {accessTokens: accessToken}, lastLoggedInAt: new Date()});
            return { id: user.id, accessToken, roleIds: user.roleIds, first_name: user.fname, last_name: user.lname, defaultWorkspaceId: user.defaultWorkspaceId };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async forgetPassword(email) {
        try {
            email = email && email.toLowerCase();
            let user = await this.findOne({ email });
            if(!user) {
                return Promise.reject(new errors.NotFound("Invalid Email."));
            }
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

            let user = await this.findOne({ id: userToken.userId });
            if (!user) {
                return Promise.reject(new errors.NotFound("Invalid token."));
            }

            let hash = await this.bcryptToken(password);
            await this.updateOne({ id: user.id }, { password: hash });
            await userTokenService.markTokenAsUsed(userToken.id);
            return { message: "Password reset successfully." };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async verifyEmail(email) {
        try {
            email = email && email.toLowerCase();
            let user = await await this.findOne({ email });
            if(!user) {
                return Promise.reject(new errors.NotFound("Invalid Email."));
            }
            let userTokenService = new UserTokenService();
            return userTokenService.sendEmailVerificationToken(user);
        } catch (err) {
            return this.handleError(err);
        }
    }

    loginValidator(email, password) {
        if(!email) {
            return Promise.reject(new errors.ValidationFailed(
                "email is required.", { field_name: "email" }
            ));
        }
    }

    generateJWTToken(data = {}, secret=config.auth.jwt_secret) {
        let signOptions = {
            algorithm: 'RS256',
            issuer: config.app.base_url,
            subject: 'customer',
            audience: config.app.base_url,
            tokenId: uuidv4()
        };
        // let token = jwt.sign(data, secret, signOptions);
        let token = jwt.sign(data, secret);
        return token;
    }

    verifyJWTToken(token, secret=config.auth.jwt_secret) {
        return jwt.verify(token, secret);
    }

    bcryptTokenCompare(pass1, passwordHash) {
        return bcrypt.compare(pass1, passwordHash)
        .then(res => {
            if (!res) {
                return Promise.resolve(false);
            }
            return Promise.resolve(true);
        });
    }

    async findByCredentials(email, password) {
        try {

            let user = await this.findOne({ email });
            if(!user) {
                return Promise.reject(new errors.InvalidCredentials());
            }
            let checkPassword = await this.bcryptTokenCompare(password, user.password);
            if(!checkPassword) {
                return Promise.reject(new errors.InvalidCredentials());
            }

            return user;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async changePassword(email, { password, newPassword }, logoutAll) {
        try {
            let user = await this.findByCredentials(email, password);
            let hash = await this.bcryptToken(newPassword);
            let toUpdate = { password: hash };
            if (logoutAll) {
                toUpdate.accessTokens = [];
            }
            await this.updateOne({ id: user.id }, toUpdate);
            // password changed event to send email
            return { message: "Password changed successfully." };
        } catch (err) {
            return this.handleError(err);
        }
    }

}

module.exports = AuthService;
