const _ = require("lodash");
const Promise = require("bluebird");
const UserUtility = require('../db/utilities/UserUtility');
const BaseService = require("./BaseService");
const errors = require("../errors");
const WorkspaceService = require("./WorkspaceService");
const { createClient } = require('@supabase/supabase-js');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const crypto = require("crypto");
const MAGIC_LINK_TOKEN_EXPIRY = 100 * 60 * 1000; // 10 minutes in ms

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class UserService extends BaseService {

    constructor(fields = null, dependencies = null) {
        super();
        this.entityName = "users";
        this.utilityInst = new UserUtility();
        this.WorkspaceService = WorkspaceService;
        this.supabase = supabase;
        this.listingFields = ["id", "name", "roleIds: userRoles(name)", "status", "teamId", "createdBy", "created_at", "lastLoggedInAt", "avatar"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = ["fName", "lName", "name", "roleIds: userRoles(name)", "teamId", "status", "defaultWorkspaceId", "avatar"];
    }

    async checkEmailExists(email, clientId) {
        const { data, error } = await this.supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .eq('clientId', clientId)
            .maybeSingle();
        if (error && error.code !== 'PGRST116') throw error; // ignore no rows found
        return !!data;
    }

    async createUser({ fName, lName, email, roleIds = [], confirmPassword, password, createdBy, clientId, defaultWorkSpace = null, avatar = null, useMagicLink = false }) {
        try {
            email = email.toLowerCase();
            if (await this.checkEmailExists(email, clientId)) {
                return new errors.AlreadyExist("User with this email already exists.");
            }
            let name = this.name(fName, lName);

            if (useMagicLink) {
                return await this.createUserWithMagicLink({ fName, lName, email, roleIds, createdBy, clientId, defaultWorkSpace, avatar });
            }

            if (confirmPassword && confirmPassword !== password) {
                return new errors.BadRequest("Confirm password and password do not match.");
            }

            if (!avatar) {
                avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
            }

            password = await this.bcryptToken(password);

            // ✅ Handle role IDs - if they're already IDs, use them directly, if they're names, look them up
            let fetchedRoles = [];
            if (roleIds.length > 0) {
                // Check if first element looks like a UUID (ID) or a name
                const firstRole = roleIds[0];
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstRole);

                if (isUUID) {
                    // If they're already IDs, verify they exist and use them
                    const { data, error } = await this.supabase
                        .from("userRoles")
                        .select("id")
                        .in("id", roleIds)
                        .is("deletedAt", null);

                    if (error) throw error;
                    if (!data || data.length === 0) {
                        throw new Error("Invalid role ID(s) provided");
                    }
                    fetchedRoles = roleIds; // Use the provided IDs
                } else {
                    // If they're names, look them up
                    const { data, error } = await this.supabase
                        .from("userRoles")
                        .select("id, name")
                        .in("name", roleIds)
                        .is("deletedAt", null);

                    if (error) throw error;
                    if (!data || data.length === 0) {
                        throw new Error("Invalid role name(s) provided");
                    }
                    fetchedRoles = data.map(role => role.id);
                }
            }

            // Fetch role name from roleIds
            const roleName = await this.supabase
                .from("userRoles")
                .select("name")
                .eq("id", fetchedRoles[0])
                .single();

            // Don't allow user to create user if role name is not present
            if (!roleName.data?.name) {
                return new errors.BadRequest("Role name is not present.");
            }

            // Insert User into Supabase
            const { data: user, error: userError } = await this.supabase
                .from("users")
                .insert([{
                    fName,
                    lName,
                    name,
                    email,
                    password,
                    roleIds: fetchedRoles[0] || null, // ✅ Use first role only, not array
                    createdBy,
                    clientId,
                    defaultWorkspaceId: defaultWorkSpace || null,
                    avatar
                }])
                .select("*")
                .single();

            if (userError) {
                console.error("Supabase Insert Error:", userError);
                if (userError.code === "23505") {
                    return new errors.AlreadyExist("User already exists.");
                }
                throw userError;
            }

            // Create workspace permission for the user if defaultWorkSpace is provided
            if (defaultWorkSpace && user.id) {
                const { error: permissionError } = await this.supabase
                    .from('workspacePermissions')
                    .insert({
                        userId: user.id,
                        workspaceId: defaultWorkSpace,
                        access: true,
                        role: roleName.data?.name || null,
                        createdBy: createdBy,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (permissionError) {
                    console.error("Error creating workspace permission:", permissionError);
                    // Don't throw here to avoid breaking user creation, but log the error
                }
            }

            return user;

        } catch (e) {
            console.error("Error in createUser:", e);
            return Promise.reject(e);
        }
    }

    async createUserWithMagicLink({ fName, lName, email, roleIds, createdBy, clientId, defaultWorkSpace, avatar }) {
        email = email.toLowerCase();
        if (await this.checkEmailExists(email, clientId)) {
            return new errors.AlreadyExist("User with this email already exists.");
        }
        let name = this.name(fName, lName);
        if (!avatar) {
            avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
        }

        console.log('Inside createUserWithMagicLink');

        // Role logic (same as original)
        let fetchedRoles = [];
        if (roleIds.length > 0) {
            const firstRole = roleIds[0];
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstRole);
            if (isUUID) {
                const { data, error } = await this.supabase.from("userRoles").select("id").in("id", roleIds).is("deletedAt", null);
                if (error) throw error;
                if (!data || data.length === 0) throw new Error("Invalid role ID(s) provided");
                fetchedRoles = roleIds;
            } else {
                const { data, error } = await this.supabase.from("userRoles").select("id, name").in("name", roleIds).is("deletedAt", null);
                if (error) throw error;
                if (!data || data.length === 0) throw new Error("Invalid role name(s) provided");
                fetchedRoles = data.map(role => role.id);
            }
        }
        const roleName = await this.supabase.from("userRoles").select("name").eq("id", fetchedRoles[0]).single();
        if (!roleName.data?.name) return new errors.BadRequest("Role name is not present.");
        // Insert placeholder password to satisfy NOT NULL constraint
        const placeholderHash = await this.bcryptToken(crypto.randomBytes(16).toString('hex'));
        const { data: user, error: userError } = await this.supabase.from("users").insert([{
            fName, lName, name, email, password: placeholderHash, roleIds: fetchedRoles[0] || null, createdBy, clientId, defaultWorkspaceId: defaultWorkSpace || null, avatar
        }]).select("*").single();
        if (userError) {
            if (userError.code === "23505") return new errors.AlreadyExist("User already exists.");
            throw userError;
        }
        if (defaultWorkSpace && user.id) {
            await this.supabase.from('workspacePermissions').insert({ userId: user.id, workspaceId: defaultWorkSpace, access: true, role: roleName.data?.name || null, createdBy, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }
        // Generate magic link token
        const token = await this.generateMagicLinkToken(user.id, clientId);
        // Send magic link email
        // put in try catch
        try {
            await this.sendMagicLinkEmail(user, token);
        } catch (error) {
            console.error("Error sending magic link email:", error);
            throw error;
        }
        return { ...user, message: "User created successfully. Magic link sent to email." };
    }

    async generateMagicLinkToken(userId, clientId) {
        const { v4: uuidv4 } = require('uuid');
        const token = uuidv4();
        const expiry = Date.now() + MAGIC_LINK_TOKEN_EXPIRY; // timestamp
        const issuedAt = new Date();
        const { error } = await this.supabase.from('userAccessTokens').insert({
            user_id: userId,
            token,
            issuedAt,
            expiry: new Date(expiry),
            userAgent: 'magic-link',
            ip: 'magic-link'
        });
        if (error) throw error;
        return token;
    }

    async sendMagicLinkEmail(user, token) {

        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY });
        const domain = process.env.APP_EMAIL_DOMAIN;
        const setPasswordUrl = `${process.env.APP_BASE_URL === 'localhost:8080' ? 'http' : 'https'}://${process.env.APP_BASE_URL}/set-password?token=${token}&email=${encodeURIComponent(user.email)}&userId=${user.id}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Welcome to Pullse AI!</h2>
                <p>Hi ${user.name},</p>
                <p>Your account has been created. To complete your registration, please set your password by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${setPasswordUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Set Password</a>
                </div>
                <p style="color: #666; font-size: 14px;"><strong>Important:</strong> This link will expire in 10 minutes for security reasons.</p>
                <p style="color: #666; font-size: 14px;">If you didn't create this account, please ignore this email or contact support.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">Thanks,<br>Team Pullse AI</p>
            </div>
        `;
        const emailData = {
            from: `Pullse AI <no-reply@${domain}>`,
            to: user.email,
            subject: 'Set Your Password - Pullse AI',
            html
        };
        await mg.messages.create(domain, emailData);
    }

    async verifyMagicLinkToken(token, email, userId = null) {
        // Find user by email
        const { data: user, error: userError } = await this.supabase.from('users').select('id, email, name, clientId').eq('email', email).single();
        if (userError || !user) throw new errors.NotFound('User not found.');
        if (userId && user.id !== userId) throw new errors.BadRequest('Invalid user ID provided.');

        const { data: session, error: sessionError } = await this.supabase
            .from('userAccessTokens')
            .select('*')
            .eq('token', token)
            .eq('user_id', user.id)
            .single();
        if (sessionError || !session) throw new errors.BadRequest('Invalid or expired token.');
        // Check issuedAt/expiry in JS to avoid timezone/data type issues
        const now = new Date();
        const issuedAt = new Date(session.issuedAt);
        const expiry = new Date(session.expiry);
        if (issuedAt > now) throw new errors.BadRequest('Token not yet valid.');
        if (expiry < now) throw new errors.BadRequest('Token expired.');
        return { user, token: session };
    }

    async setPasswordWithToken(token, email, password, confirmPassword, userId = null) {
        if (!password || password.length < 8) throw new errors.BadRequest("Password must be at least 8 characters long.");
        if (confirmPassword && confirmPassword !== password) throw new errors.BadRequest("Confirm password and password do not match.");
        const { user, token: userToken } = await this.verifyMagicLinkToken(token, email, userId);
        const hashedPassword = await this.bcryptToken(password);
        await this.supabase.from('users').update({ password: hashedPassword, updated_at: new Date().toISOString() }).eq('id', user.id);
        await this.supabase.from('UserTokens').update({ usedAt: new Date() }).eq('id', userToken.id);
        // Generate access token for automatic login
        const { v4: uuidv4 } = require('uuid');
        let accessToken = { token: uuidv4(), expiry: Date.now() + (1 * 60 * 60 * 1000), issuedAt: new Date(), userAgent: 'Magic Link Setup', ip: 'Magic Link Setup' };
        await this.supabase.from('userAccessTokens').insert({ user_id: user.id, token: accessToken.token, issuedAt: accessToken.issuedAt, expiry: new Date(accessToken.expiry), userAgent: accessToken.userAgent, ip: accessToken.ip });
        return { message: "Password set successfully. You can now login with your email and password.", user: { id: user.id, email: user.email, name: user.name }, accessToken };
    }


    async getDetails(id, clientId) {
        try {

            // Step 1: Fetch user details with the correct workspace relation
            let { data: user, error: userError } = await this.supabase
                .from("users")
                .select(`
                    *,
                    workspace:workspace!fk_users_workspace(*),
                    roleIds:userRoles(*),
                    permissions:workspacePermissions(*)
                `)
                .eq("id", id)
                .eq("clientId", clientId)
                .maybeSingle(); // Changed from `single()` to `maybeSingle()`


            if (userError) throw userError;
            if (!user) return Promise.reject(new errors.NotFound(this.entityName + " not found."));

            // Step 2: Ensure user has a workspace
            if (!user.defaultWorkspaceId) {
                console.log("User does not have a default workspace.");
                return user;
            }

            // Step 3: Fetch workspace permissions separately
            let { data: permissions, error: permissionError } = await this.supabase
                .from("workspacePermissions")
                .select("*")
                .eq("workspaceId", user.defaultWorkspaceId)
                .eq("userId", id)
                .maybeSingle();

            if (permissionError) throw permissionError;

            // Step 4: Attach permissions to workspace
            if (user.workspace) {
                user.workspace.permission = permissions || null;
            }

            return user;

        } catch (err) {
            console.error("Error in getDetails:", err);
            return this.handleError(err);
        }
    }


    // async getUserDefaultWorkspace(user) {
    //     try {
    //         let clientId = user.clientId;
    //         let defaultWorkspace;
    //         let inst = new this.WorkspaceService();
    //         if (!user.defaultWorkspaceId) {
    //             defaultWorkspace = await inst.findOne({ clientId });
    //         } else {
    //             defaultWorkspace = await inst.findOne({ id: user.defaultWorkspaceId, clientId });
    //         }
    //         if (!defaultWorkspace) {
    //             return Promise.reject(new errors.NotFound("User don't have a workspace."));
    //         }
    //         return defaultWorkspace;
    //     } catch (err) {
    //         return this.handleError(err);
    //     }
    // }

    async updateUser({ user_id, clientId }, updateValues) {
        try {
            if (updateValues.roleIds && updateValues.roleIds.length > 0) {
                // Check if first element looks like a UUID (ID) or a name
                const firstRole = updateValues.roleIds[0];
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstRole);

                if (isUUID) {
                    // If they're already IDs, verify they exist and use them
                    const { data, error } = await this.supabase
                        .from("userRoles")
                        .select("id")
                        .in("id", updateValues.roleIds)
                        .is("deletedAt", null);

                    if (error) throw error;
                    if (!data || data.length === 0) {
                        throw new Error("Invalid role ID(s) provided");
                    }
                    // Keep the original roleIds since they're already valid IDs
                } else {
                    // If they're names, look them up
                    const { data, error } = await this.supabase
                        .from("userRoles")
                        .select("id, name")
                        .in("name", updateValues.roleIds)
                        .is("deletedAt", null);

                    if (error) throw error;
                    if (!data || data.length === 0) {
                        throw new Error("Invalid role name(s) provided");
                    }
                    updateValues.roleIds = data.map(role => role.id);
                }
            }

            const { error } = await this.supabase
                .from('users')
                .update(updateValues)
                .match({ id: user_id, clientId });

            if (error) throw error;
            return Promise.resolve();

        } catch (e) {
            console.log("Error in updateUser()", e);
            return Promise.reject(e);
        }
    }


    async deleteUser(id) {
        try {
            const { error } = await this.supabase.from('users').update({ deleted: true }).eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            return this.handleError(err);
        }
    }

    name(fName, lName) {
        return fName.trim() + ' ' + lName.trim();
    }

    parseFilters({ name, email, createdFrom, roleId, teamId, createdTo, clientId }) {
        let filters = {};
        filters.clientId = clientId;

        if (name) {
            filters.name = name;
        }
        if (email) {
            filters.email = email;
        }
        if (roleId) {
            filters.roleIds = roleId;
        }
        if (teamId) {
            filters.teamId = teamId;
        }
        if (createdFrom) {
            filters.createdAt = { gte: createdFrom };
        }
        if (createdTo) {
            filters.createdAt = { lt: createdTo };
        }

        return filters;
    }

    // Get user's teams and roles overview
    async getUserTeamsAndRoles(userId, workspaceId, clientId) {
        try {
            console.log(`Getting teams and roles overview for user ${userId}`);

            // Step 1: Get user's role information
            const { data: user, error: userError } = await this.supabase
                .from("users")
                .select("id, name, email, roleIds:userRoles(id, name, description)")
                .eq("id", userId)
                .eq("clientId", clientId)
                .is("deletedAt", null)
                .single();

            if (userError) {
                if (userError.code === "PGRST116") {
                    return Promise.reject(new errors.NotFound("User not found."));
                }
                throw userError;
            }

            // Step 2: Get all teams the user is part of
            const { data: userTeamMemberships, error: membershipError } = await this.supabase
                .from("teamMembers")
                .select('team_id')
                .eq('user_id', userId);

            if (membershipError) {
                console.error("Error fetching team memberships:", membershipError);
                throw membershipError;
            }

            let teams = [];
            if (userTeamMemberships && userTeamMemberships.length > 0) {
                // Extract team IDs
                const teamIds = userTeamMemberships.map(membership => membership.team_id);

                // Fetch team details
                const { data: teamData, error: teamsError } = await this.supabase
                    .from("teams")
                    .select('id, name, description, icon, workspaceId, clientId, routingStrategy, createdAt')
                    .in('id', teamIds)
                    .eq('workspaceId', workspaceId)
                    .eq('clientId', clientId)
                    .is('deletedAt', null);

                if (teamsError) {
                    console.error("Error fetching team details:", teamsError);
                    throw teamsError;
                }

                teams = teamData || [];
            }

            // Step 3: Format the response
            const response = {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                },
                role: user.roleIds ? {
                    id: user.roleIds.id,
                    name: user.roleIds.name,
                    description: user.roleIds.description
                } : null,
                teams: teams.map(team => ({
                    id: team.id,
                    name: team.name,
                    description: team.description,
                    icon: team.icon,
                    routingStrategy: team.routingStrategy,
                    createdAt: team.createdAt
                }))
            };

            console.log(`Returning overview for user ${userId}: ${teams.length} teams`);
            return response;

        } catch (error) {
            console.error('Error getting user teams and roles:', error);
            return Promise.reject(this.handleError(error));
        }
    }
}

module.exports = UserService;
