/**
 * Parser utility functions
 */

/**
 * Get token at index or empty object
 * @param {Array<Object>} tokens - Token array
 * @param {number} i - Token index
 * @returns {Object} Token object or empty object
 */
function getToken(tokens, i) {
  return tokens[i] || {};
}

/**
 * Check if tokens array contains a specific value
 * @param {Array<Object>} toks - Array of tokens
 * @param {string} val - Value to search for
 * @returns {boolean} True if value is found
 */
function tokensHasValue(toks, val) {
  for (var i = 0; i < toks.length; i++) {
    if (toks[i].value == val) {
      return true;
    }
  }
  return false;
}

/**
 * Extract tokens until a matching closing delimiter
 * @param {Array<Object>} toks - Token array
 * @param {number} i - Starting index
 * @param {string} l - Opening delimiter
 * @param {string} r - Closing delimiter
 * @returns {Array} [endIndex, extractedTokens]
 */
function tillNestEndImpl(toks, i, l, r) {
  let tk = [];
  let lvl = 0;

  while (true) {
    if (i >= toks.length) {
      return [i, tk];
    }
    if (toks[i].value == l) {
      lvl++;
    } else if (toks[i].value == r) {
      if (lvl == 0) {
        return [i, tk];
      }
      lvl--;
    }
    tk.push(toks[i]);
    i++;
  }
  return [i, tk];
}

/**
 * Split tokens by delimiter(s)
 * @param {Array<Object>} toks - Tokens to split
 * @param {string} delim - Primary delimiter
 * @param {string} [delim2] - Optional secondary delimiter
 * @returns {Array<Array<Object>>} Array of token groups
 */
function splitTokensBy(toks, delim, delim2) {
  let groups = [];
  let gp = [];
  let lvl = 0;
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].value == "{" || toks[i].value == "(" || toks[i].value == "[") {
      lvl++;
      gp.push(toks[i]);
    } else if (toks[i].value == "}" || toks[i].value == ")" || toks[i].value == "]") {
      lvl--;
      gp.push(toks[i]);
    } else if (toks[i].value == delim && lvl == 0) {
      groups.push(gp);
      gp = [];
    } else if (delim2 != undefined && toks[i].value == delim2 && lvl == 0) {
      groups.push(gp);
      gp = [];
    } else {
      gp.push(toks[i]);
    }
  }
  if (groups.length || gp.length) {
    groups.push(gp);
  }
  return groups;
}

module.exports = {
  getToken,
  tokensHasValue,
  tillNestEndImpl,
  splitTokensBy
};
