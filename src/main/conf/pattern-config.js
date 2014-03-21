/**
 * security-config.js
 *
 * Configures route security protocols and methods.
 */

module.exports = function (natural, WNdb, pos, status) {
  
  var tokenizer = natural.WordTokenizer(),
      Trie = natural.Trie,
      stemmer = natural.PorterStemmer,
      wordnet = new natural.WordNet(WNdb.path),
      lexer = new pos.Lexer(),
      tagger = new pos.Tagger(),
      
      patternPOS = ["NN", "JJ", "VB", "RB", "IN"],
      causalVerbs = ["cause", "because", "result", "make", "force", "lead", "associated", "affect", "due"],
      counterfactualLinks = ["were_not", "had_it", "were_it", "had_not", "had_it", "would_have", "should_have"];
      
  // Process the synonyms for each causal verb
  (function () {
    var originalCount = causalVerbs.length;
    for (var i = 0; i < originalCount; i++) {
      wordnet.lookup(causalVerbs[i], function (results) {
        results.forEach(function (result) {
          var pos = result.pos;
          if (pos === "v") {
            causalVerbs = causalVerbs.concat(result.synonyms);
          }
        });
      });
    }
  })();
  
  Pattern = this.Pattern = function (sentence) {
    this.elements = [];
    this.templated = false;
    if (!sentence) {
      return this;
    }
    sentence = lexer.lex(sentence);
    
    var tags = tagger.tag(sentence);
    
    for (var t in tags) {
      var toPush = {
            concept: tags[t][0],
            stem: stemmer.stem(tags[t][0]),
            tag: tags[t][1]
          };
        
      // Log the pos for each element
      this.elements.push(toPush);
    }
    
    return this;
  };
  
  
  /*
   * PATTERN PROTOTYPE
   */
  Pattern.prototype = {
    
    toTemplate: function (patternTrie) {
      var result = new Pattern();
      result.templated = true;
      result.sentence = this.elements;
      
      for (var e in this.elements) {
        var currentElement = this.elements[e],
            POSSplit = patternTrie.findPrefix(currentElement.tag),
            resultLength = result.elements.length,
            toPush = {
              concept: "*",
              tag: "*",
              stem: "*"
            };
            
        // Check if given POS is acceptable to keep
        // for a template
        if (POSSplit[0] && POSSplit[1].length < 2) {
          toPush = {
            concept: currentElement.concept,
            tag: currentElement.tag,
            stem: currentElement.stem
          };
          
        // Otherwise, it's a wildcard to add
        } else {
          if (resultLength && result.elements[resultLength-1].tag === "*") {
            continue;
          }
        }
        
        if (toPush.tag !== "*") {
          if (currentElement.isMainConcept) {
            toPush.isMainConcept = true;
          }
          if (currentElement.isConcept) {
            toPush.isConcept = true;
          }
          if (currentElement.isMovement) {
            toPush.isMovement = true;
          }
          if (currentElement.isCausal) {
            toPush.isCausal = true;
            result.isRelevant = true;
          }
          if (currentElement.isCF) {
            toPush.isCF = true;
          }
        }
        
        result.elements.push(toPush);
      }
      
      return result;
    },
    
    toString: function () {
      var result = "";
      for (var e in this.elements) {
        var currentElement = this.elements[e];
        result += currentElement.concept + "/" + currentElement.tag + " ";
      }
      return result.trim();
    },
    
    toTemplateString: function () {
      if (!this.templated) {
        return this.toString();
      }
      var result = "";
      for (var e in this.elements) {
        var currentElement = this.elements[e];
        result += ((currentElement.isConcept && currentElement.tag[0] === "N") ? "[concept]/" : "") + 
                  ((currentElement.isMovement && currentElement.tag[0] === "V") ? "[movement]/" : "") +
                  ((currentElement.isCausal && currentElement.tag[0] === "V") ? "[cause]/" : "") +
                  currentElement.tag + " ";
      }
      return result.trim();
    }
    
  };
  
  /*
   * PATTERN COLLECTION CONSTRUCTOR
   */
  
  PatternCollection = this.PatternCollection = function () {
    this.verbTrie = new Trie(false);
    this.counterfactualTrie = new Trie(false);
    this.movementTrie = new Trie(false);
    this.mainConceptTrie = new Trie(false);
    this.conceptTrie = new Trie(false);
    this.patternTrie = new Trie(false);
    // Holds the tagged sentences
    this.sentences = [];
    // Holds the tagged sentence templates
    this.sentenceTemplates = [];
    // Holds only the templates that are relevant
    this.putativeTemplates = [];
    // Holds only the templates that aren't relevant
    this.unresolvedTemplates = [];
    // Holds the putative causal relations; maps that have:
      // reason: term with a concept
      // consequence: term with a movement
    this.putativeCausation = [];
    this.causalReasons = {};
    this.causalConsequences = {};
    
    // Set up the verb Trie
    this.addCausalVerbs(causalVerbs);
    this.addCounterfactualLinks(counterfactualLinks);
    
    // Set up the pattern part of speech Trie
    this.patternTrie.addStrings(patternPOS);
  };
  
  /*
   * PATTERN COLLECTION PROTOTYPE
   */
  
  PatternCollection.prototype = {
    
    addCausalVerbs: function (verbs) {
      for (var v in verbs) {
        verbs[v] = stemmer.stem(verbs[v]);
      }
      this.verbTrie.addStrings(verbs);
    },
    
    addCounterfactualLinks: function (CFLinks) {
      for (var c in CFLinks) {
        CFLinks[c] = stemmer.stem(CFLinks[c]);
      }
      this.counterfactualTrie.addStrings(CFLinks);
    },
    
    addMovements: function (movements) {
      for (var m in movements) {
        movements[m] = stemmer.stem(movements[m]);
      }
      this.movementTrie.addStrings(movements);
    },
    
    addConcepts: function (concepts) {
      for (var c in concepts) {
        concepts[c] = stemmer.stem(concepts[c]);
      }
      this.conceptTrie.addStrings(concepts);
    },
    
    addMainConcepts: function (searchTerm, callback) {
      var collection = this,
          searchWords = searchTerm.split(" ");
      
      // First add the current main concept to the try,
      // one by one
      for (var s in searchWords) {
        searchWords[s] = stemmer.stem(searchWords[s]);
      }
      collection.mainConceptTrie.addStrings(searchWords);
      
      wordnet.lookup(searchTerm, function (results) {
        var count = 0;
        results.forEach(function (result) {
          var pos = result.pos,
              syns = [];
              
          count++;
          if (pos === "n") {
            for (var s in result.synonyms) {
              syns = syns.concat(result.synonyms[s].split("_"));
            }
            for (var s in syns) {
              syns[s] = stemmer.stem(syns[s]);
            }
            collection.mainConceptTrie.addStrings(syns);
          }
          
          if (count >= results.length) {
            callback();
          }
        });
        
        // In case there are no synonyms...
        if (!results.length) {
          callback();
        }
      });
    },
    
    addPatterns: function (patterns) {
      for (var p in patterns) {
        var pattern = patterns[p],
            putativePattern,
            hasMainConcept = false,
            hasConcept = false,
            hasMovement = false,
            hasCause = false,
            hasCF = false,
            last;
            
        for (var e in pattern.elements) {
          if (this.mainConceptTrie.contains(pattern.elements[e].stem)) {
            pattern.elements[e].isMainConcept = true;
            hasMainConcept = true;
          }
          if (this.conceptTrie.contains(pattern.elements[e].stem)) {
            pattern.elements[e].isConcept = true;
            hasConcept = true;
          }
          if (this.movementTrie.contains(pattern.elements[e].stem)) {
            pattern.elements[e].isMovement = true;
            hasMovement = true;
          }
          
          // Counterfactual vs causal expression
          if (last && this.counterfactualTrie.contains(last + "_" + pattern.elements[e].stem)) {
            pattern.elements[e].isCF = true;
            hasCF = true;
          } else if (this.verbTrie.contains(pattern.elements[e].stem)) {
            pattern.elements[e].isCausal = true;
            hasCause = true;
          }
          last = pattern.elements[e].stem;
        }
        
        pattern.isRelevant = hasMainConcept;
        pattern.isCF = hasCF;
        putativePattern = pattern.toTemplate(this.patternTrie);
        
        this.sentences.push(pattern);
        this.sentenceTemplates.push(putativePattern);
      }
    },
    
    relevantTerms: function (pattern, begin, end) {
      var hasConcept = false,
          hasMainConcept = false,
          hasMovement = false;
          
      for (var i = begin; i < end; i++) {
        if (pattern[i].isMainConcept) {
          hasMainConcept = true;
        }
        if (pattern[i].isConcept) {
          hasConcept = true;
        }
        if (pattern[i].isMovement) {
          hasMovement = true;
        }
      }
      return {
        hasMainConcept: hasMainConcept,
        plausibleReason: hasConcept || hasMainConcept,
        plausibleConsequence: (hasConcept || hasMainConcept) && hasMovement
      };
    },
    
    addCausalTemplate: function (template, type) {
      var currentNode = (type === "reason") ? this.causalReasons : this.causalConsequences;
      
      // We'll construct a trie with our input template's nodes!
      for (var t in template) {
        var currentWord = template[t],
            currentTag = currentWord.tag.substring(0, 2);
            
        if (currentWord.isConcept && currentTag !== "VB") {
          currentTag[0] = "C";
        }
        if (currentWord.isMovement && currentTag === "VB") {
          currentTag[0] = "M";
        }
            
        if (!currentNode[currentTag]) {
          currentNode[currentTag] = {};
        }
        currentNode = currentNode[currentTag];
      }
    },
    
    // We'll split our relevant patterns into the templates that have an
    // immediately causal structure, and those that don't
    findPutativeTemplates: function () {
      for (var p in this.sentenceTemplates) {
        var currentTemplate = this.sentenceTemplates[p],
            currentElements = currentTemplate.elements;
        
        if (!currentTemplate.isRelevant) {
          continue;
        }
        
        // Now, we have to find the causal verb(s) and split the sentence
        // into reason and consequence
        for (var i = 0; i < currentElements.length; i++) {
          // We'll assess whether or not the clauses to the left and right of
          // a causal verb can be reasons or consequences
          if (currentElements[i].isCausal || currentElements[i].isCF) {
            var leftClause = this.relevantTerms(currentElements, 0, i),
                rightClause = this.relevantTerms(currentElements, i + 1, currentElements.length),
                hasMain = leftClause.hasMainConcept || rightClause.hasMainConcept,
                leftOK = false,
                rightOK = false,
                toPush;
            
            // Check the directionality of the causal verb
            if (i + 1 < currentElements.length && currentElements[i].pos === "IN") {
              // If there's a preposition following the verb, we'll assume that
              // consequences will be on the left, e.g. "caused by"
              leftOK = leftClause.plausibleConsequence;
              rightOK = rightClause.plausibleReason;
              toPush = {
                reason: currentElements.slice(i + 1, currentElements.length),
                consequence: currentElements.slice(0, i)
              };
              
            // Otherwise, the reason is on the left
            } else {
              leftOK = leftClause.plausibleReason;
              rightOK = rightClause.plausibleConsequence;
              toPush = {
                reason: currentElements.slice(0, i),
                consequence: currentElements.slice(i + 1, currentElements.length)
              };
            }
            
            // Assuming our left and right clauses are appropriately structured, and
            // at least one of them has a main concept, we have a putative match!
            if (leftOK && rightOK && hasMain) {
              this.putativeTemplates.push(toPush);
              this.addCausalTemplate(toPush.reason, "reason");
              this.addCausalTemplate(toPush.consequence, "consequence");
              
            // If there isn't a match for a reason / consequence, we'll revisit that sentence
            // later and see if we can match based on an established template
            } else {
              this.unresolvedTemplates.push(toPush);
            }
            break;
          }
        }
      }
    },
    
    scoreMatch: function (candidate, type) {
      var currentNode = (type === "reason") ? this.causalReasons : this.causalConsequences,
          candidateWords = 0,
          runningScore = 0,
          conceptLocations = [],
          movementLocations = [];
          
      for (var c in candidate) {
        candidateWords++;
        var currentCandidateWord = candidate[c],
            currentTag = currentCandidateWord.tag.substring(0, 2),
            hasWildcard = false,
            matchScore = 0,
            bestMatch,
            patternTrieFind;
            
        if (!currentNode) {continue;}
        
        for (var t in currentNode) {
          var currentTemplateMatch = currentNode[t];
          if (t === "*") {
            hasWildcard = true;
          }
          if (t === currentTag) {
            matchScore = 0.8;
            if (t === "NN") {conceptLocations.push(c);}
            if (t === "VB") {movementLocations.push(c);}
            if (matchScore <= 0.8) {
              bestMatch = currentTemplateMatch;
            }
          }
          if ((t === "CN" && currentTag === "NN") || (t === "MB" && currentTag === "VB")) {
            if (t === "CN") {conceptLocations.push(c);}
            if (t === "MB") {movementLocations.push(c);}
            matchScore = 1;
            bestMatch = currentTemplateMatch;
          }
        }
        
        if (bestMatch) {
          runningScore += matchScore;
          currentNode = currentTemplateMatch;
        }
        patternTrieFind = this.patternTrie.findPrefix(currentTag)[0];
        if (patternTrieFind && patternTrieFind.length === 0 && hasWildcard) {
          runningScore += 0.5;
        }
      }
      
      return {
        score: runningScore / candidateWords,
        conceptLocations: conceptLocations,
        movementLocations: movementLocations
      };
    },
    
    findHiddenStructures: function () {
      var result = [],
          flagStructureElements = function (concepts, conceptPositions, movementPositions) {
            var cIndex = -1,
                mIndex = -1,
                difference = -1;
            for (var c in conceptPositions) {
              for (var m in movementPositions) {
                var newDifference = Math.abs(conceptPositions[c] - movementPositions[m]);
                if (difference === -1 || newDifference < difference) {
                  difference = newDifference;
                  cIndex = conceptPositions[c];
                  mIndex = movementPositions[m];
                }
              }
            }
            
            // Now we check if the items at those locations need flagging
            if (cIndex === -1) {
              cIndex = conceptPositions[(conceptPositions.length) ? conceptPositions.length - 1 : 0];
            }
            if (cIndex) {
              concepts[cIndex].isConcept = true;
            }
            if (mIndex !== -1) {
              concepts[mIndex].isMovement = true;
            }
          };
          
      for (var t in this.unresolvedTemplates) {
        var currentUnresolved = this.unresolvedTemplates[t],
            currentReason = currentUnresolved.reason,
            currentConsequence = currentUnresolved.consequence,
            
            reasonAnalysis = this.scoreMatch(currentReason, "reason"),
            reasonScore = reasonAnalysis.score,
            reasonConcepts = reasonAnalysis.conceptLocations,
            reasonMovements = reasonAnalysis.movementLocations,
            
            consequenceAnalysis = this.scoreMatch(currentReason, "consequence"),
            consequenceScore = consequenceAnalysis.score,
            consequenceConcepts = consequenceAnalysis.conceptLocations,
            consequenceMovements = consequenceAnalysis.movementLocations;
            
        if (currentReason.length < 4 || currentConsequence.length < 4 || reasonScore < 0.5 || consequenceScore < 0.5) {
          continue;
        }
        
        // At this point, we have structures that can possibly be matched
        // We'll first flag some possible concepts / movements in our templates
        if (!reasonConcepts.length || !consequenceConcepts.length) {
          continue;
        }
        flagStructureElements(currentReason, reasonConcepts, reasonMovements);
        flagStructureElements(currentConsequence, consequenceConcepts, consequenceMovements);
        result.push(currentUnresolved);
      }
      
      // Finally, update our unresolved templates
      this.unresolvedTemplates = result;
    },
    
    getComponents: function (clause) {
      var mainConcepts = [],
          concepts = [],
          chosenConcept,
          movements = [],
          chosenMovement,
          difference = -1,
          construct = {};
      
      for (var e in clause) {
        var currentElement = clause[e];
        (function () {
          if (currentElement.isMainConcept) {
            mainConcepts.push({
              index: e,
              term: currentElement.concept
            });
          }
          if (currentElement.isConcept) {
            concepts.push({
              index: e,
              term: currentElement.concept
            });
          }
          if (currentElement.isMovement) {
            movements.push({
              index: e,
              term: currentElement.concept
            });
          }
        })(currentElement);
      }
      
      // Analyze which concept and movement to use
      (function (conceptArray) {
        for (var c in conceptArray) {
          var currentConcept = conceptArray[c];
          if (difference === -1) {
            chosenConcept = currentConcept;
          }
          
          // Seed our comparator if this is the first
          // concept we've encountered
          for (var m in movements) {
            var currentMovement = movements[m],
                currentDistance = Math.abs(currentConcept.index - currentMovement.index);
            if ((difference === -1 || (currentDistance < difference)) && (currentConcept.term !== currentMovement.term)) {
              chosenConcept = currentConcept;
              chosenMovement = currentMovement;
              difference = currentDistance
            }
          }
        }
      })((mainConcepts.length) ? mainConcepts : concepts);
      
      // Finally, construct the... construct >_> <_<
      construct = {
        concept: chosenConcept,
        movement: (chosenMovement) ? chosenMovement : {}
      }
      
      return construct;
    },
    
    causalExtraction: function (secondPass) {
      var templateCollection = (secondPass) ? this.unresolvedTemplates : this.putativeTemplates;
      for (var t in templateCollection) {
        var currentTemplate = templateCollection[t],
            currentReason = currentTemplate.reason,
            reasonConstruct = this.getComponents(currentReason),
            currentConsequence = currentTemplate.consequence,
            consequenceConstruct = this.getComponents(currentConsequence),
            currentResult = {
              reason: reasonConstruct,
              consequence: consequenceConstruct,
              reasonTemplate: currentReason,
              consequenceTemplate: currentConsequence,
              discovered: secondPass
            };
            
        this.putativeCausation.push(currentResult);
      }
    },
    
    causalCleanup: function (callback) {
      var c = 0,
          tryCount = 2,
          lookAhead = 2,
          currentCausal,
          collection = this,
          
          buildConcept = function (currentConcept, currentTemplate, iteration, next) {
            if (!next) {
              return;
            }
            // Return if we've already looked ahead enough or would overflow the template
            // by looking at one more word
            if (iteration < 0 || currentConcept.concept.index + 1 >= currentTemplate.length) {
              tryCount--;
              next();
              return;
            }
            
            var currentTerm = currentConcept.concept.term,
                currentIndex = currentConcept.concept.index;
            
            if (!currentTemplate[currentIndex + 1] || currentTemplate[currentIndex + 1].concept === "*") {
              tryCount--;
              next();
              return;
            }
            
            // We want to try to build onto our concept by seeing if the next
            // word in the template goes logically with the one we've tagged
            wordnet.lookup(currentTerm + " " + currentTemplate[currentIndex + 1].concept, function (results) {
              if (results.length) {
                currentConcept.term += " " + currentTemplate[currentIndex + 1].concept;
                buildConcept(currentConcept, currentTemplate, --iteration);
              } else {
                tryCount--;
                next();
                return;
              }
            });
            
          },
          
          nextFun = function () {
            if (c >= collection.putativeCausation.length) {
              return;
            }
            
            var currentCausal = collection.putativeCausation[c],
                currentReasonTemplate = currentCausal.reasonTemplate,
                currentConsequenceTemplate = currentCausal.consequenceTemplate,
                currentReason = currentCausal.reason,
                currentConsequence = currentCausal.consequence;
            
            
            // If we're done trying to construct additional concepts,
            // then move to the next relation
            if (tryCount <= 0) {
              // Reset tryCount before going to the next reason / consequence
              tryCount = 2;
              c++;
              // Once we're done processing, call the callback!
              if (c >= collection.putativeCausation.length) {
                collection.causalsToTerms(callback);
                return;
              } else {
                nextFun();
                return;
              }
            }
            
            // Otherwise, we still have more relations to go through
            if (nextFun) {
              buildConcept(currentReason, currentReasonTemplate, 2, nextFun);
              buildConcept(currentConsequence, currentConsequenceTemplate, 2, nextFun);
            }
          };
          
      // Start it all off!
      nextFun();
    },
    
    causalsToTerms: function (callback) {
      var causalTrie = new Trie(false),
          result = [];
      // Replace the reasons and consequences with just their terms
      for (var c in this.putativeCausation) {
        var currentCausal = this.putativeCausation[c],
            trieString;
        this.putativeCausation[c].consequence = {
          concept: currentCausal.consequence.concept.term,
          movement: (currentCausal.consequence.movement.term) ? currentCausal.consequence.movement.term : ""
        };
        this.putativeCausation[c].reason = {
          concept: currentCausal.reason.concept.term,
          movement: (currentCausal.reason.movement.term) ? currentCausal.reason.movement.term : ""
        };
        if (this.putativeCausation[c].reason.concept === this.putativeCausation[c].consequence.concept) {
          continue;
        }
        trieString = currentCausal.consequence.concept + currentCausal.consequence.movement + currentCausal.reason.concept + currentCausal.reason.movement;
        if (!causalTrie.contains(trieString)) {
          causalTrie.addString(trieString);
          result.push(currentCausal);
        }
      }
      this.putativeCausation = result;
      callback();
    },
    
    cleanUp: function () {
      // Holds the tagged sentences
      this.sentences = [];
      // Holds the tagged sentence templates
      this.sentenceTemplates = [];
      // Holds only the templates that are relevant
      this.putativeTemplates = [];
      // Holds only the templates that aren't relevant
      this.unresolvedTemplates = [];
      // Holds the putative causal relations; maps that have:
        // reason: term with a concept
        // consequence: term with a movement
      this.putativeCausation = [];
      this.causalReasons = {};
      this.causalConsequences = {};
    }
    
  };
  
  return this;
  
}
