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
      Pattern = tools.Pattern,
      PatternContainer = tools.PatternContainer,
      
      updateProgress = function (reqIp, stage) {
        console.log("Progress Update: " + stage);
        request.post(
          {
            url: "http://localhost:" + status.interfacePort + "/progress",
            form: {
              reqIp: reqIp,
              stage: stage
            }
          },
          function (err, response, body) {
            console.log("Progress Update: Complete!");
            if (err) {
              console.error(err);
            }
          }
        );
      },
      
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
        var purgedCorpus = [];
        
        for (var c in corpus) {
          corpus[c] = purgeDocument(corpus[c]);
          if (corpus[c] && corpus[c] !== "undefined") {
            purgedCorpus.push(corpus[c]);
          }
        }
        
        return purgedCorpus;
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
        var concepts = {},
            movements = {},
            total = 0;
            
        for (var t in combinedTopics) {
          (function (t) {
            wordnet.lookup(t, function (results) {
              console.log(t);
              results.forEach(function (result) {
                var pos = result.pos;
                if (pos === "n") {concepts[t] = 1;}
                if (pos === "v") {movements[t] = 1;}
              });
              total++;
              console.log(total);
              console.log(Object.keys(combinedTopics).length);
              if (total >= Object.keys(combinedTopics).length) {
                // Integrate findings into the Pattern class
                callback(Object.keys(concepts), Object.keys(movements));
              }
            });
          })(t);
        }
      },
      
      getTaggedSentences = function (purgedCorpus) {
        var taggedSentences = [];
        for (var c in purgedCorpus) {
          var sentences = purgedCorpus[c].split(".");
          for (var s in sentences) {
            taggedSentences.push(new Pattern(sentences[s]));
          }
        }
        return taggedSentences;
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
        purgedCorpus = [],
        taggedSentences = [],
        sentenceTemplates = [],
        topicModels = [],
        topicPOS = [],
        combinedTopics = {},
        patternKB = new PatternCollection();
        
    // The purged corpus contains all documents from the
    // original that had content, now purged of irrelevant
    // or malformed terms 
    purgedCorpus = getCleanCorpus(corpus);
    
    // Once we've got our topic models, give status
    // code 2
    topicModels = getTopicModels(purgedCorpus);
    combinedTopics = getCombinedTopics(topicModels);
    updateProgress(reqIp, 2);
    
    // Now we'll start looking at the semantic analysis
    POSFilter(combinedTopics, function (concepts, movements) {
      taggedSentences = getTaggedSentences(purgedCorpus);
      patternKB.addConcepts(concepts);
      patternKB.addMovements(movements);
      patternKB.addPatterns(taggedSentences);
      
      for (var s in patternKB.sentenceTemplates) {
        if (patternKB.sentences[s].isRelevant) {
          console.log(patternKB.sentences[s].toString());
          console.log(patternKB.sentenceTemplates[s].toTemplateString());
          console.log("===============");
        }
      }
      
      updateProgress(reqIp, 3);
      res.send(200);
    });
    
  });
  
};