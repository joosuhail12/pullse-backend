const { AbilityBuilder, PureAbility } = require('@casl/ability');
const UserRoles = require('../constants/UserRoles');

const customConditionsMatcher = (conditions, resource) => {
  return Object.keys(conditions).every(key => conditions[key] === resource[key]);
};

function defineAbilityFor(user) {
  const { can, cannot, build } = new AbilityBuilder(PureAbility);

  console.log(`user: ${JSON.stringify(user)}`);


  if (user.role === UserRoles.superAdmin) {
    can('manage', 'all');
  }

  if (user.role === UserRoles.organizationAdmin) {
    can(['create', 'update', 'read'], 'Ticket', { clineId: user.clientId });
    can('manage', 'Profile');
    can('manage', 'ChatbotManagement', { clineId: user.clientId });
    can('manage', 'Workflow', { clineId: user.clientId });
    can('manage', 'Workspace', { clineId: user.clientId });
    can(['create', 'read', 'update'], 'Customer', { clineId: user.clientId });
    can(['create', 'read', 'update', 'archive'], 'Tag', { clineId: user.clientId });
    can(['create', 'read', 'update', 'archive'], 'Topic', { clineId: user.clientId });
    can('manage', 'Teams', { clineId: user.clientId });
    can('manage', 'User', { clineId: user.clientId });
    can('manage', 'DataModelling', { clineId: user.clientId });
    can(['create', 'read', 'update'], 'Sentiments', { clineId: user.clientId });
    can(['create', 'read', 'update'], 'Performance', { clineId: user.clientId });
    can(['create', 'read', 'update', 'delete'], 'Marcos', { clineId: user.clientId });
    can(['create', 'read', 'update', 'delete'], 'Reports', { clineId: user.clientId });
    can('manage', 'WorkspacePermission', { clineId: user.clientId });
    can('manage', 'DomainManagement', { clineId: user.clientId });

    // Inbox specific permissions
    can('read', 'InboxYour', { clineId: user.clientId });
    can('read', 'InboxMentions', { clineId: user.clientId });
    can('read', 'InboxAll', { clineId: user.clientId });
    can('read', 'InboxUnassigned', { clineId: user.clientId });
    can('read', 'InboxTeams', { clineId: user.clientId });
    can('read', 'InboxTeammates', { clineId: user.clientId });
  }

  if (user.role === UserRoles.workspaceAdmin) {
    can(['create', 'read'], 'Workspace', { clineId: user.clientId });
    can('manage', 'Profile');
    can(['create', 'update', 'read'], 'Ticket', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('manage', 'ChatbotManagement', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('manage', 'Workflow', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update'], 'Customer', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update', 'archive'], 'Tag', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update', 'archive'], 'Topic', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('manage', 'Teams', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'update', 'read'], 'User', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('manage', 'DataModelling', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update'], 'Sentiments', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update'], 'Performance', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update', 'delete'], 'Marcos', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update', 'delete'], 'Reports', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update', 'delete'], 'DomainManagement', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });

    // Inbox specific permissions
    can('read', 'InboxYour', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxMentions', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxAll', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxUnassigned', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxTeams', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'InboxTeammates', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
  }

  if (user.role === UserRoles.workspaceAgent) {
    // 🎯 AGENT SPECIFIC PERMISSIONS - Very Narrow Scope

    // Basic ticket access for agent's work
    can(['create', 'update', 'read'], 'Ticket', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update'], 'Customer', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });

    // Profile management
    can(['read', 'update'], 'Profile');

    // Basic workspace read access
    can('read', 'Workspace');

    // 🎯 SPECIFIC INBOX PERMISSIONS - Only Mentions and Your Inbox
    can('read', 'InboxYour', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId, userId: user.id });
    can('read', 'InboxMentions', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId, userId: user.id });

    // 🚫 EXPLICITLY DENY OTHER INBOX FEATURES
    // cannot('read', 'InboxAll');
    // cannot('read', 'InboxUnassigned');
    // cannot('read', 'InboxTeams');
    // cannot('read', 'InboxTeammates');

    // 🚫 DENY ALL OTHER MAJOR FEATURES
    cannot(['create', 'update', 'delete', 'manage'], 'ChatbotManagement');
    cannot(['create', 'update', 'delete', 'manage'], 'Workflow');
    cannot(['create', 'update', 'delete', 'manage'], 'User');
    cannot(['create', 'update', 'delete', 'manage'], 'DomainManagement');
    cannot(['create', 'update', 'delete'], 'Tag');
    cannot(['create', 'update', 'delete'], 'Topic');
    cannot(['create', 'update', 'delete'], 'Marcos');
    cannot(['create', 'update', 'delete'], 'Reports');
    cannot('manage', 'Workspace');
    cannot('read', 'Teams');
    cannot('read', 'DataModelling');
    cannot('read', 'Sentiments');
    cannot('read', 'Performance');
    cannot('read', 'Reports');
  }

  return build({
    conditionsMatcher: customConditionsMatcher,
  });
}

module.exports = { defineAbilityFor };