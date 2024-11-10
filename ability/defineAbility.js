const { AbilityBuilder, PureAbility } = require('@casl/ability');
const UserRoles = require('../constants/UserRoles');

function defineAbilityFor(user) {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility);

  if (user.role === UserRoles.superAdmin) {
    can('manage', 'all');
  }

  return build();
}

module.exports = { defineAbilityFor };
