/**
 * @fileoverview Utilities for finding function context in AST
 * @module analyze/javascript/utils/function-finder
 */

const { NODE_TYPES } = require('../constants');

/**
 * Finds the name of the function that wraps a given node
 * @param {Object} node - The AST node to find the wrapper for
 * @param {Array<Object>} ancestors - Array of ancestor nodes from acorn-walk
 * @returns {string} The function name or 'global' if not in a function
 */
function findWrappingFunction(node, ancestors) {
  // Traverse ancestors from closest to furthest
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const current = ancestors[i];
    const functionName = extractFunctionName(current, node, ancestors[i - 1]);
    
    if (functionName) {
      return functionName;
    }
  }
  
  return 'global';
}

/**
 * Extracts function name from different AST node types
 * @param {Object} current - Current ancestor node
 * @param {Object} node - Original node being analyzed
 * @param {Object} [parent] - Parent of current node
 * @returns {string|null} Function name or null if not a function context
 */
function extractFunctionName(current, node, parent) {
  switch (current.type) {
    case NODE_TYPES.VARIABLE_DECLARATOR:
      return handleVariableDeclarator(current, node);
      
    case NODE_TYPES.FUNCTION_DECLARATION:
      return current.id ? current.id.name : 'anonymous';
      
    case NODE_TYPES.METHOD_DEFINITION:
      return current.key.name || 'anonymous';
      
    case NODE_TYPES.PROPERTY:
      return handleObjectProperty(current, node);
      
    case NODE_TYPES.EXPORT_NAMED:
      return handleNamedExport(current);
      
    default:
      return null;
  }
}

/**
 * Handles variable declarator nodes (const/let/var declarations)
 * @param {Object} declarator - VariableDeclarator node
 * @param {Object} node - Original node being analyzed
 * @returns {string|null} Function name or null
 */
function handleVariableDeclarator(declarator, node) {
  // Direct assignment: const myFunc = () => {}
  if (declarator.init === node) {
    return declarator.id.name;
  }
  
  // Function expression assignment
  if (declarator.init && isFunctionNode(declarator.init)) {
    return declarator.id.name;
  }
  
  return null;
}

/**
 * Handles object property nodes (methods in object literals)
 * @param {Object} property - Property node
 * @param {Object} node - Original node being analyzed
 * @returns {string|null} Function name or null
 */
function handleObjectProperty(property, node) {
  if (property.value === node || isFunctionNode(property.value)) {
    return property.key.name || property.key.value || 'anonymous';
  }
  return null;
}

/**
 * Handles named export declarations
 * @param {Object} exportNode - ExportNamedDeclaration node
 * @returns {string|null} Function name or null
 */
function handleNamedExport(exportNode) {
  if (!exportNode.declaration || !exportNode.declaration.declarations) {
    return null;
  }
  
  const declaration = exportNode.declaration.declarations[0];
  if (declaration && isFunctionNode(declaration.init)) {
    return declaration.id.name;
  }
  
  return null;
}

/**
 * Checks if a node is a function (arrow function or function expression)
 * @param {Object} node - AST node to check
 * @returns {boolean}
 */
function isFunctionNode(node) {
  return node && (
    node.type === NODE_TYPES.ARROW_FUNCTION ||
    node.type === NODE_TYPES.FUNCTION_EXPRESSION ||
    node.type === NODE_TYPES.FUNCTION_DECLARATION
  );
}

module.exports = {
  findWrappingFunction
};
