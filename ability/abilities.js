const UserRoles = require('../constants/UserRoles');

/**
 * Permissions by role using CASL actions and subjects.
 * This map is used by defineAbility to generate role-based abilities.
 */
module.exports = {
  [UserRoles.superAdmin]: {
    manage: ['all']
  },
  [UserRoles.organizationAdmin]: {
    manage: [
      'Ticket', 'Profile', 'ChatbotManagement', 'Workflow',
      'Workspace', 'Customer', 'Tag', 'Topic', 'Teams', 'User',
      'DataModelling', 'Sentiments', 'Performance', 'Marcos',
      'Reports', 'WorkspacePermission', 'DomainManagement',
      'ActionCenter', 'ChatbotProfile', 'Notifications',
      'CopilotProfile', 'CopilotChat', 'Tools', 'PreBuildAction',
      'Channel'
    ],
    read: [
      'InboxAll', 'InboxYour', 'InboxMentions', 'InboxUnassigned',
      'InboxTeams', 'InboxTeammates'
    ],
    invite: ['User'],
    import: ['Customer'],
    export: ['Customer']
  },
  [UserRoles.workspaceAdmin]: {
    manage: [
      'Profile', 'Ticket', 'ChatbotManagement', 'Workflow',
      'Customer', 'Tag', 'Topic', 'Teams', 'User', 'DataModelling',
      'Sentiments', 'Performance', 'Marcos', 'Reports',
      'WorkspacePermission', 'DomainManagement'
    ],
    read: [
      'Workspace', 'InboxAll', 'InboxYour', 'InboxMentions',
      'InboxUnassigned', 'InboxTeams', 'InboxTeammates'
    ],
    invite: ['User'],
    import: ['Customer'],
    export: ['Customer']
  },
  [UserRoles.workspaceAgent]: {
    read: [
      'Profile', 'Ticket', 'Workspace', 'Customer', 'InboxYour',
      'InboxMentions', 'InboxTeams'
    ],
    manage: [],
    import: ['Customer']
  },
  [UserRoles.supervisor]: {
    read: [
      'Profile', 'Workspace', 'Workflow', 'InboxAll', 'InboxYour',
      'InboxMentions', 'InboxUnassigned', 'InboxTeams', 'InboxTeammates',
      'Ticket', 'Customer', 'Tag', 'Topic', 'Marcos'
    ],
    manage: ['Marcos']
  },
  [UserRoles.viewer]: {
    read: [
      'Profile', 'Workspace', 'InboxAll', 'InboxYour', 'InboxMentions',
      'InboxUnassigned', 'InboxTeams', 'InboxTeammates', 'Ticket',
      'Customer', 'Tag', 'Topic', 'Teams', 'User'
    ],
    manage: []
  },
  [UserRoles.visitor]: {
    read: [
      'Profile', 'Ticket', 'Customer', 'Tag', 'Topic', 'Teams', 'User',
      'Workspace', 'InboxAll', 'InboxYour', 'InboxMentions',
      'InboxUnassigned', 'InboxTeams', 'InboxTeammates'
    ],
    manage: []
  }
};
