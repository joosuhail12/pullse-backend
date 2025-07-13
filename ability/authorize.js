// authorize.js
const { defineAbilityFor } = require('./defineAbility');
function authorize(action, resource) {
  return (req, res, next) => {
    const user = req.user; // assuming user information is attached to `req.user` after authentication

    // Log user and ability check for SUPERVISOR # ai generated
    if (user && user.role === 'SUPERVISOR') {
      // console.log('[SUPERVISOR authorize] user:', user);
      // TODO: remove this later currently without this SUPERVISOR gets blocked from accessing profile and other api endpoints
      const canReadProfile = defineAbilityFor(user).can('read', { subject: 'Profile', clientId: user.clientId, workspaceId: user.defaultWorkspaceId });
      // console.log('[SUPERVISOR authorize] can read Profile with clientId/workspaceId:', canReadProfile);
    }

    const ability = defineAbilityFor(user);
    if (ability.can(action, resource)) {
      next(); // Permission granted
    } else {
      res.status(403).send({ status: "error", message: 'Access denied' }); // Permission denied
    }
  };
}
module.exports = authorize;
