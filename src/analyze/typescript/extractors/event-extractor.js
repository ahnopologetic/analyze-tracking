/**
 * @fileoverview Event extraction logic for different analytics providers
 * @module analyze/typescript/extractors/event-extractor
 */

const ts = require('typescript');
const { extractProperties } = require('./property-extractor');
const { resolveIdentifierToInitializer } = require('../utils/type-resolver');

/**
 * Event data structure
 * @typedef {Object} EventData
 * @property {string|null} eventName - The event name
 * @property {Object|null} propertiesNode - AST node containing event properties
 */

/**
 * Provider-specific extraction strategies
 */
const EXTRACTION_STRATEGIES = {
  googleanalytics: extractGoogleAnalyticsEvent,
  snowplow: extractSnowplowEvent,
  mparticle: extractMparticleEvent,
  default: extractDefaultEvent
};

/**
 * Extracts event information from a CallExpression node
 * @param {Object} node - TypeScript CallExpression node
 * @param {string} source - Analytics provider source
 * @param {Object} checker - TypeScript type checker
 * @param {Object} sourceFile - TypeScript source file
 * @returns {EventData} Extracted event data
 */
function extractEventData(node, source, checker, sourceFile) {
  const strategy = EXTRACTION_STRATEGIES[source] || EXTRACTION_STRATEGIES.default;
  return strategy(node, checker, sourceFile);
}

/**
 * Extracts Google Analytics event data
 * @param {Object} node - CallExpression node
 * @param {Object} checker - TypeScript type checker
 * @param {Object} sourceFile - TypeScript source file
 * @returns {EventData}
 */
function extractGoogleAnalyticsEvent(node, checker, sourceFile) {
  if (!node.arguments || node.arguments.length < 3) {
    return { eventName: null, propertiesNode: null };
  }

  // gtag('event', 'event_name', { properties })
  const eventName = getStringValue(node.arguments[1]);
  const propertiesNode = node.arguments[2];

  return { eventName, propertiesNode };
}

/**
 * Extracts Snowplow event data
 * @param {Object} node - CallExpression node
 * @param {Object} checker - TypeScript type checker
 * @param {Object} sourceFile - TypeScript source file
 * @returns {EventData}
 */
function extractSnowplowEvent(node, checker, sourceFile) {
  if (!node.arguments || node.arguments.length === 0) {
    return { eventName: null, propertiesNode: null };
  }

  // tracker.track(buildStructEvent({ action: 'event_name', ... }))
  const firstArg = node.arguments[0];
  
  // Check if it's a direct buildStructEvent call
  if (ts.isCallExpression(firstArg) && 
      ts.isIdentifier(firstArg.expression) && 
      firstArg.expression.escapedText === 'buildStructEvent' &&
      firstArg.arguments.length > 0) {
    const structEventArg = firstArg.arguments[0];
    if (ts.isObjectLiteralExpression(structEventArg)) {
      const actionProperty = findPropertyByKey(structEventArg, 'action');
      const eventName = actionProperty ? getStringValue(actionProperty.initializer) : null;
      return { eventName, propertiesNode: structEventArg };
    }
  }
  // Check if it's a variable reference
  else if (ts.isIdentifier(firstArg)) {
    const resolvedNode = resolveIdentifierToInitializer(checker, firstArg, sourceFile);
    if (resolvedNode && ts.isCallExpression(resolvedNode) &&
        ts.isIdentifier(resolvedNode.expression) &&
        resolvedNode.expression.escapedText === 'buildStructEvent' &&
        resolvedNode.arguments.length > 0) {
      const structEventArg = resolvedNode.arguments[0];
      if (ts.isObjectLiteralExpression(structEventArg)) {
        const actionProperty = findPropertyByKey(structEventArg, 'action');
        const eventName = actionProperty ? getStringValue(actionProperty.initializer) : null;
        return { eventName, propertiesNode: structEventArg };
      }
    }
  }

  return { eventName: null, propertiesNode: null };
}

/**
 * Extracts mParticle event data
 * @param {Object} node - CallExpression node
 * @param {Object} checker - TypeScript type checker
 * @param {Object} sourceFile - TypeScript source file
 * @returns {EventData}
 */
