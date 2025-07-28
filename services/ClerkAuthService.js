const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const clerkClient = require('../config/clerkClient');
const BaseService = require('./BaseService');
const errors = require('../errors');

class ClerkAuthService extends BaseService {
    constructor() {
        super();
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }

    /**
     * Login using Clerk session token but return same format as AuthService.login()
     * This maintains compatibility with existing frontend logic
     */
    async loginWithClerk(clerkSessionToken, userAgent = null, ip = null) {
        try {
            console.log('🔐 Processing Clerk login...');

            // 1. Verify Clerk session token and get user
            const clerkUser = await clerkClient.verifyToken(clerkSessionToken);

            if (!clerkUser || !clerkUser.sub) {
                throw new errors.InvalidCredentials('Invalid Clerk session token');
            }

            const clerkUserId = clerkUser.sub;
            console.log('✅ Clerk token verified for user:', clerkUserId);

            // 2. Get our internal user record
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .select('*')
                .eq('clerkUserId', clerkUserId)
                .single();

            if (userError || !user) {
                throw new errors.NotFound('User not found in internal database');
            }

            if (!user.defaultWorkspaceId) {
                throw new Error('Workspace not found for user');
            }

            // 3. Check workspace permissions
            const { data: permission } = await this.supabase
                .from('workspacePermissions')
                .select('*')
                .eq('userId', user.id)
                .eq('workspaceId', user.defaultWorkspaceId)
                .single();

            if (!permission?.access) {
                throw new Error('Access not allowed to this workspace. Please contact admin.');
            }

            // 4. Create access token (same format as original AuthService)
            const accessToken = {
                token: uuidv4(),
                expiry: Date.now() + (1 * 60 * 60 * 1000), // 1 hour from now
                issuedAt: new Date(),
                userAgent,
                ip
            };

            // 5. Store access token in database
            await this.supabase.from('userAccessTokens').insert({
                user_id: user.id,
                token: accessToken.token,
                issuedAt: accessToken.issuedAt,
                expiry: new Date(accessToken.expiry),
                userAgent: accessToken.userAgent,
                ip: accessToken.ip
            });

            // 6. Return EXACT same format as AuthService.login()
            return {
                id: user.id,
                accessToken,
                roleIds: user.roleIds,
                firstName: user.fName,  // Note: mapping fName to firstName
                lastName: user.lName,   // Note: mapping lName to lastName
                defaultWorkspaceId: user.defaultWorkspaceId
            };

        } catch (error) {
            console.error('❌ Clerk login error:', error);
            return this.handleError(error);
        }
    }

    /**
     * Get Clerk user info and sync with our records
     * Useful for getting current user data
     */
    async getCurrentClerkUser(clerkSessionToken) {
        try {
            const clerkUser = await clerkClient.verifyToken(clerkSessionToken);

            if (!clerkUser || !clerkUser.sub) {
                throw new errors.InvalidCredentials('Invalid Clerk session token');
            }

            // Get full Clerk user data
            const fullClerkUser = await clerkClient.users.getUser(clerkUser.sub);

            // Get our internal user data
            const { data: internalUser } = await this.supabase
                .from('users')
                .select('*')
                .eq('clerkUserId', clerkUser.sub)
                .single();

            return {
                success: true,
                data: {
                    clerkUser: {
                        id: fullClerkUser.id,
                        email: fullClerkUser.emailAddresses[0]?.emailAddress,
                        firstName: fullClerkUser.firstName,
                        lastName: fullClerkUser.lastName,
                        publicMetadata: fullClerkUser.publicMetadata
                    },
                    internalUser: internalUser
                }
            };

        } catch (error) {
            console.error('Error getting current Clerk user:', error);
            return this.handleError(error);
        }
    }

    /**
     * Logout - revoke access token
     * Same behavior as original AuthService but for Clerk users
     */
    async logoutClerkUser(accessToken) {
        try {
            // Remove the access token from database
            await this.supabase
                .from('userAccessTokens')
                .delete()
                .eq('token', accessToken);

            return { message: "Logged out successfully" };

        } catch (error) {
            console.error('Error during Clerk logout:', error);
            return this.handleError(error);
        }
    }

    /**
     * Check token validity (same as AuthService.checkClerkToken but for Clerk users)
     */
    async checkClerkToken(token) {
        try {
            // Fetch user based on the token
            let { data: session, error: sessionError } = await this.supabase
                .from('userAccessTokens')
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
            let { data: user, error: userError } = await this.supabase
                .from('users')
                .select('id, email, fName, lName, name, defaultWorkspaceId, clientId, clerkUserId')
                .eq('id', session.user_id)
                .single();

            if (userError || !user) {
                return Promise.reject(new errors.Unauthorized());
            }

            // Fetch user role from workspacePermissions
            let { data: permission, error: permissionError } = await this.supabase
                .from('workspacePermissions')
                .select('role')
                .eq('userId', user.id)
                .eq('workspaceId', user.defaultWorkspaceId)
                .single();

            return {
                ...user,
                role: permission?.role || null,
            };

        } catch (error) {
            console.error('Error checking Clerk token:', error);
            return this.handleError(error);
        }
    }
}

module.exports = ClerkAuthService; 