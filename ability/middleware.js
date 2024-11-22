const { defineAbilityFor } = require('./defineAbility');

function defineAbilitiesMiddleware(req, res, next) {
  req.ability = defineAbilityFor(req.user); 
  next();
}

module.exports = defineAbilitiesMiddleware;
