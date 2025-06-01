/**
 * @fileoverview Analytics source detection module
 * @module analyze/javascript/detectors/analytics-source
 */

const { ANALYTICS_PROVIDERS, NODE_TYPES } = require('../constants');

/**
 * Detects the analytics provider from a CallExpression node
 * @param {Object} node - AST CallExpression node
 * @param {string} [customFunction] - Custom function name to detect
 * @returns {string} The detected analytics source or 'unknown'
 */
function detectAnalyticsSource(node, customFunction) {
  if (!node.callee) {
    return 'unknown';
  }

  // Check for custom function first
  if (customFunction && isCustomFunction(node, customFunction)) {
    return 'custom';
  }

  // Check for function-based providers (e.g., gtag)
  const functionSource = detectFunctionBasedProvider(node);
  if (functionSource !== 'unknown') {
    return functionSource;
  }

  // Check for member-based providers (e.g., analytics.track)
  const memberSource = detectMemberBasedProvider(node);
  if (memberSource !== 'unknown') {
    return memberSource;
  }

  return 'unknown';
}

/**
 * Checks if the node is a custom function call
 * @param {Object} node - AST CallExpression node
 * @param {string} customFunction - Custom function name
 * @returns {boolean}
 */
function isCustomFunction(node, customFunction) {
  if (node.callee.type !== NODE_TYPES.IDENTIFIER) return false;
  if (customFunction instanceof RegExp) {
    return customFunction.test(node.callee.name);
  }
  return node.callee.name === customFunction;
}

/**
 * Detects function-based analytics providers
 * @param {Object} node - AST CallExpression node
 * @returns {string} Provider name or 'unknown'
 */
function detectFunctionBasedProvider(node) {
  if (node.callee.type !== NODE_TYPES.IDENTIFIER) {
    return 'unknown';
  }

  const functionName = node.callee.name;
  
  for (const provider of Object.values(ANALYTICS_PROVIDERS)) {
    if (provider.type === 'function' && provider.functionName === functionName) {
      return provider.name;
    }
  }

  return 'unknown';
}

/**
 * Detects member expression-based analytics providers
 * @param {Object} node - AST CallExpression node
 * @returns {string} Provider name or 'unknown'
 */
function detectMemberBasedProvider(node) {
  if (node.callee.type !== NODE_TYPES.MEMBER_EXPRESSION) {
    return 'unknown';
  }

  const objectName = node.callee.object.name;
  const methodName = node.callee.property.name;

  if (!objectName || !methodName) {
    return 'unknown';
  }

  for (const provider of Object.values(ANALYTICS_PROVIDERS)) {
    if (provider.type === 'member' && matchesMemberProvider(provider, objectName, methodName)) {
      return provider.name;
    }
  }

  return 'unknown';
}

/**
 * Checks if object and method names match a provider configuration
 * @param {Object} provider - Provider configuration
 * @param {string} objectName - Object name from AST
 * @param {string} methodName - Method name from AST
 * @returns {boolean}
 */
function matchesMemberProvider(provider, objectName, methodName) {
  if (provider.methodName !== methodName) {
    return false;
  }

  // Handle providers with multiple possible object names (e.g., mParticle/mparticle)
  if (provider.objectNames) {
    return provider.objectNames.includes(objectName);
  }

  return provider.objectName === objectName;
}

module.exports = {
  detectAnalyticsSource
};
