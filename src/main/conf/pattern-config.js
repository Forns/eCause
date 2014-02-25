/**
 * security-config.js
 *
 * Configures route security protocols and methods.
 */

module.exports = function (natural, WNdb, pos, status) {
  
  var tokenizer = natural.WordTokenizer(),
      wordnet = new natural.WordNet(WNdb.path),
      lexer = new pos.Lexer(),
      tagger = new pos.Tagger();
  
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
