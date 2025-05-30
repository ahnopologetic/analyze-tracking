/**
 * @fileoverview Event extraction logic for different analytics providers
 * @module analyze/javascript/extractors/event-extractor
 */

const { NODE_TYPES } = require('../constants');
const { extractProperties } = require('./property-extractor');

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
 * @param {Object} node - AST CallExpression node
 * @param {string} source - Analytics provider source
 * @returns {EventData} Extracted event data
 */
function extractEventData(node, source) {
  const strategy = EXTRACTION_STRATEGIES[source] || EXTRACTION_STRATEGIES.default;
  return strategy(node);
}

/**
 * Extracts Google Analytics event data
 * @param {Object} node - CallExpression node
 * @returns {EventData}
 */
function extractGoogleAnalyticsEvent(node) {
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
 * @returns {EventData}
 */
function extractSnowplowEvent(node) {
  if (!node.arguments || node.arguments.length === 0) {
    return { eventName: null, propertiesNode: null };
  }

  // tracker.track(buildStructEvent({ action: 'event_name', ... }))
  const firstArg = node.arguments[0];
  
  if (firstArg.type === NODE_TYPES.CALL_EXPRESSION && 
      firstArg.arguments.length > 0) {
    const structEventArg = firstArg.arguments[0];
    
    if (structEventArg.type === NODE_TYPES.OBJECT_EXPRESSION) {
      const actionProperty = findPropertyByKey(structEventArg, 'action');
      const eventName = actionProperty ? getStringValue(actionProperty.value) : null;
      
      return { eventName, propertiesNode: structEventArg };
    }
  }

  return { eventName: null, propertiesNode: null };
}

/**
 * Extracts mParticle event data
 * @param {Object} node - CallExpression node
 * @returns {EventData}
 */
function extractMparticleEvent(node) {
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
 * @returns {EventData}
 */
function extractDefaultEvent(node) {
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
 * @returns {Object|null} Processed event object or null
 */
function processEventData(eventData, source, filePath, line, functionName) {
  const { eventName, propertiesNode } = eventData;

  if (!eventName || !propertiesNode || propertiesNode.type !== NODE_TYPES.OBJECT_EXPRESSION) {
    return null;
  }

  let properties = extractProperties(propertiesNode);

  // Special handling for Snowplow: remove 'action' from properties
  if (source === 'snowplow' && properties.action) {
    delete properties.action;
  }

  return {
    eventName,
    source,
    properties,
    filePath,
    line,
    functionName
  };
}

/**
 * Gets string value from an AST node
 * @param {Object} node - AST node
 * @returns {string|null} String value or null
 */
function getStringValue(node) {
  if (!node) return null;
  if (node.type === NODE_TYPES.LITERAL && typeof node.value === 'string') {
    return node.value;
  }
  return null;
}

/**
 * Finds a property by key in an ObjectExpression
 * @param {Object} objectNode - ObjectExpression node
 * @param {string} key - Property key to find
 * @returns {Object|null} Property node or null
 */
function findPropertyByKey(objectNode, key) {
  if (!objectNode.properties) return null;
  
  return objectNode.properties.find(prop => 
    prop.key && (prop.key.name === key || prop.key.value === key)
  );
}

module.exports = {
  extractEventData,
  processEventData
};
