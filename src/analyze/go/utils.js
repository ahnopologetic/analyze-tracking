/**
 * @fileoverview Utility functions for Go AST analysis and type extraction
 * @module analyze/go/utils
 */

/**
 * Extract string value from various node types
 * @param {Object} node - AST node that may contain a string value
 * @returns {string|null} Extracted string value without quotes, or null if not found
 */
function extractStringValue(node) {
  if (!node) return null;
  
  // Handle direct string literals
  if (node.tag === 'string') {
    // Remove quotes from the value
    return node.value.slice(1, -1);
  }
  
  // Handle expressions that might contain a string
  if (node.tag === 'expr' && node.body && node.body.length > 0) {
    // Look for string literals in the expression body
    for (const item of node.body) {
      if (item.tag === 'string') {
        return item.value.slice(1, -1);
      }
    }
  }
  
  return null;
}

/**
 * Find a struct literal in an expression
 * @param {Object} expr - AST expression node to search
 * @returns {Object|null} Struct literal AST node or null if not found
 */
function findStructLiteral(expr) {
  if (!expr) return null;
  
  if (expr.tag === 'structlit') {
    return expr;
  }
  
  if (expr.tag === 'expr' && expr.body) {
    for (const item of expr.body) {
      if (item.tag === 'structlit') {
        return item;
      }
    }
  }
  
  return null;
}

/**
 * Find a field in a struct by name
 * @param {Object} structlit - Struct literal AST node
 * @param {string} fieldName - Name of the field to find
 * @returns {Object|null} Field AST node or null if not found
 */
function findStructField(structlit, fieldName) {
  if (!structlit.fields) return null;
  
  for (const field of structlit.fields) {
    const name = extractFieldName(field);
    if (name === fieldName) {
      return field;
    }
  }
  
  return null;
}

/**
 * Extract field name from a struct field
 * @param {Object} field - Struct field AST node
 * @returns {string|null} Field name or null if not found
 */
function extractFieldName(field) {
  if (field.name) {
    return field.name;
  }
  
  if (field.value && field.value.tag === 'expr' && field.value.body) {
    // Look for pattern: fieldName: value
    const body = field.value.body;
    if (body.length >= 3 && 
        body[0].tag === 'ident' && 
        body[1].tag === 'op' && 
        body[1].value === ':') {
      return body[0].value;
    }
  }
  
  return null;
}

/**
 * Map Go types to schema types
 * @param {Object} goType - Go type AST node
 * @returns {Object} Schema type object with 'type' property and optionally 'items' or 'properties'
 */
function mapGoTypeToSchemaType(goType) {
  if (!goType) return { type: 'any' };
  
  // Handle case where goType might be an object with a type property
  if (goType.type) {
    goType = goType.type;
  }
  
  // Handle simple types
  if (goType.tag === 'string') return { type: 'string' };
  if (goType.tag === 'bool') return { type: 'boolean' };
  if (goType.tag === 'int' || goType.tag === 'int8' || goType.tag === 'int16' || 
      goType.tag === 'int32' || goType.tag === 'int64' || goType.tag === 'uint' ||
      goType.tag === 'uint8' || goType.tag === 'uint16' || goType.tag === 'uint32' ||
      goType.tag === 'uint64' || goType.tag === 'float32' || goType.tag === 'float64' ||
      goType.tag === 'byte' || goType.tag === 'rune') {
    return { type: 'number' };
  }
  
  // Handle array types
  if (goType.tag === 'array') {
    const itemType = mapGoTypeToSchemaType(goType.item);
    return {
      type: 'array',
      items: itemType
    };
  }
  
  // Handle slice types (arrays without fixed size)
  if (goType.tag === 'array' && !goType.size) {
    const itemType = mapGoTypeToSchemaType(goType.item);
    return {
      type: 'array',
      items: itemType
    };
  }
  
  // Handle map types
  if (goType.tag === 'map') {
    return {
      type: 'object',
      properties: {}
    };
  }
  
  // Handle pointer types by dereferencing
  if (goType.tag === 'ptr') {
    return mapGoTypeToSchemaType(goType.item);
  }
  
  // Default to any for complex or unknown types
  return { type: 'any' };
}

/**
 * Extract Snowplow values from sphelp.NewString/NewFloat64
 * @param {Object} expr - Expression containing Snowplow helper function call
 * @returns {string|number|null} Extracted value or null if not found
 */
function extractSnowplowValue(expr) {
  if (!expr) return null;
  
  // Direct value
  if (expr.tag === 'string') {
    return expr.value.slice(1, -1);
  }
  if (expr.tag === 'number') {
    return parseFloat(expr.value);
  }
  
  // Look for sphelp.NewString("value") or sphelp.NewFloat64(value)
  if (expr.tag === 'expr' && expr.body) {
    for (const item of expr.body) {
      if (item.tag === 'call' && item.func && item.func.tag === 'access') {
        if (item.func.member === 'NewString' && item.args && item.args.length > 0) {
          return extractStringValue(item.args[0]);
        }
        if (item.func.member === 'NewFloat64' && item.args && item.args.length > 0) {
          const numExpr = item.args[0];
          if (numExpr.tag === 'number') {
            return parseFloat(numExpr.value);
          }
          if (numExpr.tag === 'expr' && numExpr.body && numExpr.body[0] && numExpr.body[0].tag === 'number') {
            return parseFloat(numExpr.body[0].value);
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Resolves a variable to its value by looking it up in the type context
 * @param {string} varName - The variable name to resolve
 * @param {Object} typeContext - The type context containing variable types
 * @param {string} currentFunction - The current function scope
 * @returns {Object|null} The resolved value or null
 */
function resolveVariable(varName, typeContext, currentFunction) {
  // ... existing code ...
}

module.exports = {
  extractStringValue,
  findStructLiteral,
  findStructField,
  extractFieldName,
  mapGoTypeToSchemaType,
  extractSnowplowValue
};
