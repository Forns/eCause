/**
 * security-config.js
 *
 * Configures route security protocols and methods.
 */

module.exports = function (layoutConfig, status) {
  security = this.security = {};
  
  // Mapping of current password resets that are destroyed after 5 minutes
  var passwordResets = {},
      spamMap = {},
      sechash = require("sechash"),
      request = require("request");
      
  // Configures a successfully authenticated user's credentials and session
  security.configureSession = function (req, username, access) {
    req.session.user = {};
  };
  
  // Deletes the session and effectively logs a user out
  security.deleteSession = function (req) {
    delete req.session.user;
  };
  
  return this;
  
}
