/**
 * @fileoverview Property extraction from AST nodes
 * @module analyze/javascript/extractors/property-extractor
 */

const { NODE_TYPES } = require('../constants');

/**
 * Property structure representation
 * @typedef {Object} PropertySchema
 * @property {string} type - The property type (string, number, boolean, object, array, any)
 * @property {PropertySchema} [properties] - Nested properties for objects
 * @property {Object} [items] - Item type information for arrays
 */

/**
 * Extracts properties from an ObjectExpression node
 * @param {Object} node - AST ObjectExpression node
 * @returns {Object.<string, PropertySchema>} Extracted properties with their schemas
 */
function extractProperties(node) {
  if (!node || node.type !== NODE_TYPES.OBJECT_EXPRESSION) {
    return {};
  }

  const properties = {};

  node.properties.forEach((prop) => {
    const key = getPropertyKey(prop);
    if (!key) return;

    const schema = extractPropertySchema(prop.value);
    if (schema) {
      properties[key] = schema;
    }
  });

  return properties;
}

/**
 * Gets the key name from a property node
 * @param {Object} prop - Property node
 * @returns {string|null} Property key or null
 */
function getPropertyKey(prop) {
  if (!prop.key) return null;
  return prop.key.name || prop.key.value || null;
}

/**
 * Extracts schema information from a property value
 * @param {Object} valueNode - AST node representing the property value
 * @returns {PropertySchema|null} Property schema or null
 */
function extractPropertySchema(valueNode) {
  if (!valueNode) return null;

  switch (valueNode.type) {
    case NODE_TYPES.OBJECT_EXPRESSION:
      return extractObjectSchema(valueNode);
      
    case NODE_TYPES.ARRAY_EXPRESSION:
      return extractArraySchema(valueNode);
      
    case NODE_TYPES.LITERAL:
      return extractLiteralSchema(valueNode);
      
    default:
      return { type: 'any' };
  }
}

/**
 * Extracts schema for object expressions
 * @param {Object} node - ObjectExpression node
 * @returns {PropertySchema}
 */
function extractObjectSchema(node) {
  return {
    type: 'object',
    properties: extractProperties(node)
  };
}

/**
 * Extracts schema for array expressions
 * @param {Object} node - ArrayExpression node
 * @returns {PropertySchema}
 */
function extractArraySchema(node) {
  const itemType = inferArrayItemType(node.elements);
  
  return {
    type: 'array',
    items: {
      type: itemType
    }
  };
}

/**
 * Extracts schema for literal values
 * @param {Object} node - Literal node
 * @returns {PropertySchema}
 */
function extractLiteralSchema(node) {
  const valueType = typeof node.value;
  
  // Handle null and undefined
  if (node.value === null || valueType === 'undefined') {
    return { type: 'any' };
  }
  
  // Handle valid primitive types
  if (['string', 'number', 'boolean'].includes(valueType)) {
    return { type: valueType };
  }
  
  // Default to 'any' for other types
  return { type: 'any' };
}

/**
 * Infers the item type of an array from its elements
 * @param {Array} elements - Array of AST nodes
 * @returns {string} Inferred type or 'any'
 */
function inferArrayItemType(elements) {
  if (!elements || elements.length === 0) {
    return 'any';
  }

  const types = new Set();
  
  elements.forEach(element => {
    if (!element) return;
    
    const elementType = getElementType(element);
    types.add(elementType);
  });

  // If all elements have the same type, use that type
  if (types.size === 1) {
    return Array.from(types)[0];
  }
  
  // Mixed types default to 'any'
  return 'any';
}

/**
 * Gets the type of an array element
 * @param {Object} element - AST node
 * @returns {string} Element type
 */
function getElementType(element) {
  switch (element.type) {
    case NODE_TYPES.LITERAL:
      return typeof element.value;
    case NODE_TYPES.OBJECT_EXPRESSION:
      return 'object';
    case NODE_TYPES.ARRAY_EXPRESSION:
      return 'array';
    default:
      return 'any';
  }
}

module.exports = {
  extractProperties
};
