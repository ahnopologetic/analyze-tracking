const { tillNestEndImpl, splitTokensBy } = require('./utils');

/**
 * Parse a type from tokens
 * @param {Array<Object>} toks - Tokens representing a type
 * @returns {Object} AST node representing the type
 */
function parseType(toks) {
  if (toks.length == 1) {
    return { tag: toks[0].value };
  }
  
  let i = 0;
  while (i < toks.length) {
    function tillNestEnd(l, r) {
      let [j, tk] = tillNestEndImpl(toks, i, l, r);
      i = j;
      return tk;
    }

    if (toks[i].value == "[") {
      // Array type
      let typ = { tag: "array", size: null, item: null };
      i++;
      typ.size = parseExpr(tillNestEnd("[", "]"));
      i++;
      typ.item = parseType(toks.slice(i));
      return typ;
    } else if (toks[i].value == "...") {
      // Variadic type
      let typ = { tag: "rest", item: null };
      i++;
      typ.item = parseType(toks.slice(i));
      return typ;
    } else if (toks[i].value == "*") {
      // Pointer type
      return { tag: "ptr", item: parseType(toks.slice(i + 1)) };
    } else if (toks[i].value == "map") {
      // Map type
      let typ = { tag: "map", key: null, value: null };
      i += 2;
      let te = tillNestEnd("[", "]");
      typ.key = parseType(te);
      i++;
      typ.value = parseType(toks.slice(i));
      return typ;
    } else if (toks[i].value == "func") {
      // Function type
      return { tag: "lambda", ...parseFuncSig(toks.slice(i + 1)) };
    } else if (toks[i].value == "interface") {
      // Interface type
      return { tag: "interface" };
    } else if (toks[i].value == "<-" && toks[i + 1].value == "chan") {
      // Receive-only channel
      return { tag: "chan", item: parseType(toks.slice(i + 2)), mode: 'i' };
    } else if (toks[i].value == "chan" && toks[i + 1].value == "<-") {
      // Send-only channel
      return { tag: "chan", item: parseType(toks.slice(i + 2)), mode: 'o' };
    } else if (toks[i].value == "chan") {
      // Bidirectional channel
      return { tag: "chan", item: parseType(toks.slice(i + 1)), mode: 'io' };
    } else if (toks[i + 1] && toks[i + 1].value == ".") {
      // Namespaced type
      return { tag: "namespaced", namespace: toks[i].value, item: parseType(toks.slice(i + 2)) };
    }
  }
}

/**
 * Parse return types from tokens
 * @param {Array<Object>} toks - Tokens containing return types
 * @returns {Array<Object>} Array of return type objects with name and type properties
 */
function parseRetTypes(toks) {
  let items = splitTokensBy(toks, ",");
  let simple = true;
  
  for (let j = 0; j < items.length; j++) {
    if (items[j].length != 1) {
      if (items[j][0].value != "map" && items[j][0].value != "[" && items[j][0].value != "*") {
        simple = false;
      }
      break;
    }
  }
  
  if (simple) {
    return items.map(x => ({ name: null, type: parseType(x) }));
  }
  
  let ret = items.map(x => ({}));
  for (let j = items.length - 1; j >= 0; j--) {
    let name = items[j][0].value;
    let type = items[j].slice(1);
    if (!type.length) {
      type = ret[j + 1].type;
    } else {
      type = parseType(type);
    }
    ret[j].name = name;
    ret[j].type = type;
  }
  return ret;
}

/**
 * Parse function arguments
 * @param {Array<Object>} toks - Tokens containing arguments
 * @returns {Array<Object>} Array of argument objects with name and type
 */
function parseArgs(toks) {
  let args = [];
  let i = 0;
  let lvl = 0;
  
  while (i < toks.length) {
    let arg = {};
    arg.name = toks[i].value;
    i++;
    let typ = [];
    let lvl = 0;
    while (i < toks.length) {
      if (toks[i].value == "(") {
        lvl++;
      } else if (toks[i].value == ")") {
        lvl--;
      } else if (toks[i].value == ",") {
        if (lvl == 0) {
          break;
        }
      }
      typ.push(toks[i]);
      i++;
    }
    arg.type = parseType(typ);
    i++;
    args.push(arg);
  }

  // Infer types for arguments without explicit types
  for (i = args.length - 1; i >= 0; i--) {
    if (args[i].type == undefined) {
      args[i].type = args[i + 1].type;
    }
  }
  return args;
}

/**
 * Parse function signature
 * @param {Array<Object>} toks - Tokens containing function signature
 * @returns {Object} Object with args and returns properties
 */
function parseFuncSig(toks) {
  let lvl = 0;
  let k;
  
  for (k = 1; k < toks.length; k++) {
    if (toks[k].value == "(") {
      lvl++;
    } else if (toks[k].value == ")") {
      if (lvl == 0) {
        break;
      }
      lvl--;
    }
  }

  let args = toks.slice(1, k);
  args = parseRetTypes(args);
  
  let rets = toks.slice(k + 1);
  if (rets.length) {
    while (rets[0].value == "(") {
      rets = rets.slice(1, -1);
    }
    rets = parseRetTypes(rets);
  } else {
    rets = [];
  }
  
  return { args: args, returns: rets };
}

// These need to be injected from the expression parser to avoid circular dependencies
let parseExpr = null;

/**
 * Set the expression parser function (to avoid circular dependencies)
 * @param {Function} exprParser - Expression parser function
 */
function setExpressionParser(exprParser) {
  parseExpr = exprParser;
}

module.exports = {
  parseType,
  parseRetTypes,
  parseArgs,
  parseFuncSig,
  setExpressionParser
};
