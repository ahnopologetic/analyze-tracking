const { tokenize } = require('./tokenizer');
const { parseTokensToAst } = require('./statementParser');

/**
 * Go AST Parser class
 * Provides methods to parse Go source code into an Abstract Syntax Tree
 */
class GoAstParser {
  /**
   * Parse Go source code to AST
   * @param {string} src - Go source code
   * @returns {Array<Object>} AST nodes representing the parsed Go code
   */
  parse(src) {
    const tokens = this.tokenize(src);
    const tree = this.parseTokens(tokens);
    return tree;
  }

  /**
   * Tokenize Go source code
   * @param {string} src - Go source code
   * @returns {Array<Object>} Array of token objects
   */
  tokenize(src) {
    return tokenize(src);
  }

  /**
   * Parse tokens to AST
   * @param {Array<Object>} tokens - Array of token objects
   * @returns {Array<Object>} AST nodes representing the parsed Go code
   */
  parseTokens(tokens) {
    return parseTokensToAst(tokens);
  }
}

/**
 * Extract Go Abstract Syntax Tree from source code
 * @param {string} src - Go source code
 * @returns {Array<Object>} AST nodes representing the parsed Go code
 */
function extractGoAST(src) {
  const parser = new GoAstParser();
  return parser.parse(src);
}

module.exports = {
  GoAstParser,
  extractGoAST
};
