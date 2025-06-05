/**
 * @fileoverview Utilities for finding function context in TypeScript AST
 * @module analyze/typescript/utils/function-finder
 */

const ts = require('typescript');

const REACT_HOOKS = new Set([
  'useCallback',
  'useEffect',
  'useMemo',
  'useLayoutEffect',
  'useReducer',
  'useState',
  // Add more React hooks as needed
]);

/**
 * Finds the name of the function that wraps a given node
 * @param {Object} node - The TypeScript AST node to find the wrapper for
 * @returns {string} The function name or 'global' if not in a function
 */
function findWrappingFunction(node) {
  let current = node;
  
  while (current) {
    const functionName = extractFunctionName(current);
    
    if (functionName) {
      return functionName;
    }
    
    current = current.parent;
  }
  
  return 'global';
}

/**
 * Extracts function name from different TypeScript AST node types
 * @param {Object} node - Current TypeScript node
 * @returns {string|null} Function name or null if not a function context
 */
function extractFunctionName(node) {
  // Function declaration
  if (ts.isFunctionDeclaration(node)) {
    return node.name ? node.name.escapedText : 'anonymous';
  }
  
  // Method declaration in class
  if (ts.isMethodDeclaration(node)) {
    return node.name ? node.name.escapedText : 'anonymous';
  }
  
  // Arrow function or function expression
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    return findParentFunctionName(node) || 'anonymous';
  }
  
  // Constructor
  if (ts.isConstructorDeclaration(node)) {
    return 'constructor';
  }
  
  // Getter/Setter
  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
    return node.name ? `${ts.isGetAccessorDeclaration(node) ? 'get' : 'set'} ${node.name.escapedText}` : 'anonymous';
  }
  
  return null;
}

/**
 * Finds the parent function name for arrow functions or function expressions
 * @param {Object} node - Arrow function or function expression node
 * @returns {string|null} Parent function name or null
 */
function findParentFunctionName(node) {
  const parent = node.parent;
  
  if (!parent) return null;
  
  if (
    ts.isCallExpression(parent) &&
    ts.isIdentifier(parent.expression) &&
    REACT_HOOKS.has(parent.expression.escapedText)
  ) {
    if (
      parent.parent &&
      ts.isVariableDeclaration(parent.parent) &&
      parent.parent.name
    ) {
      return `${parent.expression.escapedText}(${parent.parent.name.escapedText})`;
    }
    return `${parent.expression.escapedText}()`;
  }
  
  // Variable declaration: const myFunc = () => {}
  if (ts.isVariableDeclaration(parent) && parent.name) {
    // Check if initializer is a recognized React hook call
    if (
      parent.initializer &&
      ts.isCallExpression(parent.initializer) &&
      ts.isIdentifier(parent.initializer.expression) &&
      REACT_HOOKS.has(parent.initializer.expression.escapedText)
    ) {
      return `${parent.initializer.expression.escapedText}(${parent.name.escapedText})`;
    }
    return parent.name.escapedText;
  }
  
  // Property assignment: { myFunc: () => {} }
  if (ts.isPropertyAssignment(parent) && parent.name) {
    if (ts.isIdentifier(parent.name)) {
      return parent.name.escapedText;
    }
    if (ts.isStringLiteral(parent.name)) {
      return parent.name.text;
    }
  }
  
  // Method property in object literal: { myFunc() {} }
  if (ts.isMethodDeclaration(parent) && parent.name) {
    return parent.name.escapedText;
  }
  
  // Binary expression assignment: obj.myFunc = () => {}
  if (ts.isBinaryExpression(parent) && 
      parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    if (ts.isPropertyAccessExpression(parent.left)) {
      return parent.left.name.escapedText;
    }
  }
  
  // Call expression argument: someFunc(() => {})
  if (ts.isCallExpression(parent)) {
    const argIndex = parent.arguments.indexOf(node);
    if (argIndex >= 0) {
      return `anonymous-callback-${argIndex}`;
    }
  }
  
  return null;
}

module.exports = {
  findWrappingFunction
};
