/**
 * interface-controller.js
 * 
 * Controller for UI-related routes.
 */

module.exports = function (tools) {
  var app = tools.app,
      security = tools.security,
      dao = tools.dao,
      request = tools.request,
      layoutConfig = tools.layoutConfig,
      status = tools.status,
      ROLE = status.ROLE,
      fs = tools.fs,
      expressValidator = tools.expressValidator,
      $TM = tools.$TM,
      
      ipLog = {};
  
  /*
   * GET ROUTES
   */
  

  /*
   * POST ROUTES
   */
  
  app.post("/analyze", function (req, res) {
    var inputs = req.body,
        corpus = inputs.corpus;
        
    ipLog[req.ip] = 0;
    
    for (var c in corpus) {
      console.log($TM.getTopics(corpus[c]));
    }
  });
  
};