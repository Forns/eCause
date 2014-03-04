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
      causalVerbs = ["allow", "block", "cause", "enable", "force", "get", "help", "hinder", "hold", "impede", "keep", "leave", "let", "make", "permit", "prevent", "protect", "restrain", "save", "set", "start", "stimulate", "stop", "as", "due", "to", "because", "helped", "aid", "bar", "bribe", "compel", "constrain", "convince", "deter", "discourage", "dissuade", "drive", "have", "hamper", "impel", "incite", "induce", "influence", "inspire", "lead", "move", "persuade", "prompt", "push", "restrict", "result", "rouse", "send", "spur"];
  
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
          // Since it *is* worth keeping, check if we have something
          // to add it to nearby
          if (resultLength && currentElement.tag[0] === result.elements[resultLength-1].tag[0] && currentElement.tag[1] === result.elements[resultLength-1].tag[1]) {
            result.elements[resultLength-1].concept += " " + currentElement.concept;
            continue;
            
          // Otherwise, it's a new entity to add
          } else {
            toPush = {
              concept: currentElement.concept,
              tag: currentElement.tag,
              stem: currentElement.stem
            };
          }
          
        // Otherwise, it's a wildcard to add
        } else {
          if (resultLength && result.elements[resultLength-1].tag === "*") {
            continue;
          }
        }
        
        if (currentElement.isConcept) {
          toPush.isConcept = true;
        }
        if (currentElement.isMovement) {
          toPush.isMovement = true;
        }
        if (currentElement.isCausal) {
          toPush.isCausal = true;
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
    this.movementTrie = new Trie(false);
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
    
    // Set up the verb Trie
    this.addCausalVerbs(causalVerbs);
    
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
    
    addPatterns: function (patterns) {
      for (var p in patterns) {
        var pattern = patterns[p],
            hasConcept = false,
            hasMovement = false,
            hasCause = false;
        for (var e in pattern.elements) {
          if (this.conceptTrie.contains(pattern.elements[e].stem)) {
            pattern.elements[e].isConcept = true;
            hasConcept = true;
          }
          if (this.movementTrie.contains(pattern.elements[e].stem)) {
            pattern.elements[e].isMovement = true;
            hasMovement = true;
          }
          if (this.verbTrie.contains(pattern.elements[e].stem)) {
            pattern.elements[e].isCausal = true;
            hasCause = true;
          }
        }
        
        pattern.isRelevant = hasCause;
        
        this.sentences.push(pattern);
        this.sentenceTemplates.push(pattern.toTemplate(this.patternTrie));
      }
    }
    
  };
  
  return this;
  
}
