// authorize.js
const {defineAbilityFor} = require('./defineAbility');
function authorize(action, resource) {
  return (req, res, next) => {
    const user = req.user; // assuming user information is attached to `req.user` after authentication

    const ability = defineAbilityFor(user);
    if (ability.can(action, resource)) {
      next(); // Permission granted
    } else {
      res.status(403).send({ status: "error",message:'Access denied'  }); // Permission denied
    }
  };
}
module.exports = authorize;
