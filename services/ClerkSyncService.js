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

    /**
     * Send an admin invitation via Clerk
     */
    // services/ClerkService.ts
    async inviteAdmin({ email, firstName, lastName, companyName, redirectUrl = null }) {
        try {
            if (!email || !firstName || !lastName || !companyName) {
                throw new Error('email, firstName, lastName, companyName are required');
            }

            const invitation = await clerkClient.invitations.createInvitation({
                emailAddress: email,
                role: 'org:admin',
                redirectUrl: redirectUrl || 'http://localhost:5173/sign-up/onboarding',
                notify: true,
                publicMetadata: {
                    invited_admin_flow: true,
                    companyName,
                    fullName: `${firstName} ${lastName}`,
                },
                // only for testing purposes
                // ignore_existing: false,
            });

            return {
                success: true,
                data: invitation,
                message: 'Invitation sent successfully.',
            };
        } catch (error) {
            return this.handleError(error);
        }
    }


    /**
     * Handle Clerk webhooks (organization.created or membership.created)
     */
    async handleWebhook(event) {
        try {
            const { type, data } = event;

            // Only act on organization.created events where invited_admin_flow flag is true
            if (type === 'organization.created') {
                const org = data;
                const adminUser = org.createdBy; // clerk user id

                // Check metadata flag transferred from invitation
                if (org.publicMetadata?.invited_admin_flow) {
                    // Extract company name from metadata if available
                    const companyName = org.publicMetadata.companyName || org.name;

                    // Fetch user to get names, username and email
                    const clerkUser = await clerkClient.users.getUser(adminUser);

                    const payload = {
                        firstName: clerkUser.firstName,
                        lastName: clerkUser.lastName,
                        username: clerkUser.username,
                        email: clerkUser.emailAddresses[0]?.emailAddress,
                        companyName,
                        // Generate a random strong password (user will login via Clerk)
                        password: 'TempPassword1!'
                    };

                    // Call internal creation to sync DB / workspace
                    return await this.createClerkUserAndOrganization(payload);
                }
            }
            return { success: true, message: 'Event ignored' };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * More robust handler for organization.created webhook, designed for the invited admin flow.
     * This logic is intended to be triggered after an invited admin signs up and creates an organization.
     */
    async handleOrgCreatedWebhook(event) {
        try {
            if (event.type !== "organization.created") {
                return { success: true, message: `Event ignored: ${event.type}` };
            }

            const { id, created_by, public_metadata, name } = event.data;
            const orgId = id;
            const orgName = name;

            // Add retry logic for user lookup
            let clerkUser;
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    clerkUser = await clerkClient.users.getUser(created_by);
                    break; // Success, exit retry loop
                } catch (error) {
                    attempts++;
                    if (error.status === 404 && attempts < maxAttempts) {
                        console.log(`User ${created_by} not found, retrying in 2 seconds... (attempt ${attempts}/${maxAttempts})`);
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                        continue;
                    } else {
                        throw error; // Re-throw if not a 404 or max attempts reached
                    }
                }
            }

            console.log('🔄 Clerk user found:', clerkUser);


            if (!clerkUser) {
                throw new Error(`User ${created_by} not found after ${maxAttempts} attempts`);
            }

            const email = clerkUser.emailAddresses?.[0]?.emailAddress;
            const companyName = clerkUser.publicMetadata?.companyName || orgName; // Fallback to org name
            const fullName = clerkUser.publicMetadata?.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
            const username = clerkUser.username || email?.split('@')[0]; // Fallback to email prefix

            if (!email) {
                const errorMessage = "No email address found for the user";
                console.warn(errorMessage, { userId: clerkUser.id, user: clerkUser });
                return this.handleError({
                    error: true,
                    message: errorMessage,
                    httpCode: 400,
                    code: "NO_EMAIL_ADDRESS_FOUND"
                });
            }

            if (!fullName) {
                const errorMessage = "No full name found for the user";
                console.warn(errorMessage, { userId: clerkUser.id, metadata: clerkUser.publicMetadata });
                return this.handleError({
                    error: true,
                    message: errorMessage,
                    httpCode: 400,
                    code: "NO_FULL_NAME_FOUND"
                });
            }

            console.log('🔄 Processing organization.created webhook for:', { email, username, companyName, fullName });

            const orgResult = await this.pullseCrmService.createNewUser({
                name: fullName,
                email: email,
                company_name: companyName,
            });

            if (orgResult.error) {
                console.error('Error creating internal user/org structure:', orgResult);
                // Only cleanup if we're sure the Clerk entities exist
                try {
                    await clerkClient.users.deleteUser(clerkUser.id);
                    await clerkClient.organizations.deleteOrganization(orgId);
                } catch (cleanupError) {
                    console.error('Error during cleanup:', cleanupError);
                }
                throw new Error(orgResult.message || 'Internal organization creation failed, rolling back Clerk entities.');
            }

            console.log('✅ Internal user/org structure created via PullseCrmService.');

            const { data: updatedUser, error: updateError } = await this.supabase
                .from("users")
                .update({
                    clerkUserId: clerkUser.id,
                    clerkOrgId: orgId,
                    name: fullName,
                    password: null,
                })
                .eq("email", email)
                .select()
                .single();

            if (updateError) {
                console.error("Failed to update user in Supabase with Clerk IDs:", updateError);
                // Cleanup with error handling
                try {
                    await clerkClient.users.deleteUser(clerkUser.id);
                    await clerkClient.organizations.deleteOrganization(orgId);
                } catch (cleanupError) {
                    console.error('Error during cleanup:', cleanupError);
                }
                return this.handleError({
                    error: true,
                    message: "Error syncing user/org to DB. Clerk entities have been rolled back.",
                    data: updateError,
                    httpCode: 500,
                    code: "DB_SYNC_ERROR"
                });
            }

            // Update Clerk metadata
            try {
                await clerkClient.users.updateUser(clerkUser.id, {
                    publicMetadata: {
                        ...clerkUser.publicMetadata,
                        internalUserId: updatedUser.id,
                        clientId: updatedUser.clientId,
                        workspaceId: updatedUser.defaultWorkspaceId,
                        setupComplete: true
                    }
                });

                await clerkClient.organizations.updateOrganization(orgId, {
                    publicMetadata: {
                        ...public_metadata,
                        internalClientId: updatedUser.clientId,
                        internalWorkspaceId: updatedUser.defaultWorkspaceId
                    }
                });

                console.log('✅ Clerk user and organization metadata updated with internal IDs.');
            } catch (metadataError) {
                console.error('Error updating Clerk metadata (non-critical):', metadataError);
                // Don't fail the whole process for metadata updates
            }

            return {
                success: true,
                message: "User and Organization synced successfully."
            };

        } catch (error) {
            console.error('❌ Error in handleOrgCreatedWebhook:', error);
            return this.handleError({
                error: true,
                message: error.message || "Failed to handle organization created webhook",
                data: error,
                httpCode: 500,
                code: "ORG_CREATED_WEBHOOK_ERROR"
            });
        }
    }
}

module.exports = ClerkSyncService; 