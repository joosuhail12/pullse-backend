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

    can(['create', 'update', 'read'], 'Ticket', { clientId: user.clientId });

    // ADD THESE MISSING INBOX PERMISSIONS:
    can('read', 'InboxAll', { clientId: user.clientId });
    can('read', 'InboxYour', { clientId: user.clientId });
    can('read', 'InboxMentions', { clientId: user.clientId });
    can('read', 'InboxUnassigned', { clientId: user.clientId });
    can('read', 'InboxTeams', { clientId: user.clientId });
    can('read', 'InboxTeammates', { clientId: user.clientId });

    can('manage', 'Profile');
    can('manage', 'ChatbotManagement', { clientId: user.clientId });
    can('manage', 'Workflow', { clientId: user.clientId });
    can('manage', 'Workspace', { clientId: user.clientId });
    can(['create', 'read', 'update'], 'Customer', { clientId: user.clientId });
    can(['create', 'read', 'update', 'archive'], 'Tag', { clientId: user.clientId });
    can(['create', 'read', 'update', 'archive'], 'Topic', { clientId: user.clientId });
    can('manage', 'Teams', { clientId: user.clientId });
    can('manage', 'User', { clientId: user.clientId });
    can('manage', 'DataModelling', { clientId: user.clientId });
    can(['create', 'read', 'update'], 'Sentiments', { clientId: user.clientId });
    can(['create', 'read', 'update'], 'Performance', { clientId: user.clientId });
    can(['create', 'read', 'update', 'delete'], 'Marcos', { clientId: user.clientId });
    can(['create', 'read', 'update', 'delete'], 'Reports', { clientId: user.clientId });
    can(['create', 'read'], 'Workspace', { clientId: user.clientId });
    can('manage', 'WorkspacePermission', { clientId: user.clientId });
  }

  if (user.role === UserRoles.workspaceAdmin) {
    can(['create', 'read'], 'Workspace', { clientId: user.clientId });
    can('manage', 'Profile');
    can(['create', 'update', 'read'], 'Ticket', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('manage', 'ChatbotManagement', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('manage', 'Workflow', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update'], 'Customer', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update', 'archive'], 'Tag', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update', 'archive'], 'Topic', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('manage', 'Teams', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'update', 'read'], 'User', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('manage', 'DataModelling', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update'], 'Sentiments', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update'], 'Performance', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update', 'delete'], 'Marcos', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update', 'delete'], 'Reports', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read'], 'Workspace', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('manage', 'WorkspacePermission', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
  }

  if (user.role === UserRoles.workspaceAgent) {
    can(['read', 'update'], 'Profile');
    can(['create', 'update', 'read'], 'Ticket', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId, userId: user.id });
    can('read', 'Workspace', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxYour', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId, userId: user.id });
    can('read', 'InboxMentions', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId, userId: user.id });

    // only for testing
    // can('read', 'InboxAll', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
    // 🚫 EXPLICITLY DENY contact creation for agents
    cannot(['create', 'update', 'delete', 'archive'], 'Customer');
    // Only allow reading contacts
    can('read', 'Customer', { clientId: user.clientId, workspaceId: user.defaultWorkspaceId });

    // Deny other management actions
    cannot(['create', 'update', 'delete', 'manage'], 'ChatbotManagement');
    cannot(['create', 'update', 'delete', 'manage'], 'Workflow');
    cannot(['create', 'update', 'delete', 'manage'], 'User');
    cannot(['create', 'update', 'delete', 'manage'], 'DomainManagement');
    cannot(['create', 'update', 'delete'], 'Tag');
    cannot(['create', 'update', 'delete'], 'Topic');
    cannot(['create', 'update', 'delete'], 'Teams');
    cannot(['create', 'update', 'delete'], 'DataModelling');
    cannot(['create', 'update', 'delete'], 'Sentiments');
    cannot(['create', 'update', 'delete'], 'Performance');
    cannot(['create', 'update', 'delete'], 'Marcos');
    cannot(['create', 'update', 'delete'], 'Reports');
    cannot(['create', 'update', 'delete', 'manage'], 'WorkspacePermission');
  }

  return build({ conditionsMatcher: customConditionsMatcher });
}

module.exports = { defineAbilityFor };