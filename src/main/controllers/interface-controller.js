/**
 * interface-controller.js
 * 
 * Controller for UI-related routes.
 */

module.exports = function (tools) {
  var app = tools.app,
      security = tools.security,
      dao = tools.dao,
      layoutConfig = tools.layoutConfig,
      status = tools.status,
      fs = tools.fs,
      expressValidator = tools.expressValidator,
      mongo = tools.mongodb,
      GridFSStream = tools.GridFSStream,
      Grid = mongo.Grid,
      GridStore = mongo.GridStore,
      ObjectID = mongo.ObjectID;
  
  /*
   * GET ROUTES
   */
  
  app.get("/", function (req, res) {
    if (security.accessCheck(req, "all", res, "render")) {
      res.render("interface/index", layoutConfig.layoutOptions(req, {
        title: "Found My Designer",
        scripts: [
          "/js/display/general/index-display.js"
        ]
      }));
    }
  });
  

  /*
   * POST ROUTES
   */
  
};