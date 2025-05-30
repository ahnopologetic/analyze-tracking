/**
 * @fileoverview AST traversal utilities for Ruby code analysis
 * @module analyze/ruby/traversal
 */

/**
 * Finds the wrapping function for a given node
 * @param {Object} node - The current AST node
 * @param {Array} ancestors - The ancestor nodes stack
 * @returns {string} - The function name or 'global'/'block'
 */
async function findWrappingFunction(node, ancestors) {
  const { DefNode, BlockNode, LambdaNode } = await import('@ruby/prism');

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const current = ancestors[i];

    // Handle method definitions
    if (current instanceof DefNode) {
      return current.name;
    }

    // Handle blocks and lambdas
    if (current instanceof BlockNode || current instanceof LambdaNode) {
      return 'block';
    }
  }
  return 'global';
}

/**
 * Recursively traverses the AST tree
 * @param {Object} node - The current AST node
 * @param {Function} nodeVisitor - Function to call for each node
 * @param {Array} ancestors - The ancestor nodes stack
 */
async function traverseNode(node, nodeVisitor, ancestors = []) {
  const { 
    ProgramNode, 
    StatementsNode, 
    DefNode, 
    IfNode, 
    BlockNode, 
    ArgumentsNode, 
    HashNode, 
    AssocNode, 
    ClassNode, 
    ModuleNode,
    CallNode
  } = await import('@ruby/prism');

  if (!node) return;

  ancestors.push(node);

  // Call the visitor for this node
  if (node instanceof CallNode) {
    await nodeVisitor(node, ancestors);
  }

  // Visit all child nodes based on node type
  if (node instanceof ProgramNode) {
    await traverseNode(node.statements, nodeVisitor, ancestors);
  } else if (node instanceof StatementsNode) {
    for (const child of node.body) {
      await traverseNode(child, nodeVisitor, ancestors);
    }
  } else if (node instanceof ClassNode) {
    if (node.body) {
      await traverseNode(node.body, nodeVisitor, ancestors);
    }
  } else if (node instanceof ModuleNode) {
    if (node.body) {
      await traverseNode(node.body, nodeVisitor, ancestors);
    }
  } else if (node instanceof DefNode) {
    if (node.body) {
      await traverseNode(node.body, nodeVisitor, ancestors);
    }
  } else if (node instanceof IfNode) {
    if (node.statements) {
      await traverseNode(node.statements, nodeVisitor, ancestors);
    }
    if (node.subsequent) {
      await traverseNode(node.subsequent, nodeVisitor, ancestors);
    }
  } else if (node instanceof BlockNode) {
    if (node.body) {
      await traverseNode(node.body, nodeVisitor, ancestors);
    }
  } else if (node instanceof ArgumentsNode) {
    for (const arg of node.arguments) {
      await traverseNode(arg, nodeVisitor, ancestors);
    }
  } else if (node instanceof HashNode) {
    for (const element of node.elements) {
      await traverseNode(element, nodeVisitor, ancestors);
    }
  } else if (node instanceof AssocNode) {
    await traverseNode(node.key, nodeVisitor, ancestors);
    await traverseNode(node.value, nodeVisitor, ancestors);
  }

  ancestors.pop();
}

/**
 * Gets the line number for a given location in the code
 * @param {string} code - The full source code
 * @param {Object} location - The location object with startOffset
 * @returns {number} - The line number (1-indexed)
 */
function getLineNumber(code, location) {
  // Count the number of newlines before the start offset
  const beforeStart = code.slice(0, location.startOffset);
  return beforeStart.split('\n').length;
}

module.exports = {
  findWrappingFunction,
  traverseNode,
  getLineNumber
};
