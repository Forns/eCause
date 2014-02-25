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
      status = tools.status,
      request = tools.request,
      google = tools.google,
      Readability = require("readabilitySAX/readabilitySAX.js"),
      Parser = require("htmlparser2/lib/Parser.js"),
      
      ipLog = {};
  
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
  
  app.get("/progress", function (req, res) {
    res.send(200, {progress: (ipLog[req.ip] >= 0) ? ipLog[req.ip] : -1});
  });
  

  /*
   * POST ROUTES
   */
  
  app.post("/progress", function (req, res) {
    var inputs = req.body,
        reqIp = inputs.reqIp,
        stage = inputs.stage;
        
    ipLog[reqIp] = parseInt(stage);
    console.log(ipLog);
    res.send(200);
  });
  
  app.post("/search", function (req, res) {
    google.resultsPerPage = 8;
    var parsed = 0
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
                
            if (body !== null || body.length !== 0) {
              parser.write(body);
              corpus.push(readable.getText());
              parser.end();
            }
            parsed++;
            if (parsed == google.resultsPerPage) {
              console.log("[!] Passed to analysis!");
              ipLog[req.ip] = 1;
              request.post(
                {
                  url: "http://localhost:" + status.analysisPort + "/analyze",
                  form: {
                    corpus: corpus,
                    reqIp: req.ip
                  }
                },
                function (err2, response2, body2) {
                  if (err2) {
                    console.error(err2);
                    res.send(500, {error: err2});
                  }
                }
              );
              console.log("PARSED: " + parsed);
              res.send(200);
            }
          }
        );
      }
    });
  });
  
};