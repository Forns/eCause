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
      expressValidator = tools.expressValidator;
  
  /*
   * GET ROUTES
   */
  
  if (ROLE === "analysis") {
    
    app.get("/test", function (req, res) {
      res.send("Hi!");
    });
    
    app.post("/test", function (req, res) {
      console.log("HERE!");
      console.log(req.body.test);
      res.send(200, {test: "yo!"});
    });
    
  }
  

  /*
   * POST ROUTES
   */
  
  if (ROLE === "interface") {
    request.post(
      {
        url: "http://localhost:" + status.analysisPort + "/test",
        form: {
          test: "hi :)"
        }
      },
      function (error, response, body) {
        console.log("http://localhost:" + status.analysisPort + "/test");
        console.log(error);
        console.log(response);
        console.log(body);
      }
    );
  }
  
};