function extractMparticleEvent(node, checker, sourceFile) {
  if (!node.arguments || node.arguments.length < 3) {
    return { eventName: null, propertiesNode: null };
  }

  // mParticle.logEvent('event_name', mParticle.EventType.Navigation, { properties })
  const eventName = getStringValue(node.arguments[0]);
  const propertiesNode = node.arguments[2];

  return { eventName, propertiesNode };
}

/**
 * Default event extraction for standard providers
 * @param {Object} node - CallExpression node
 * @param {Object} checker - TypeScript type checker
 * @param {Object} sourceFile - TypeScript source file
 * @returns {EventData}
 */
function extractDefaultEvent(node, checker, sourceFile) {
  if (!node.arguments || node.arguments.length < 2) {
    return { eventName: null, propertiesNode: null };
  }

  // provider.track('event_name', { properties })
  const eventName = getStringValue(node.arguments[0]);
  const propertiesNode = node.arguments[1];

  return { eventName, propertiesNode };
}

/**
 * Processes extracted event data into final event object
 * @param {EventData} eventData - Raw event data
 * @param {string} source - Analytics source
 * @param {string} filePath - File path
 * @param {number} line - Line number
 * @param {string} functionName - Containing function name
 * @param {Object} checker - TypeScript type checker
 * @param {Object} sourceFile - TypeScript source file
 * @returns {Object|null} Processed event object or null
 */
function processEventData(eventData, source, filePath, line, functionName, checker, sourceFile) {
  const { eventName, propertiesNode } = eventData;

  if (!eventName || !propertiesNode) {
    return null;
  }

  let properties = null;

  // Check if properties is an object literal
  if (ts.isObjectLiteralExpression(propertiesNode)) {
    properties = extractProperties(checker, propertiesNode);
  }
  // Check if properties is an identifier (variable reference)
  else if (ts.isIdentifier(propertiesNode)) {
    const resolvedNode = resolveIdentifierToInitializer(checker, propertiesNode, sourceFile);
    if (resolvedNode && ts.isObjectLiteralExpression(resolvedNode)) {
      properties = extractProperties(checker, resolvedNode);
    }
  }

  if (!properties) {
    return null;
  }

  // Special handling for Snowplow: remove 'action' from properties
  if (source === 'snowplow' && properties.action) {
    delete properties.action;
  }

  // Clean up any unresolved type markers
  const cleanedProperties = cleanupProperties(properties);

  return {
    eventName,
    source,
    properties: cleanedProperties,
    filePath,
    line,
    functionName
  };
}

/**
 * Gets string value from a TypeScript AST node
 * @param {Object} node - TypeScript AST node
 * @returns {string|null} String value or null
 */
function getStringValue(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node)) {
    return node.text;
  }
  return null;
}

/**
 * Finds a property by key in an ObjectLiteralExpression
 * @param {Object} objectNode - ObjectLiteralExpression node
 * @param {string} key - Property key to find
 * @returns {Object|null} Property node or null
 */
function findPropertyByKey(objectNode, key) {
  if (!objectNode.properties) return null;
  
  return objectNode.properties.find(prop => {
    if (prop.name) {
      if (ts.isIdentifier(prop.name)) {
        return prop.name.escapedText === key;
      }
      if (ts.isStringLiteral(prop.name)) {
        return prop.name.text === key;
      }
    }
    return false;
  });
}

/**
 * Cleans up properties by removing unresolved type markers
 * @param {Object} properties - Properties object
 * @returns {Object} Cleaned properties
 */
function cleanupProperties(properties) {
  const cleaned = {};
  
  for (const [key, value] of Object.entries(properties)) {
    if (value && typeof value === 'object') {
      // Remove __unresolved marker
      if (value.__unresolved) {
        delete value.__unresolved;
      }
      
      // Recursively clean nested properties
      if (value.properties) {
        value.properties = cleanupProperties(value.properties);
      }
      
      // Clean array item properties
      if (value.type === 'array' && value.items && value.items.properties) {
        value.items.properties = cleanupProperties(value.items.properties);
      }
      
      cleaned[key] = value;
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

module.exports = {
  extractEventData,
  processEventData
};
