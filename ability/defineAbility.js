const { AbilityBuilder, PureAbility } = require('@casl/ability');
const UserRoles = require('../constants/UserRoles');
const customConditionsMatcher = (conditions, resource) => {
  return Object.keys(conditions).every(key => conditions[key] === resource[key]);
};

function defineAbilityFor(user) {
  console.log(user, 'defineAbilityFor')
  const { can, build } = new AbilityBuilder(PureAbility);
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
    can(['create', 'read'], 'Workspace', { clineId: user.clientId });
    can('manage', 'WorkspacePermission', { clineId: user.clientId });
    can('manage', 'DomainManagement', { clineId: user.clientId });
    can('manage', 'SenderEmailAddress', { clineId: user.clientId });
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
    can(['create', 'read', 'update', 'delete'], 'SenderEmailAddress', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
  }
  if (user.role === UserRoles.workspaceAgent) {
    can(['create', 'update', 'read'], 'Ticket', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['create', 'read', 'update'], 'Customer', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['read'], 'Tag', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['read'], 'Topic', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['read'], 'Teams', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['read'], 'DataModelling', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['read'], 'Sentiments', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['read'], 'Performance', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['read'], 'Marcos', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can(['read'], 'Reports', { clineId: user.clientId, workspaceId: user.defaultWorkspaceId });
    can('read', 'Workspace');
    can(['read', 'update'], 'Profile');
  }
  return build({
    conditionsMatcher: customConditionsMatcher,
  });
}

module.exports = { defineAbilityFor };
