/**
 * @fileoverview Type context builder for Go AST analysis
 * @module analyze/go/typeContext
 */

/**
 * Build a context of type information from the AST
 * @param {Array<Object>} ast - Abstract Syntax Tree of the Go file
 * @returns {Object} Type context object with 'functions' and 'globals' properties
 * @returns {Object} typeContext.functions - Map of function names to their parameter and local variable types
 * @returns {Object} typeContext.globals - Map of global variable names to their types and values
 */
function buildTypeContext(ast) {
  const context = {
    functions: {},
    globals: {}
  };
  
  for (const node of ast) {
    if (node.tag === 'func') {
      // Store function parameter types
      context.functions[node.name] = {
        params: {},
        locals: {}
      };
      
      if (node.args) {
        for (const arg of node.args) {
          if (arg.name && arg.type) {
            context.functions[node.name].params[arg.name] = { type: arg.type };
          }
        }
      }
      
      // Scan function body for local variable declarations
      if (node.body) {
        scanForDeclarations(node.body, context.functions[node.name].locals);
      }
    } else if (node.tag === 'declare') {
      // Global variable declarations
      if (node.names && node.names.length > 0 && node.type) {
        for (const name of node.names) {
          context.globals[name] = { type: node.type, value: node.value };
        }
      }
    }
  }
  
  return context;
}

/**
 * Scan statements for variable declarations
 * @param {Array<Object>} body - Array of AST statement nodes to scan
 * @param {Object} locals - Object to store local variable declarations (modified in place)
 */
function scanForDeclarations(body, locals) {
  for (const stmt of body) {
    if (stmt.tag === 'declare') {
      if (stmt.names && stmt.type) {
        for (const name of stmt.names) {
          locals[name] = { type: stmt.type, value: stmt.value };
        }
      }
    } else if (stmt.tag === 'if' && stmt.body) {
      scanForDeclarations(stmt.body, locals);
    } else if (stmt.tag === 'elseif' && stmt.body) {
      scanForDeclarations(stmt.body, locals);
    } else if (stmt.tag === 'else' && stmt.body) {
      scanForDeclarations(stmt.body, locals);
    } else if (stmt.tag === 'for' && stmt.body) {
      scanForDeclarations(stmt.body, locals);
    } else if (stmt.tag === 'foreach' && stmt.body) {
      scanForDeclarations(stmt.body, locals);
    } else if (stmt.tag === 'switch' && stmt.cases) {
      for (const caseNode of stmt.cases) {
        if (caseNode.body) {
          scanForDeclarations(caseNode.body, locals);
        }
      }
    }
  }
}

module.exports = {
  buildTypeContext,
  scanForDeclarations
};
