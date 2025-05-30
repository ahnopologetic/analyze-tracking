const { OPERATOR, PRIMTYPES } = require('./constants');
const { tillNestEndImpl, splitTokensBy } = require('./utils');
const { parseType, parseArgs, parseRetTypes, setExpressionParser } = require('./typeParser');

/**
 * Parse an expression from tokens
 * @param {Array<Object>} toks - Tokens to parse
 * @returns {Object} AST node representing the expression
 */
function parseExpr(toks) {
  let i;
  let lvl = 0;
  
  // Check for variable declaration (:=)
  for (i = 0; i < toks.length; i++) {
    if ("{[(".includes(toks[i].value)) {
      lvl++;
    }
    if (")]}".includes(toks[i].value)) {
      lvl--;
    }
    if (toks[i].value == ":=") {
      if (lvl != 0) {
        continue;
      }
      return {
        tag: "declare",
        names: splitTokensBy(toks.slice(0, i), ",").map(x => x[0].value),
        value: parseExpr(toks.slice(i + 1)),
        type: { tag: "auto" },
        isconst: false,
      };
    }
  }
  
  // Check for assignment (=)
  lvl = 0;
  for (i = 0; i < toks.length; i++) {
    if ("{[(".includes(toks[i].value)) {
      lvl++;
    }
    if (")]}".includes(toks[i].value)) {
      lvl--;
    }
    if (toks[i].value == "=") {
      if (lvl != 0) {
        continue;
      }
      return {
        tag: "assign",
        lhs: parseExpr(toks.slice(0, i)),
        rhs: parseExpr(toks.slice(i + 1)),
      };
    }
  }

  // Check for comma-separated expressions (tuple)
  let groups = splitTokensBy(toks, ",");
  if (groups.length > 1) {
    return {
      tag: "tuple",
      items: groups.map(parseExpr),
    };
  }

  // Parse individual expression components
  let body = [];
  i = 0;
  
  while (i < toks.length) {
    function tillNestEnd(l, r) {
      let [j, tk] = tillNestEndImpl(toks, i, l, r);
      i = j;
      return tk;
    }

    if (toks[i].value == "(") {
      // Handle parentheses
      if (i > 0 && (toks[i - 1].tag == "ident") && (toks[i - 1].value == "make") && (body.length < 2 || body[body.length - 2].tag != "access")) {
        // make() function
        i++;
        body.pop();
        let args = splitTokensBy(tillNestEnd("(", ")"), ",");
        body.push({
          tag: "alloc",
          type: parseType(args[0]),
          size: args[1] ? parseExpr(args[1]) : null,
        });
        i++;
      } else if (i > 0 && (toks[i - 1].tag == "ident" || toks[i - 1].value == "]" || toks[i - 1].value == "}" || toks[i - 1].value == ")")) {
        // Function call or type cast
        let fun = body.pop();
        if (fun.tag == "ident" && PRIMTYPES.includes(fun.value)) {
          // Type cast
          i++;
          body.push({
            tag: "cast",
            type: { tag: fun.value },
            value: parseExpr(tillNestEnd("(", ")"))
          });
          i++;
        } else {
          // Function call
          i++;
          let startToken = fun.line ? fun : (toks[i - 1] || {});
          body.push({
            tag: "call",
            func: fun,
            args: splitTokensBy(tillNestEnd("(", ")"), ",").map(parseExpr),
            line: startToken.line,
            col: startToken.col
          });
          i++;
        }
      } else {
        // Parenthesized expression
        i++;
        body.push(parseExpr(tillNestEnd("(", ")")));
        i++;
      }
    } else if (toks[i].value == ".") {
      // Member access
      i++;
      body.push({
        tag: "access",
        struct: body.pop(),
        member: toks[i].value,
      });
      i++;
    } else if (toks[i].value == "[") {
      // Indexing or array literal
      if (i > 0 && (toks[i - 1].tag == "ident" || toks[i - 1].value == "]")) {
        // Indexing or slicing
        i++;
        let idx = tillNestEnd("[", "]");
        let idc = splitTokensBy(idx, ":");
        if (idc.length == 1) {
          body.push({
            tag: "index",
            container: body.pop(),
            index: parseExpr(idx),
          });
        } else {
          body.push({
            tag: "slice",
            container: body.pop(),
            lo: parseExpr(idc[0]),
            hi: parseExpr(idc[1]),
          });
        }
        i++;
      } else {
        // Array literal
        i++;
        let size = tillNestEnd("[", "]");
        let mode = 0;
        for (var j = 0; j < toks.length; j++) {
          if (toks[j].value == "{") {
            mode = 0;
            break;
          } else if (toks[j].value == "(") {
            mode = 1;
            break;
          }
        }
        if (mode == 0) {
          let lit = {
            tag: "arraylit",
            size: parseExpr(size),
          };
          i++;
          lit.type = parseType(tillNestEnd("}", "{"));
          i++;
          lit.items = splitTokensBy(tillNestEnd("{", "}"), ",");
          body.push(lit);
          i++;
        } else {
          i++;
          let type = tillNestEnd(")", "(");
          type = parseType(type);
          i++;
          let val = parseExpr(tillNestEnd("(", ")"));
          body.push({
            tag: "cast",
            type: { tag: "array", size: parseExpr(size), item: type },
            value: val
          });
          i++;
        }
      }
    } else if (toks[i].value == "{") {
      // Struct literal
      i++;
      let cont = tillNestEnd("{", "}");
      cont = splitTokensBy(cont, ",");
      let fields = [];
      for (let j = 0; j < cont.length; j++) {
        // Fix: Don't split by colon - check the structure of the field instead
        let fieldTokens = cont[j];
        
        // Check if this is a key:value field (field name followed by colon)
        let colonIndex = -1;
        let lvl = 0;
        for (let k = 0; k < fieldTokens.length; k++) {
          if ("{[(".includes(fieldTokens[k].value)) {
            lvl++;
          } else if (")]}".includes(fieldTokens[k].value)) {
            lvl--;
          } else if (fieldTokens[k].value === ":" && lvl === 0) {
            colonIndex = k;
            break;
          }
        }
        
        if (colonIndex > 0 && fieldTokens[colonIndex - 1].tag === "ident") {
          // Named field: name: value
          let name = fieldTokens[colonIndex - 1].value;
          let valueTokens = fieldTokens.slice(colonIndex + 1);
          fields.push({ name: name, value: parseExpr(valueTokens) });
        } else {
          // Unnamed field or map literal field
          fields.push({ name: null, value: parseExpr(fieldTokens) });
        }
      }
      let structType = body.pop();
      let startToken = structType.line ? structType : (toks[i - 1] || {});
      body.push({
        tag: "structlit",
        struct: structType,
        fields,
        line: startToken.line,
        col: startToken.col
      });
      i++;
    } else if (toks[i].tag == "sigil" && OPERATOR.includes(toks[i].value)) {
      // Operator
      body.push({ tag: "op", value: toks[i].value });
      i++;
    } else if (toks[i].tag == "newline") {
      // Skip newlines
      i++;
    } else if (toks[i].value == "func") {
      // Lambda function
      let stmt = { tag: "lambda" };
      i++;
      i++;
      let args = tillNestEnd("(", ")");
      args = parseArgs(args);
      stmt.args = args;
      i++;
      stmt.returns = [];
      if (toks[i].value != "{") {
        if (toks[i].value != "(") {
          stmt.returns.push({ name: null, type: parseType(tillNestEnd("}", "{")) });
        } else {
          i++;
          stmt.returns = parseRetTypes(tillNestEnd("(", ")"));
          i++;
        }
      }
      i++;
      const { parseTokensToAst } = require('./statementParser');
      stmt.body = parseTokensToAst(tillNestEnd("{", "}"));
      body.push(stmt);
      i++;
    } else {
      // Regular token
      body.push(toks[i]);
      i++;
    }
  }
  
  return { tag: "expr", body };
}

// Set the expression parser in type parser to avoid circular dependency
setExpressionParser(parseExpr);

module.exports = {
  parseExpr
};
