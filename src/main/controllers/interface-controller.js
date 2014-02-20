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
      ObjectID = mongo.ObjectID,
      request = tools.request,
      google = tools.google,
      Readability = require("readabilitySAX/readabilitySAX.js"),
      Parser = require("htmlparser2/lib/Parser.js");
  
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
    google.resultsPerPage = 5;
    var nextCounter = 0,
        parsed = 0
        corpus = [];
    
    google('World War II', function(err, next, links){
      if (err) {
        console.error(err);
        res.send(500, {error: err});
      };
    
      for (var i = 0; i < links.length; ++i) {
        console.log(">>>>>>>" + links[i].link);
        request.get(
          {
            url: links[i].href
          },
          function (error, response, body) {
            var readable = new Readability({}),
                parser = new Parser(readable, {});
                
            parser.write(body);
            parsed++;
            console.log(readable.getText());
            parser.end();
            if (parsed == google.resultsPerPage) {
              res.send(200);
            }
          }
        );
      }
    
      if (nextCounter < 4) {
        nextCounter += 1;
        if (next) next();
      }
    });
  });
  
};