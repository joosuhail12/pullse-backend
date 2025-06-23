const { AbilityBuilder, PureAbility } = require('@casl/ability');
const UserRoles = require('../constants/UserRoles');

const customConditionsMatcher = (conditions, resource) => {
  return Object.keys(conditions).every(key => conditions[key] === resource[key]);
};

// Enhanced backend defineAbility function
function defineAbilityFor(user) {
  const { can, cannot, build } = new AbilityBuilder(PureAbility);

  if (user.role === UserRoles.superAdmin) {
    can('manage', 'all');
  }

  if (user.role === UserRoles.organizationAdmin) {
    // In your backend defineAbilityFor function, update organizationAdmin section:

    // Ticket permissions
    can(['create', 'update', 'read', 'delete'], 'Ticket', { clientId: user.clientId });
    cannot('archive', 'Ticket');

    // Profile permissions
    can(['create', 'update', 'read', 'delete'], 'Profile');
    cannot('archive', 'Profile');

    // ChatbotManagement permissions
    can(['create', 'update', 'read', 'delete'], 'ChatbotManagement', { clientId: user.clientId });
    cannot('archive', 'ChatbotManagement');

    // Workflow permissions
    can(['create', 'update', 'read', 'delete'], 'Workflow', { clientId: user.clientId });
    cannot('archive', 'Workflow');

    // Workspace permissions
    can(['create', 'update', 'read', 'delete', 'manage'], 'Workspace', { clientId: user.clientId });
    cannot('archive', 'Workspace');

    // Customer permissions
    can(['create', 'update', 'read'], 'Customer', { clientId: user.clientId });
    cannot(['delete', 'archive'], 'Customer');

    // Tag permissions
    can(['create', 'read', 'update', 'delete', 'archive'], 'Tag', { clientId: user.clientId });

    // Topic permissions
    can(['create', 'read', 'update', 'delete', 'archive'], 'Topic', { clientId: user.clientId });

    // Teams permissions
    can(['create', 'update', 'read', 'delete'], 'Teams', { clientId: user.clientId });
    cannot('archive', 'Teams');

    // User permissions
    can(['create', 'update', 'read', 'delete'], 'User', { clientId: user.clientId });
    cannot('archive', 'User');

    // DataModelling permissions
    can(['create', 'update', 'read', 'delete'], 'DataModelling', { clientId: user.clientId });
    cannot('archive', 'DataModelling');

    // Sentiments permissions
    can(['create', 'read', 'update'], 'Sentiments', { clientId: user.clientId });
    cannot(['delete', 'archive'], 'Sentiments');

    // Performance permissions
    can(['create', 'read', 'update'], 'Performance', { clientId: user.clientId });
    cannot(['delete', 'archive'], 'Performance');

    // Marcos permissions
    can(['create', 'read', 'update', 'delete'], 'Marcos', { clientId: user.clientId });
    cannot('archive', 'Marcos');

    // Reports permissions
    can(['create', 'read', 'update', 'delete'], 'Reports', { clientId: user.clientId });
    cannot('archive', 'Reports');

    // WorkspacePermission permissions
    can(['create', 'update', 'read', 'delete'], 'WorkspacePermission', { clientId: user.clientId });
    cannot('archive', 'WorkspacePermission');

    // DomainManagement permissions
    can(['create', 'update', 'read', 'delete'], 'DomainManagement', { clientId: user.clientId });
    cannot('archive', 'DomainManagement');

    // ADD THESE MISSING INBOX PERMISSIONS:
    can('read', 'InboxAll', { clientId: user.clientId });
    can('read', 'InboxYour', { clientId: user.clientId });
    can('read', 'InboxMentions', { clientId: user.clientId });
    can('read', 'InboxUnassigned', { clientId: user.clientId });
    can('read', 'InboxTeams', { clientId: user.clientId });
    // Add missing inbox permissions
    can('read', 'InboxTeammates', { clientId: user.clientId });

    // Add missing action mappings
    can('invite', 'User', { clientId: user.clientId });
    can('import', 'Customer', { clientId: user.clientId });
    can('export', 'Customer', { clientId: user.clientId });
    can('manage', 'ActionCenter', { clientId: user.clientId });
    can('manage', 'ChatbotProfile', { clientId: user.clientId });
    can('manage', 'Notifications', { clientId: user.clientId });
    can('manage', 'CopilotProfile', { clientId: user.clientId });
    can('manage', 'CopilotChat', { clientId: user.clientId });
    // can('manage', 'Profile');
    // can('manage', 'ChatbotManagement', { clientId: user.clientId });
    // can('manage', 'Workflow', { clientId: user.clientId });
    // can('manage', 'Workspace', { clientId: user.clientId });
    // can(['create', 'read', 'update'], 'Customer', { clientId: user.clientId });
    // can(['create', 'read', 'update', 'archive'], 'Tag', { clientId: user.clientId });
    // can(['create', 'read', 'update', 'archive'], 'Topic', { clientId: user.clientId });
    // can('manage', 'Teams', { clientId: user.clientId });
    // can('manage', 'User', { clientId: user.clientId });
    // can('manage', 'DataModelling', { clientId: user.clientId });
    // can(['create', 'read', 'update'], 'Sentiments', { clientId: user.clientId });
    // can(['create', 'read', 'update'], 'Performance', { clientId: user.clientId });
    // can(['create', 'read', 'update', 'delete'], 'Marcos', { clientId: user.clientId });
    // can(['create', 'read', 'update', 'delete'], 'Reports', { clientId: user.clientId });
    // can(['create', 'read'], 'Workspace', { clientId: user.clientId });
    // can('manage', 'WorkspacePermission', { clientId: user.clientId });
  }

  if (user.role === UserRoles.workspaceAdmin) {
    // Workspace permissions
    can(['create', 'read'], 'Workspace', { clientId: user.clientId });
    cannot(['update', 'delete', 'archive'], 'Workspace');

    // Profile permissions
    can(['create', 'update', 'read', 'delete'], 'Profile');
    cannot('archive', 'Profile');

    // Ticket permissions
    can(['create', 'update', 'read', 'delete'], 'Ticket', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot('archive', 'Ticket');

    // ChatbotManagement permissions
    can(['create', 'update', 'read', 'delete'], 'ChatbotManagement', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot('archive', 'ChatbotManagement');

    // Workflow permissions
    can(['create', 'update', 'read', 'delete'], 'Workflow', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot('archive', 'Workflow');

    // Customer permissions
    can(['create', 'read', 'update'], 'Customer', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot(['delete', 'archive'], 'Customer');

    // Tag permissions
    can(['create', 'read', 'update', 'delete', 'archive'], 'Tag', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });

    // Topic permissions
    can(['create', 'read', 'update', 'delete', 'archive'], 'Topic', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });

    // Teams permissions
    can(['create', 'update', 'read', 'delete'], 'Teams', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot('archive', 'Teams');

    // User permissions
    can(['create', 'update', 'read', 'delete'], 'User', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot('archive', 'User');

    // DataModelling permissions
    can(['create', 'update', 'read', 'delete'], 'DataModelling', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot('archive', 'DataModelling');

    // Sentiments permissions
    can(['create', 'read', 'update'], 'Sentiments', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot(['delete', 'archive'], 'Sentiments');

    // Performance permissions
    can(['create', 'read', 'update'], 'Performance', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot(['delete', 'archive'], 'Performance');

    // Marcos permissions
    can(['create', 'read', 'update', 'delete'], 'Marcos', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot('archive', 'Marcos');

    // Reports permissions
    can(['create', 'read', 'update', 'delete'], 'Reports', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot('archive', 'Reports');

    // WorkspacePermission permissions
    can(['create', 'update', 'read', 'delete'], 'WorkspacePermission', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot('archive', 'WorkspacePermission');

    // DomainManagement permissions
    can(['create', 'read', 'update', 'delete'], 'DomainManagement', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot('archive', 'DomainManagement');

    // Inbox permissions
    can('read', 'InboxAll', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxYour', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxMentions', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxUnassigned', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxTeams', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxTeammates', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });

    // Add missing action mappings
    can('invite', 'User', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('import', 'Customer', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('export', 'Customer', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });

    // Explicitly deny create/update/delete/archive for all Inbox entities
    cannot(['create', 'update', 'delete', 'archive'], 'InboxAll');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxYour');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxMentions');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxUnassigned');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxTeams');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxTeammates');
  }

  if (user.role === UserRoles.workspaceAgent) {
    // Profile permissions
    can(['read', 'update'], 'Profile');
    cannot(['create', 'delete', 'archive'], 'Profile');

    // Ticket permissions
    can(['create', 'update', 'read', 'delete'], 'Ticket', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId, userId: user.id });
    cannot('archive', 'Ticket');

    // Workspace permissions
    can('read', 'Workspace', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot(['create', 'update', 'delete', 'archive'], 'Workspace');

    // Customer permissions - CRUD allowed for agents
    can(['create', 'read', 'update', 'delete'], 'Customer', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot('archive', 'Customer'); // Only deny archive, allow CRUD
    // cannot('read', 'Customer');

    // Inbox permissions - limited access
    can('read', 'InboxYour', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId, userId: user.id });
    can('read', 'InboxMentions', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId, userId: user.id });
    can('read', 'InboxTeams', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId, userId: user.id });

    // only for testing
    // can('read', 'InboxAll', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });

    // Currently agents can't create contacts but frontend allows it
    // EITHER allow it:
    can('import', 'Customer', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    // can('export', 'Customer', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });


    // Deny access to other inbox types
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'InboxAll');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxYour');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxMentions');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'InboxUnassigned');
    // cannot(['create', 'update', 'delete', 'archive', 'read'], 'InboxTeams');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'InboxTeammates');

    // Deny other management actions (but NOT Customer)
    cannot(['create', 'update', 'delete', 'manage', 'archive', 'read'], 'ChatbotManagement');
    cannot(['create', 'update', 'delete', 'manage', 'archive', 'read'], 'Workflow');
    cannot(['create', 'update', 'delete', 'manage', 'archive', 'read'], 'User');
    cannot(['create', 'update', 'delete', 'manage', 'archive', 'read'], 'DomainManagement');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'Tag');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'Topic');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'Teams');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'DataModelling');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'Sentiments');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'Performance');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'Marcos');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'Reports');
    cannot(['create', 'update', 'delete', 'manage', 'archive', 'read'], 'WorkspacePermission');
  }

  if (user.role === UserRoles.visitor) {
    // Visitor role - read-only access to tickets and related data

    // Profile permissions - basic read/update of own profile
    can(['read', 'update'], 'Profile');
    cannot(['create', 'delete', 'archive'], 'Profile');

    // Ticket permissions - read-only access to tickets
    can('read', 'Ticket', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot(['create', 'update', 'delete', 'archive'], 'Ticket');

    // Customer permissions - read-only access to view ticket-related customer info
    can('read', 'Customer', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot(['create', 'update', 'delete', 'archive'], 'Customer');

    // Tag permissions - read-only to view ticket tags
    can('read', 'Tag', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot(['create', 'update', 'delete', 'archive'], 'Tag');

    // Topic permissions - read-only to view ticket topics
    can('read', 'Topic', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot(['create', 'update', 'delete', 'archive'], 'Topic');

    // Teams permissions - read-only to view team assignments
    can('read', 'Teams', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot(['create', 'update', 'delete', 'archive'], 'Teams');

    // User permissions - read-only to view assignees
    can('read', 'User', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot(['create', 'update', 'delete', 'archive', 'invite'], 'User');

    // Workspace permissions - read-only access
    can('read', 'Workspace', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    cannot(['create', 'update', 'delete', 'archive'], 'Workspace');

    // Inbox permissions - read-only access to relevant inboxes
    can('read', 'InboxAll', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxYour', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId, userId: user.id });
    can('read', 'InboxMentions', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId, userId: user.id });
    can('read', 'InboxUnassigned', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxTeams', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxTeammates', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });

    // Deny all create/update/delete/archive for inbox entities
    cannot(['create', 'update', 'delete', 'archive'], 'InboxAll');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxYour');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxMentions');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxUnassigned');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxTeams');
    cannot(['create', 'update', 'delete', 'archive'], 'InboxTeammates');

    // Completely deny access to management/admin features
    cannot(['create', 'update', 'delete', 'manage', 'archive', 'read'], 'ChatbotManagement');
    cannot(['create', 'update', 'delete', 'manage', 'archive', 'read'], 'Workflow');
    cannot(['create', 'update', 'delete', 'manage', 'archive', 'read'], 'DomainManagement');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'DataModelling');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'Sentiments');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'Performance');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'Marcos');
    cannot(['create', 'update', 'delete', 'archive', 'read'], 'Reports');
    cannot(['create', 'update', 'delete', 'manage', 'archive', 'read'], 'WorkspacePermission');

    // Deny import/export operations
    cannot(['import', 'export'], 'Customer');
  }

  return build({ conditionsMatcher: customConditionsMatcher });
}

module.exports = { defineAbilityFor };