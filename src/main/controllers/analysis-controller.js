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
      natural = tools.natural,
      WNdb = tools.WNdb,
      wordnet = new natural.WordNet(WNdb.path),
      $TM = tools.$TM,
      
      ipLog = {},
      
      purgeDocument = function (doc) {
        var sentences = [];
        doc = doc.replace("\n", ".").replace("\t", " ").split(".");
        for (var s in doc) {
          doc[s] = doc[s].trim();
          if (doc[s].split(" ").length > 2) {
            sentences.push(doc[s]);
          }
        }
        return sentences.join(".");
      },
      
      getCleanCorpus = function (corpus) {
        var unitedCorpus = [];
        
        for (var c in corpus) {
          corpus[c] = purgeDocument(corpus[c]);
          if (corpus[c] && corpus[c] !== "undefined") {
            unitedCorpus.push(corpus[c]);
          }
        }
        
        return unitedCorpus;
      },
      
      getTopicModels = function (corpus) {
        var sentences,
            topics = [];
        
        for (var c in corpus) {
          sentences = corpus[c].split(".");
          topics.push($TM.getTopics(sentences, 2, 20));
        }
        
        return topics;
      },
      
      getCombinedTopics = function (topicModels) {
        var result = {};
        for (var doc in topicModels) {
          var currentDoc = topicModels[doc].topics;
          for (var t in currentDoc) {
            var currentTopics = currentDoc[t];
            for (var topic in currentTopics) {
              result[currentTopics[topic]] = 1;
            }
          }
        }
        return result;
      },
      
      // ...the POS stands for part of speech, grow up
      POSFilter = function (combinedTopics, callback) {
        var factors = {},
            verbs = {},
            total = 0;
            
        for (var t in combinedTopics) {
          (function (t) {
            wordnet.lookup(t, function (results) {
              console.log(t);
              results.forEach(function (result) {
                var pos = result.pos;
                if (pos === "n") {factors[t] = 1;}
                if (pos === "v") {verbs[t] = 1;}
              });
              total++;
              console.log(total);
              console.log(Object.keys(combinedTopics).length);
              if (total >= Object.keys(combinedTopics).length) {
                callback([factors, verbs]);
              }
            });
          })(t);
        }
        
      };
  
  /*
   * GET ROUTES
   */
  

  /*
   * POST ROUTES
   */
  
  app.post("/analyze", function (req, res) {
    var inputs = req.body,
        reqIp = inputs.reqIp,
        corpus = inputs.corpus,
        unitedCorpus = [],
        sentences = [],
        topicModels = [],
        combinedTopics = {},
        topicPOS = [],
        factors = {};
        
    // Successful loading into analyzer gives status
    // code 1
    ipLog[reqIp] = 1;
    unitedCorpus = getCleanCorpus(corpus);
    
    // Once we've got our topic models, give status
    // code 2
    topicModels = getTopicModels(unitedCorpus);
    combinedTopics = getCombinedTopics(topicModels);
    ipLog[reqIp] = 2;
    
    // Now we'll start looking at the semantic analysis
    POSFilter(combinedTopics, function (results) {
      factors = results[0];
      causalVerbs = results[1];
      ipLog[reqIp] = 3;
      
      res.send(200);
    });
    
  });
  
  app.post("/progress", function (req, res) {
    var inputs = req.body,
        reqIp = inputs.ip;
        console.log(reqIp);
        console.log(ipLog[reqIp]);
    res.send(200, {progress: (ipLog[reqIp]) ? ipLog[reqIp] : -1});
  });
  
};