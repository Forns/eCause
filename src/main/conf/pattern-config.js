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
      
      verbTrie = new Trie(false),
      conceptTrie = new Trie(false),
      patternTrie = new Trie(false),
      patternPOS = ["NN", "JJ", "VB", "RB", "IN"],
      causalVerbs = ["allow", "block", "cause", "enable", "force", "get", "help", "hinder", "hold", "impede", "keep", "leave", "let", "make", "permit", "prevent", "protect", "restrain", "save", "set", "start", "stimulate", "stop", "as", "due", "to", "because", "helped", "aid", "bar", "bribe", "compel", "constrain", "convince", "deter", "discourage", "dissuade", "drive", "have", "hamper", "impel", "incite", "induce", "influence", "inspire", "lead", "move", "persuade", "prompt", "push", "restrict", "result", "rouse", "send", "spur"];

  // Set up the verb Trie
  for (var v in causalVerbs) {
    causalVerbs[v] = stemmer.stem(causalVerbs[v]);
  }
  verbTrie.addStrings(causalVerbs);
  
  // Set up the pattern part of speech Trie
  patternTrie.addStrings(patternPOS);
  
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
        
      if (conceptTrie.contains(toPush.stem)) {
        toPush.isConcept = true;
        this.isRelevant = true;
      }
      if (verbTrie.contains(toPush.stem)) {
        toPush.isMovement = true;
        this.isRelevant = true;
      }
      // Log the pos for each element
      this.elements.push(toPush);
    }
    
    return this;
  };
  
  
  /*
   * PATTERN PROTOTYPE
   */
  Pattern.prototype = {
    
    toTemplate: function () {
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
      var result = "";
      for (var e in this.elements) {
        var currentElement = this.elements[e];
        result += ((currentElement.isConcept && currentElement.tag[0] === "N") ? "[concept]/" : "") + 
                  ((currentElement.isMovement && currentElement.tag[0] === "V") ? "[movement]/" : "") +
                  currentElement.tag + " ";
      }
      return result.trim();
    }
    
  };
  
  Pattern.addCausalVerbs = function (verbs) {
    for (var v in verbs) {
      verbs[v] = stemmer.stem(verbs[v]);
    }
    verbTrie.addStrings(verbs);
  };
  
  Pattern.addConcepts = function (concepts) {
    for (var c in concepts) {
      concepts[c] = stemmer.stem(concepts[c]);
    }
    conceptTrie.addStrings(concepts);
  }
  
  Pattern.isCausalVerb = function (verb, tag) {
    return {isCausal: verbTrie.contains(stemmer.stem(verb)), active: true};
  };
  

  /*
   * PATTERN COLLECTION PROTOTYPE
   */
  
  PatternCollection = this.PatternCollection = function () {};
  PatternCollection.prototype = {
    
  };
  
  return this;
  
}
