/**
 * security-config.js
 *
 * Configures route security protocols and methods.
 */

module.exports = function (natural, WNdb, pos, status) {
  
  var tokenizer = natural.WordTokenizer(),
      Trie = natural.Trie,
      verbTrie = new Trie(),
      wordnet = new natural.WordNet(WNdb.path),
      lexer = new pos.Lexer(),
      tagger = new pos.Tagger(),
      
      causalVerbs = ["allow", "block", "cause", "enable", "force", "get", "help", "hinder", "hold", "impede", "keep", "leave", "let", "make", "permit", "prevent", "protect", "restrain", "save", "set", "start", "stimulate", "stop", "as", "due", "to", "because", "helped", "aid", "bar", "bribe", "compel", "constrain", "convince", "deter", "discourage", "dissuade", "drive", "have", "hamper", "impel", "incite", "induce", "influence", "inspire", "lead", "move", "persuade", "prompt", "push", "restrict", "rouse", "send", "spur"];
  
  // Set up the verb Trie
  verbTrie.addStrings(causalVerbs);
  
  Pattern = this.Pattern = function (sentence) {
    this.elements = [];
    sentence = lexer.lex(sentence);
    
    var tags = tagger.tag(sentence);
    
    for (var t in tags) {
      // Log the pos for each element
      this.elements.push(
        {
          concept: tags[t][0],
          tag: tags[t][1]
        }
      );
    }
    
    return this;
  };
  
  PatternCollection = this.PatternCollection = function () {};
  
  /*
   * PATTERN PROTOTYPE
   */
  Pattern.prototype = {
    
  };
  
  /*
   * PATTERN COLLECTION PROTOTYPE
   */
  
  // Use natural's trie perhaps?
  PatternCollection.prototype = {
    
  };
  
  return this;
  
}
