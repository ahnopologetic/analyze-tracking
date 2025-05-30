function detectSourceJs(node, customFunction) {
  if (!node.callee) return 'unknown';

  if (node.callee.type === 'Identifier' && node.callee.name === 'gtag') {
    return 'googleanalytics';
  }

  if (node.callee.type === 'MemberExpression') {
    const objectName = node.callee.object.name;
    const methodName = node.callee.property.name;

    if (objectName === 'analytics' && methodName === 'track') return 'segment';
    if (objectName === 'mixpanel' && methodName === 'track') return 'mixpanel';
    if (objectName === 'amplitude' && methodName === 'track') return 'amplitude';
    if (objectName === 'rudderanalytics' && methodName === 'track') return 'rudderstack';
    if ((objectName === 'mParticle' || objectName === 'mparticle') && methodName === 'logEvent') return 'mparticle';
    if (objectName === 'posthog' && methodName === 'capture') return 'posthog';
    if (objectName === 'pendo' && methodName === 'track') return 'pendo';
    if (objectName === 'heap' && methodName === 'track') return 'heap';
    
    // Check for Snowplow pattern: tracker.track(...)
    if (objectName === 'tracker' && methodName === 'track') {
      return 'snowplow';
    }
  }

  if (node.callee.type === 'Identifier' && node.callee.name === customFunction) {
    return 'custom';
  }

  return 'unknown';
}

function findWrappingFunctionJs(node, ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const current = ancestors[i];

    // Handle direct variable assignments (e.g., const myFunc = () => {})
    if (current.type === 'VariableDeclarator' && current.init === node) {
      return current.id.name;
    }

    // Handle arrow functions or function expressions assigned to variables
    if (current.type === 'VariableDeclarator' && (current.init.type === 'ArrowFunctionExpression' || current.init.type === 'FunctionExpression')) {
      return current.id.name;
    }

    // Handle named function declarations
    if (current.type === 'FunctionDeclaration') {
      return current.id ? current.id.name : 'anonymous';
    }

    // Handle class methods
    if (current.type === 'MethodDefinition') {
      return current.key.name || 'anonymous';
    }

    // Handle exported variable/function (e.g., export const myFunc = () => {})
    if (current.type === 'ExportNamedDeclaration' && current.declaration) {
      const declaration = current.declaration.declarations ? current.declaration.declarations[0] : null;
      if (declaration && (declaration.init.type === 'ArrowFunctionExpression' || declaration.init.type === 'FunctionExpression')) {
        return declaration.id.name;
      }
    }

    // Handle methods within object literals
    if (current.type === 'Property' && current.value === node) {
      return current.key.name || current.key.value;
    }
  }
  return 'global';
}

function extractJsProperties(node) {
  const properties = {};

  node.properties.forEach((prop) => {
    const key = prop.key?.name || prop.key?.value;
    if (key) {
      if (prop.value.type === 'ObjectExpression') {
        properties[key] = {
          type: 'object',
          properties: extractJsProperties(prop.value),
        };
      } else if (prop.value.type === 'ArrayExpression') {
        // Handle arrays - analyze elements to determine item type
        let itemType = 'any';
        if (prop.value.elements && prop.value.elements.length > 0) {
          // Check the types of all elements
          const elementTypes = new Set();
          prop.value.elements.forEach(element => {
            if (element) {
              if (element.type === 'Literal') {
                elementTypes.add(typeof element.value);
              } else if (element.type === 'ObjectExpression') {
                elementTypes.add('object');
              } else if (element.type === 'ArrayExpression') {
                elementTypes.add('array');
              } else {
                elementTypes.add('any');
              }
            }
          });
          
          // If all elements are the same type, use that type
          if (elementTypes.size === 1) {
            itemType = Array.from(elementTypes)[0];
          } else {
            itemType = 'any';
          }
        }
        
        properties[key] = {
          type: 'array',
          items: {
            type: itemType
          }
        };
      } else {
        let valueType = typeof prop.value.value;
        if (valueType === 'undefined') {
          valueType = 'any';
        } else if (valueType === 'object') {
          valueType = 'any';
        }
        properties[key] = { type: valueType };
      }
    }
  });

  return properties;
}

module.exports = {
  detectSourceJs,
  findWrappingFunctionJs,
  extractJsProperties,
};
