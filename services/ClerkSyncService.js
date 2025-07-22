const { createClient } = require('@supabase/supabase-js');
const clerkClient = require('../config/clerkClient');
const PullseCrmService = require('./PullseCrmService');
const BaseService = require('./BaseService');
const bcrypt = require('bcrypt');

class ClerkSyncService extends BaseService {
    constructor() {
        super();
        this.pullseCrmService = new PullseCrmService();
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }

    /**
     * Create user in Clerk and set up complete workspace
     * Takes user data, creates in Clerk, then sets up internal workspace
     */
    async createClerkUserAndOrganization(userData) {
        try {
            const { firstName, lastName, username, email, password, companyName } = userData;

            // Validate required fields
            if (!firstName || !lastName || !username || !email || !password || !companyName) {
                throw new Error('All fields are required: firstName, lastName, username, email, password, companyName');
            }

            console.log('🔄 Starting complete Clerk user creation for:', email, 'Username:', username);

            // Check if username already exists in our database (safety check)
            const { data: existingUser } = await this.supabase
                .from('users')
                .select('id, name, email')
                .or(`name.eq.${username},email.eq.${email}`)
                .single();

            if (existingUser) {
                if (existingUser.email === email) {
                    throw new Error(`Email "${email}" already exists in database`);
                }
                if (existingUser.name === username) {
                    throw new Error(`Username "${username}" already exists in database`);
                }
            }

            // 1. Create user in Clerk
            const clerkUser = await clerkClient.users.createUser({
                firstName,
                lastName,
                username,
                emailAddress: [email],
                password,
                publicMetadata: {
                    createdBy: 'pullse-backend',
                    companyName: companyName
                }
            });

            console.log('✅ Clerk user created:', clerkUser.id);

            // 2. Create organization in Clerk (user is automatically added as admin)
            const clerkOrg = await clerkClient.organizations.createOrganization({
                name: companyName,
                createdBy: clerkUser.id,
                publicMetadata: {
                    createdBy: 'pullse-backend',
                    createdAt: new Date().toISOString(),
                    companyName: companyName
                }
            });

            console.log('✅ Clerk organization created:', clerkOrg.id, '(user automatically added as admin)');

            // 4. Use existing PullseCrmService to create our internal structure
            const fullName = `${firstName} ${lastName}`;
            const orgResult = await this.pullseCrmService.createNewUser({
                name: fullName,
                email: email,
                company_name: companyName
            });

            if (orgResult.error) {
                console.error('Error creating internal organization:', orgResult);
                // Clean up Clerk user and org
                await clerkClient.users.deleteUser(clerkUser.id);
                await clerkClient.organizations.deleteOrganization(clerkOrg.id);
                throw new Error(orgResult.message || 'Internal organization creation failed');
            }

            console.log('✅ Internal organization created via PullseCrmService');

            // 5. Update our user record with Clerk IDs and username
            const { data: updatedUser, error: updateError } = await this.supabase
                .from('users')
                .update({
                    clerkUserId: clerkUser.id,
                    clerkOrgId: clerkOrg.id,
                    name: username, // Store username in name column
                    password: null // Remove password since Clerk handles auth now
                })
                .eq('email', email)
                .select()
                .single();

            if (updateError) {
                console.error('Error updating user with Clerk IDs:', updateError);
                // Clean up Clerk user and org
                await clerkClient.users.deleteUser(clerkUser.id);
                await clerkClient.organizations.deleteOrganization(clerkOrg.id);
                throw updateError;
            }

            // 6. Update Clerk user with our internal data
            await clerkClient.users.updateUser(clerkUser.id, {
                publicMetadata: {
                    ...clerkUser.publicMetadata,
                    internalUserId: updatedUser.id,
                    clientId: updatedUser.clientId,
                    workspaceId: updatedUser.defaultWorkspaceId,
                    setupComplete: true
                }
            });

            // 7. Update Clerk org with our internal data
            await clerkClient.organizations.updateOrganization(clerkOrg.id, {
                publicMetadata: {
                    ...clerkOrg.publicMetadata,
                    internalClientId: updatedUser.clientId,
                    internalWorkspaceId: updatedUser.defaultWorkspaceId
                }
            });

            console.log('✅ Complete user and organization creation finished successfully');

            return {
                success: true,
                data: {
                    clerkUser: {
                        id: clerkUser.id,
                        email: clerkUser.emailAddresses[0]?.emailAddress,
                        firstName: clerkUser.firstName,
                        lastName: clerkUser.lastName,
                        username: clerkUser.username
                    },
                    clerkOrganization: {
                        id: clerkOrg.id,
                        name: clerkOrg.name
                    },
                    internal: {
                        userId: updatedUser.id,
                        clientId: updatedUser.clientId,
                        workspaceId: updatedUser.defaultWorkspaceId,
                        username: updatedUser.name,
                        fullName: `${updatedUser.fName} ${updatedUser.lName}`,
                        companyName: companyName
                    },
                    credentials: {
                        email: email,
                        canLoginWithClerk: true,
                        adminEmail: orgResult.emailAddress
                    }
                },
                message: 'User and organization created successfully! You can now login with Clerk.'
            };

        } catch (error) {
            console.error('❌ Error in createClerkUserAndOrganization:', error);
            return this.handleError({
                error: true,
                message: error.message || "Failed to create Clerk user and organization",
                data: error,
                httpCode: 400,
                code: "CLERK_USER_CREATION_ERROR"
            });
        }
    }

    /**
     * Get user's organizations from Clerk for org switcher
     */
    async getUserOrganizations(clerkUserId) {
        try {
            const organizationMemberships = await clerkClient.users.getUserOrganizationMembershipList({
                userId: clerkUserId
            });

            const orgs = organizationMemberships.data.map(membership => ({
                id: membership.organization.id,
                name: membership.organization.name,
                role: membership.role,
                publicMetadata: membership.organization.publicMetadata
            }));

            return { success: true, data: orgs };

        } catch (error) {
            console.error('Error fetching user organizations:', error);
            return this.handleError(error);
        }
    }
}

module.exports = ClerkSyncService; 