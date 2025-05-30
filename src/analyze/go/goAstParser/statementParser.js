const { tillNestEndImpl, splitTokensBy, getToken, tokensHasValue } = require('./utils');
const { parseExpr } = require('./expressionParser');
const { parseType, parseArgs, parseRetTypes, parseFuncSig } = require('./typeParser');

/**
 * Parse tokens into AST statements
 * @param {Array<Object>} tokens - Array of token objects
 * @returns {Array<Object>} AST nodes representing the parsed Go code
 */
function parseTokensToAst(tokens) {
  let tree = [];
  let i = 0;
  
  while (i < tokens.length) {
    function gtok(idx) {
      return getToken(tokens, idx);
    }
    
    function tillStmtEnd() {
      let toks = [];
      let lvl = 0;
      while (true) {
        if (i >= tokens.length) {
          return toks;
        }
        if (gtok(i).tag == "sigil" && gtok(i).value == ";") {
          break;
        }
        if ("[{(".includes(gtok(i).value)) {
          lvl++;
        } else if (")}]".includes(gtok(i).value)) {
          lvl--;
        } else if (gtok(i).tag == "newline") {
          if (lvl == 0) {
            if (gtok(i - 1).tag != "sigil" ||
              gtok(i - 1).value == ";" ||
              gtok(i - 1).value == "++" ||
              gtok(i - 1).value == "--" ||
              "}])".includes(gtok(i - 1).value)) {
              break;
            }
          }
        }
        toks.push(tokens[i]);
        i++;
      }
      return toks;
    }

    function tillNestEnd(l, r) {
      let [j, tk] = tillNestEndImpl(tokens, i, l, r);
      i = j;
      return tk;
    }

    // Package declaration
    if (gtok(i).tag == "ident" && gtok(i).value == "package") {
      tree.push({ tag: "package", name: gtok(i + 1).value });
      i += 2;
    }
    // Type declarations
    else if (gtok(i).tag == "ident" && gtok(i).value == "type") {
      if (gtok(i + 2).value == "struct") {
        let stmt = { tag: "typedef", name: gtok(i + 1).value, fields: [], embeds: [] };
        i += 4;
        let lns = splitTokensBy(tillNestEnd("{", "}"), "\n", ";");
        for (let j = 0; j < lns.length; j++) {
          let names = splitTokensBy(lns[j], ",");
          if (!names.length) {
            continue;
          }
          if (names.length == 1 && names[0].length == 1) {
            stmt.embeds.push(names[0][0].value);
          } else {
            let type = names[names.length - 1].slice(1);
            type = parseType(type);
            for (let k = 0; k < names.length; k++) {
              stmt.fields.push({ name: names[k][0].value, type });
            }
          }
        }
        i++;
        tree.push(stmt);
      } else if (gtok(i + 2).value == "interface") {
        let stmt = { tag: "interface", name: gtok(i + 1).value, methods: [] };
        i += 4;
        let lns = splitTokensBy(tillNestEnd("{", "}"), "\n", ";");
        for (let j = 0; j < lns.length; j++) {
          let name = lns[j][0];
          if (!name) {
            continue;
          }
          name = name.value;
          let sig = Object.assign({ name }, parseFuncSig(lns[j].slice(1)));
          stmt.methods.push(sig);
        }
        tree.push(stmt);
        i++;
      } else {
        let stmt = { tag: "typealias", name: gtok(i + 1).value };
        i += 2;
        let typ = tillStmtEnd();
        stmt.value = parseType(typ);
        tree.push(stmt);
      }
    }
    // Function declarations
    else if (gtok(i).tag == "ident" && gtok(i).value == "func") {
      let stmt = { tag: "func", receiver: null };
      if (gtok(i + 1).value == "(") {
        stmt.receiver = { name: gtok(i + 2).value };
        i += 3;
        stmt.receiver.type = parseType(tillNestEnd("(", ")"));
      }
      i++;
      stmt.name = gtok(i).value;
      i += 2;
      let args = tillNestEnd("(", ")");
      args = parseArgs(args);
      stmt.args = args;
      i++;
      stmt.returns = [];
      if (gtok(i).value != "{") {
        if (gtok(i).value != "(") {
          stmt.returns.push({ name: null, type: parseType(tillNestEnd("}", "{")) });
        } else {
          i++;
          stmt.returns = parseRetTypes(tillNestEnd("(", ")"));
          i++;
        }
      }
      i++;
      stmt.body = parseTokensToAst(tillNestEnd("{", "}"));
      tree.push(stmt);
      i++;
    }
    // If statements
    else if (gtok(i).tag == "ident" && gtok(i).value == "if") {
      let stmt = { tag: "if" };
      i += 1;
      let cond = tillNestEnd("}", "{");
      let conds = splitTokensBy(cond, ";");
      stmt.prepare = conds.slice(0, -1).map(parseExpr);
      stmt.condition = parseExpr(conds[conds.length - 1]);
      i++;
      stmt.body = parseTokensToAst(tillNestEnd("{", "}"));
      tree.push(stmt);
      i++;
    }
    // Else statements
    else if (gtok(i).tag == "ident" && gtok(i).value == "else") {
      if (gtok(i + 1).tag == "ident" && gtok(i + 1).value == "if") {
        let stmt = { tag: "elseif" };
        i += 2;
        let cond = tillNestEnd("}", "{");
        stmt.condition = parseExpr(cond);
        i++;
        stmt.body = parseTokensToAst(tillNestEnd("{", "}"));
        tree.push(stmt);
        i++;
      } else {
        let stmt = { tag: "else" };
        i++;
        i++;
        stmt.body = parseTokensToAst(tillNestEnd("{", "}"));
        tree.push(stmt);
        i++;
      }
    }
    // For loops
    else if (gtok(i).tag == "ident" && gtok(i).value == "for") {
      let stmt = { tag: "for" };
      i += 1;
      let head = tillNestEnd("}", "{");
      if (tokensHasValue(head, "range")) {
        stmt.tag = "foreach";
        let [lhs, rhs] = splitTokensBy(head, ":=");
        stmt.names = splitTokensBy(lhs, ",").map(x => x[0].value);
        stmt.container = parseExpr(rhs.slice(1));
        i++;
      } else {
        stmt.headers = splitTokensBy(head, ";").map(parseExpr);
        i++;
      }
      stmt.body = parseTokensToAst(tillNestEnd("{", "}"));
      tree.push(stmt);
      i++;
    }
    // Variable/constant declarations
    else if (gtok(i).tag == "ident" && (gtok(i).value == "var" || gtok(i).value == "const")) {
      let isconst = (gtok(i).value == "const");
      if (gtok(i + 1).value == "(") {
        // Block declarations
        i++;
        let toks = tillStmtEnd().slice(1, -1);
        let lns = splitTokensBy(toks, "\n", ";").filter(x => x.length);
        let lastval = null;
        let iota = 0;
        
        function inferval(rhs) {
          if (rhs == null) {
            if (lastval) {
              rhs = lastval.slice();
            } else {
              return null;
            }
          }
          lastval = rhs.slice();
          let diduseiota = false;
          for (let j = 0; j < rhs.length; j++) {
            if (rhs[j].value == "iota") {
              rhs[j] = { tag: "number", value: `${iota}` };
              diduseiota = true;
            }
          }
          if (diduseiota) {
            iota++;
          }
          return parseExpr(rhs);
        }
        
        for (let j = 0; j < lns.length; j++) {
          let sides = splitTokensBy(lns[j], "=");
          let lhs = sides[0];
          let type = lhs.slice(1);
          if (type.length) {
            type = parseType(type);
          } else {
            type = null;
          }
          let rhs = sides[1];
          let stmt = {
            tag: "declare",
            names: [lhs[0].value],
            value: inferval(rhs),
            type: type || { tag: "auto" },
            isconst,
          };
          tree.push(stmt);
        }
        i++;
      } else {
        // Single declaration
        i++;
        let toks = tillStmtEnd();
        let sides = splitTokensBy(toks, "=");
        let lhs = sides[0];
        let rhs = sides[1];
        let names = splitTokensBy(lhs, ",");
        let type = names[names.length - 1].slice(1);
        if (type) {
          type = parseType(type);
        }
        names = names.map(x => x[0].value);
        let stmt = {
          tag: "declare",
          names,
          value: (!rhs) ? null : parseExpr(rhs),
          type: type || { tag: "auto" },
          isconst,
        };
        tree.push(stmt);
        i++;
      }
    }
    // Switch statements
    else if (gtok(i).tag == "ident" && (gtok(i).value == "switch")) {
      let stmt = { tag: "switch" };
      i += 1;
      let cond = tillNestEnd("}", "{");
      stmt.condition = parseExpr(cond);
      i++;
      let body = tillNestEnd("{", "}");
      stmt.cases = [];
      let j = 0;
      let s0 = null;
      let s1 = null;
      while (j < body.length) {
        if (body[j].value == "case" || body[j].value == "default") {
          if (s0 == null) {
            s1 = null;
            s0 = [];
          } else {
            if (s0.length) {
              stmt.cases.push({
                tag: "case",
                condition: parseExpr(s0),
                body: parseTokensToAst(s1),
              });
            } else {
              stmt.cases.push({
                tag: "default",
                body: parseTokensToAst(s1),
              });
            }
            s0 = [];
            s1 = null;
          }
        } else if (body[j].value == ":") {
          s1 = [];
        } else {
          if (s1 != null) {
            s1.push(body[j]);
          } else if (s0 != null) {
            s0.push(body[j]);
          }
        }
        j++;
      }
      if (s0 != null) {
        if (s0.length) {
          stmt.cases.push({
            tag: "case",
            condition: parseExpr(s0),
            body: parseTokensToAst(s1),
          });
        } else {
          stmt.cases.push({
            tag: "default",
            body: parseTokensToAst(s1),
          });
        }
      }
      tree.push(stmt);
      i++;
    }
    // Newlines
    else if (gtok(i).tag == "newline") {
      i++;
    }
    // Comments
    else if (gtok(i).tag == "comment") {
      tree.push({ tag: "comment", text: gtok(i).value });
      i++;
    }
    // Return statements
    else if (gtok(i).value == "return") {
      i++;
      tree.push({ tag: "return", value: parseExpr(tillStmtEnd()) });
      i++;
    }
    // Import statements
    else if (gtok(i).value == "import") {
      i++;
      let imps = tillStmtEnd();
      for (let j = 0; j < imps.length - 1; j++) {
        if (imps[j].tag == "string") {
          tree.push({ tag: "import", value: imps[j].value });
        }
      }
      i++;
    }
    // Go statements
    else if (gtok(i).value == "go") {
      i++;
      let e = tillStmtEnd();
      tree.push({ tag: "invoke", func: parseExpr(e) });
      i++;
    }
    // Defer statements
    else if (gtok(i).value == "defer") {
      i++;
      let e = tillStmtEnd();
      tree.push({ tag: "defer", expr: parseExpr(e) });
      i++;
    }
    // Expression statements
    else {
      let toks = tillStmtEnd();
      let stmt = parseExpr(toks);
      if (stmt.tag == "expr") {
        stmt = {
          tag: "exec",
          expr: stmt,
        };
      }
      tree.push(stmt);
      i++;
    }
  }
  
  return tree;
}

module.exports = {
  parseTokensToAst
};
