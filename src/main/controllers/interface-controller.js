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
    res.render("index", layoutConfig.layoutOptions(req, {
      title: "eCause",
      scripts: [
        "/js/display/index-display.js"
      ]
    }));
  });
  

  /*
   * POST ROUTES
   */
  app.post("/search", function (req, res) {
    
  });
  
};