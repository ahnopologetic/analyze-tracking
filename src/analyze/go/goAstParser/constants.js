/**
 * Constants used by the Go AST parser
 */

// Token sigils (operators and delimiters)
const SIGIL = [
  /*TRIPLE*/ "<<=", ">>=",
  /*DOUBLE*/ "+=", "-=", "*=", "/=", "%=", "++", "--", ":=", "==", "&&", "||", ">=", "<=", "<<", ">>", "&=", "^=", "|=", "!=", "<-",
  /*SINGLE*/ "=", "+", "-", "*", "/", "%", "{", "}", "[", "]", "(", ")", ",", "&", "|", "!", "<", ">", "^", ";", ":"
];

// Operators (sigils excluding delimiters)
const OPERATOR = SIGIL.filter(x => !["{", "}", "[", "]", ";", ":=", "="].includes(x));

// Character classes
const DOT = ".";
const WHITESPACE = " \t";
const NEWLINE = "\n\r";
const NUMBER = "01234567890";
const QUOTE = "\"'`";

// Primitive Go types
const PRIMTYPES = [
  "int", "byte", "bool", "float32", "float64", 
  "int8", "int32", "int16", "int64", 
  "uint8", "uint32", "uint16", "uint64", 
  "rune", "string"
];

module.exports = {
  SIGIL,
  OPERATOR,
  DOT,
  WHITESPACE,
  NEWLINE,
  NUMBER,
  QUOTE,
  PRIMTYPES
};
