const { SIGIL, DOT, WHITESPACE, NEWLINE, NUMBER, QUOTE } = require('./constants');

/**
 * Convert Go source code to tokens
 * @param {string} src - Go source code
 * @returns {Array<Object>} Array of token objects with tag, value, line, and col properties
 */
function tokenize(src) {
  let ident = "";
  let isNum = false;
  let tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;
  let sigilset = Array.from(new Set(SIGIL.join("")));

  /**
   * Add a newline token if the last token is not already a newline
   */
  function newlineMaybe() {
    if (tokens.length && tokens[tokens.length - 1].tag != "newline") {
      tokens.push({ tag: "newline", value: "\n", line: line, col: col });
    }
  }

  /**
   * Push the current identifier/number to tokens
   */
  function pushIdent() {
    if (ident.length) {
      tokens.push({ tag: isNum ? "number" : "ident", value: ident, line: line, col: col - ident.length });
      ident = "";
      isNum = false;
    }
  }

  /**
   * Update line and column position based on character
   * @param {string} char - Character being processed
   */
  function advancePosition(char) {
    if (NEWLINE.includes(char)) {
      line++;
      col = 1;
    } else {
      col++;
    }
  }

  while (i < src.length) {
    if (WHITESPACE.includes(src[i])) {
      pushIdent();
      advancePosition(src[i]);
      i++;
    } else if (NEWLINE.includes(src[i])) {
      pushIdent();
      newlineMaybe();
      advancePosition(src[i]);
      i++;
    } else if (src[i] == "/" && src[i + 1] == "/") {
      // Single-line comment
      var cmt = "";
      while (src[i] != "\n" && i < src.length) {
        cmt += src[i];
        advancePosition(src[i]);
        i++;
      }
      // tokens.push({tag:"comment",value:cmt});
      newlineMaybe();
      if (i < src.length) {
        advancePosition(src[i]);
        i++;
      }
    } else if (src[i] == "/" && src[i + 1] == "*") {
      // Multi-line comment
      advancePosition(src[i]);
      advancePosition(src[i + 1]);
      i += 2;
      let lvl = 0;
      while (true) {
        if (i > src.length * 2) {
          throw "Unexpected EOF";
        }
        if (src[i - 1] == "/" && src[i] == "*") {
          lvl++;
        }
        if (src[i - 1] == "*" && src[i] == "/") {
          if (!lvl) {
            advancePosition(src[i]);
            i++;
            break;
          }
          lvl--;
        }
        advancePosition(src[i]);
        i++;
      }
    } else if (QUOTE.includes(src[i])) {
      // String/char literal
      let startLine = line;
      let startCol = col;
      let j = i + 1;
      advancePosition(src[i]); // advance for opening quote
      while (true) {
        if (src[j] == "\\") {
          advancePosition(src[j]);
          j++;
          if (j < src.length) {
            advancePosition(src[j]);
            j++;
          }
        } else if (src[j] == src[i]) {
          advancePosition(src[j]); // advance for closing quote
          break;
        } else {
          advancePosition(src[j]);
          j++;
        }
      }
      j++;
      tokens.push({ tag: src[i] == "'" ? "char" : "string", value: src.slice(i, j), line: startLine, col: startCol });
      i = j;
    } else if (src[i] == "." && src[i + 1] == "." && src[i + 2] == ".") {
      // Ellipsis
      pushIdent();
      tokens.push({ tag: "sigil", value: "...", line: line, col: col });
      advancePosition(src[i]);
      advancePosition(src[i + 1]);
      advancePosition(src[i + 2]);
      i += 3;
    } else if (sigilset.includes(src[i])) {
      // Handle sigils
      if (src[i] == "-" || src[i] == "+") { // e.g. 1e+8 1E-9
        if (isNum && ident[ident.length - 1] == "e" || ident[ident.length - 1] == "E") {
          ident += src[i];
          advancePosition(src[i]);
          i++;
          continue;
        }
      }
      pushIdent();
      let done = false;
      for (var j = 0; j < SIGIL.length; j++) {
        let l = SIGIL[j].length;
        let ok = true;
        for (var k = 0; k < l; k++) {
          if (src[i + k] != SIGIL[j][k]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          tokens.push({ tag: "sigil", value: SIGIL[j], line: line, col: col });
          for (let k = 0; k < l; k++) {
            advancePosition(src[i + k]);
          }
          i += l;
          done = true;
          break;
        }
      }
    } else if (DOT.includes(src[i])) {
      // Handle dot
      if (isNum) {
        ident += src[i];
        advancePosition(src[i]);
        i++;
      } else {
        pushIdent();
        tokens.push({ tag: "sigil", value: DOT, line: line, col: col });
        advancePosition(src[i]);
        i++;
      }
    } else if (NUMBER.includes(src[i])) {
      // Handle numbers
      if (ident.length == 0) {
        isNum = true;
      }
      ident += src[i];
      advancePosition(src[i]);
      i++;
    } else {
      // Handle identifiers
      ident += src[i];
      advancePosition(src[i]);
      i++;
    }
  }
  pushIdent();
  newlineMaybe();
  return tokens;
}

module.exports = {
  tokenize
};
