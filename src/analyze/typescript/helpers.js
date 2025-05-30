const ts = require('typescript');

function detectSourceTs(node, customFunction) {
  if (!node.expression) return 'unknown';

  if (ts.isIdentifier(node.expression) && node.expression.escapedText === 'gtag') {
    return 'googleanalytics';
  }
  
  if (ts.isPropertyAccessExpression(node.expression)) {
    const objectName = node.expression.expression.escapedText;
    const methodName = node.expression.name.escapedText;

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
  
  if (ts.isIdentifier(node.expression) && node.expression.escapedText === customFunction) {
    return 'custom';
  }

  return 'unknown';
}

function findWrappingFunctionTs(node) {
  let current = node;
  while (current) {
    if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current) || ts.isArrowFunction(current)) {
      return current.name ? current.name.escapedText : 'anonymous';
    }
    current = current.parent;
  }
  return 'global';
}

function extractTsProperties(checker, node) {
  const properties = {};

  for (const prop of node.properties) {
    const key = !!prop.name ? prop.name.text : (!!prop.key ? (prop.key.text || prop.key.value) : undefined);
    if (!key) continue;
    let valueType = 'any';

    if (ts.isShorthandPropertyAssignment(prop)) {
      const symbol = checker.getSymbolAtLocation(prop.name);
      if (symbol) {
        // Get the type of the shorthand property
        const propType = checker.getTypeAtLocation(prop.name);
        const typeString = checker.typeToString(propType);
        
        // Check if it's an array type
        if (typeString.includes('[]') || typeString.startsWith('Array<')) {
          // Handle array types
          let elementType = null;
          
          // Try to get type arguments for generic types
          if (propType.target && propType.typeArguments && propType.typeArguments.length > 0) {
            elementType = propType.typeArguments[0];
          }
          // Try indexed access for array types
          else {
            try {
              const numberType = checker.getNumberType();
              elementType = checker.getIndexedAccessType(propType, numberType);
            } catch (e) {
              // Indexed access failed
            }
          }
          
          if (elementType) {
            const elementInterfaceProps = extractInterfaceProperties(checker, elementType);
            if (Object.keys(elementInterfaceProps).length > 0) {
              properties[key] = {
                type: 'array',
                items: {
                  type: 'object',
                  properties: elementInterfaceProps
                }
              };
            } else {
              properties[key] = {
                type: 'array',
                items: {
                  type: 'object'
                }
              };
            }
          } else {
            properties[key] = {
              type: 'array',
              items: {
                type: 'any'
              }
            };
          }
        } else {
          // Not an array, handle as before
          const resolvedType = resolveTypeToProperties(checker, typeString);
          if (resolvedType.__unresolved) {
            // Try to get the actual type and extract properties
            const interfaceProps = extractInterfaceProperties(checker, propType);
            if (Object.keys(interfaceProps).length > 0) {
              properties[key] = {
                type: 'object',
                properties: interfaceProps
              };
            } else {
              properties[key] = resolvedType;
              delete properties[key].__unresolved;
            }
          } else {
            properties[key] = resolvedType;
          }
        }
      }
    } else if (prop.initializer) {
      if (ts.isObjectLiteralExpression(prop.initializer)) {
        properties[key] = {
          type: 'object',
          properties: extractTsProperties(checker, prop.initializer),
        };
      } else if (ts.isArrayLiteralExpression(prop.initializer)) {
        // For array literals, we need to check the elements
        const elementTypes = new Set();
        
        if (prop.initializer.elements.length === 0) {
          // Empty array
          properties[key] = {
            type: 'array',
            items: {
              type: 'any'
            }
          };
        } else {
          // Check types of all elements
          for (const element of prop.initializer.elements) {
            const elemType = getBasicTypeOfArrayElement(checker, element);
            elementTypes.add(elemType);
          }
          
          // If all elements are the same type, use that type; otherwise use 'any'
          const itemType = elementTypes.size === 1 ? Array.from(elementTypes)[0] : 'any';
          
          properties[key] = {
            type: 'array',
            items: {
              type: itemType
            }
          };
        }
      } else if (ts.isIdentifier(prop.initializer)) {
        // Handle identifiers (variable references)
        const identifierType = checker.getTypeAtLocation(prop.initializer);
        const typeString = checker.typeToString(identifierType);
        
        // Check if it's an array type
        if (typeString.includes('[]') || typeString.startsWith('Array<')) {
          // Extract element type and check if it's a custom interface
          let elementType = null;
          
          // Try to get type arguments for generic types
          if (identifierType.target && identifierType.typeArguments && identifierType.typeArguments.length > 0) {
            elementType = identifierType.typeArguments[0];
          }
          // Try indexed access for array types
          else {
            try {
              const numberType = checker.getNumberType();
              elementType = checker.getIndexedAccessType(identifierType, numberType);
            } catch (e) {
              // Indexed access failed
            }
          }
          
          if (elementType) {
            const elementInterfaceProps = extractInterfaceProperties(checker, elementType);
            if (Object.keys(elementInterfaceProps).length > 0) {
              properties[key] = {
                type: 'array',
                items: {
                  type: 'object',
                  properties: elementInterfaceProps
                }
              };
            } else {
              properties[key] = {
                type: 'array',
                items: {
                  type: 'object'
                }
              };
            }
          } else {
            properties[key] = {
              type: 'array',
              items: {
                type: 'any'
              }
            };
          }
        } else {
          // Not an array, resolve normally
          const resolvedType = resolveTypeToProperties(checker, typeString);
          if (resolvedType.__unresolved) {
            const interfaceProps = extractInterfaceProperties(checker, identifierType);
            if (Object.keys(interfaceProps).length > 0) {
              properties[key] = {
                type: 'object',
                properties: interfaceProps
              };
            } else {
              properties[key] = resolvedType;
              delete properties[key].__unresolved;
            }
          } else {
            properties[key] = resolvedType;
          }
        }
      } else {
        // Handle hard-coded values
        switch (prop.initializer.kind) {
          case ts.SyntaxKind.StringLiteral:
            valueType = 'string';
            break;
          case ts.SyntaxKind.NumericLiteral:
            valueType = 'number';
            break;
          case ts.SyntaxKind.TrueKeyword:
          case ts.SyntaxKind.FalseKeyword:
            valueType = 'boolean';
            break;
          case ts.SyntaxKind.ArrayLiteralExpression:
            valueType = 'array';
            break;
          case ts.SyntaxKind.ObjectLiteralExpression:
            valueType = 'object';
            break;
          default:
            valueType = 'any';
        }

        if (valueType === 'any') {
          valueType = getTypeOfNode(checker, prop.initializer) || 'any';
        }

        // Check if this is a custom type that should be expanded
        const resolvedType = resolveTypeToProperties(checker, valueType);
        if (resolvedType.__unresolved) {
          // Try to get the actual type and extract properties
          const propType = checker.getTypeAtLocation(prop.initializer);
          const interfaceProps = extractInterfaceProperties(checker, propType);
          if (Object.keys(interfaceProps).length > 0) {
            properties[key] = {
              type: 'object',
              properties: interfaceProps
            };
          } else {
            properties[key] = resolvedType;
            delete properties[key].__unresolved;
          }
        } else {
          properties[key] = resolvedType;
        }
      }
    } else if (prop.type) {
      valueType = checker.typeToString(checker.getTypeFromTypeNode(prop.type)) || 'any';
      
      // Check if this is a custom type that should be expanded
      const resolvedType = resolveTypeToProperties(checker, valueType);
      
      // Special handling for arrays of custom types
      if (resolvedType.type === 'array') {
        const propType = checker.getTypeFromTypeNode(prop.type);
        
        // Try multiple approaches to get array element type
        let elementType = null;
        
        // First try: Check if it's a generic type reference (Array<T> or ReadonlyArray<T>)
        if (propType.target && propType.typeArguments && propType.typeArguments.length > 0) {
          elementType = propType.typeArguments[0];
        } 
        // Second try: For T[] syntax, use indexed access
        else {
          try {
            const numberType = checker.getNumberType();
            elementType = checker.getIndexedAccessType(propType, numberType);
          } catch (e) {
            // Indexed access failed
          }
        }
        
        if (elementType) {
          const elementInterfaceProps = extractInterfaceProperties(checker, elementType);
          if (Object.keys(elementInterfaceProps).length > 0) {
            resolvedType.items = {
              type: 'object',
              properties: elementInterfaceProps
            };
          } else {
            // If no properties found but it looks like a custom type, mark as object
            const elementTypeString = checker.typeToString(elementType);
            if (elementTypeString[0] === elementTypeString[0].toUpperCase() && !elementTypeString.includes('<')) {
              resolvedType.items = { type: 'object' };
            }
          }
        }
      }
      
      properties[key] = resolvedType;
    }
  }

  return properties;
}

function getTypeOfNode(checker, node) {
  const type = checker.getTypeAtLocation(node);
  return checker.typeToString(type);
}

function getBasicTypeOfArrayElement(checker, element) {
  if (!element) return 'any';
  
  // Check for literal values first
  if (ts.isStringLiteral(element)) {
    return 'string';
  } else if (ts.isNumericLiteral(element)) {
    return 'number';
  } else if (element.kind === ts.SyntaxKind.TrueKeyword || element.kind === ts.SyntaxKind.FalseKeyword) {
    return 'boolean';
  } else if (ts.isObjectLiteralExpression(element)) {
    return 'object';
  } else if (ts.isArrayLiteralExpression(element)) {
    return 'array';
  } else if (element.kind === ts.SyntaxKind.NullKeyword) {
    return 'null';
  } else if (element.kind === ts.SyntaxKind.UndefinedKeyword) {
    return 'undefined';
  }
  
  // For identifiers and other expressions, try to get the type
  const typeString = getTypeOfNode(checker, element);
  
  // Extract basic type from TypeScript type string
  if (typeString.startsWith('"') || typeString.startsWith("'")) {
    return 'string'; // String literal type
  } else if (!isNaN(Number(typeString))) {
    return 'number'; // Numeric literal type
  } else if (typeString === 'true' || typeString === 'false') {
    return 'boolean'; // Boolean literal type
  } else if (typeString.includes('[]') || typeString.startsWith('Array<')) {
    return 'array';
  } else if (typeString === 'string' || typeString === 'number' || typeString === 'boolean' || 
             typeString === 'object' || typeString === 'null' || typeString === 'undefined') {
    return typeString;
  } else if (typeString[0] === typeString[0].toUpperCase() && !typeString.includes('<')) {
    // This looks like a custom type/interface, return 'object'
    return 'object';
  }
  
  return 'any';
}

function resolveIdentifierToInitializer(checker, identifier, sourceFile) {
  try {
    const symbol = checker.getSymbolAtLocation(identifier);
    if (!symbol || !symbol.valueDeclaration) return null;
    
    const declaration = symbol.valueDeclaration;
    
    // Handle variable declarations
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      return declaration.initializer;
    }
    
    // Handle property assignments
    if (ts.isPropertyAssignment(declaration) && declaration.initializer) {
      return declaration.initializer;
    }
    
    // Handle parameter with default value
    if (ts.isParameter(declaration) && declaration.initializer) {
      return declaration.initializer;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

function resolveTypeToProperties(checker, typeString, visitedTypes = new Set()) {
  // Prevent infinite recursion for circular references
  if (visitedTypes.has(typeString)) {
    return { type: typeString };
  }
  
  // Handle primitive types
  if (['string', 'number', 'boolean', 'any', 'unknown', 'null', 'undefined'].includes(typeString)) {
    return { type: typeString };
  }
  
  // Handle array types
  const arrayMatch = typeString.match(/^(.+)\[\]$/) || typeString.match(/^Array<(.+)>$/);
  if (arrayMatch) {
    const elementType = arrayMatch[1].trim();
    visitedTypes.add(typeString);
    const elementProps = resolveTypeToProperties(checker, elementType, visitedTypes);
    return {
      type: 'array',
      items: elementProps
    };
  }
  
  // Handle readonly array types
  const readonlyArrayMatch = typeString.match(/^readonly (.+)\[\]$/) || typeString.match(/^ReadonlyArray<(.+)>$/);
  if (readonlyArrayMatch) {
    const elementType = readonlyArrayMatch[1].trim();
    visitedTypes.add(typeString);
    const elementProps = resolveTypeToProperties(checker, elementType, visitedTypes);
    
    // If element type is a custom interface/type, we need to find its properties
    if (elementProps.__unresolved && checker) {
      // Try to find the type by name and extract its properties
      // This would require access to the program's type checker context
      // For now, mark it as object type but try to get properties later
      return {
        type: 'array', 
        items: {
          type: 'object',
          __needsResolution: elementType
        }
      };
    }
    
    return {
      type: 'array',
      items: elementProps
    };
  }
  
  // Try to find the type symbol and extract properties
  try {
    // This is a simplified approach - in a real implementation, we'd need access to the actual type node
    // For now, we'll return the type as-is, but mark it as an object if it looks like a custom type
    if (typeString[0] === typeString[0].toUpperCase() && !typeString.includes('<') && !typeString.includes('|') && !typeString.includes('&')) {
      // Looks like a custom type/interface
      return {
        type: 'object',
        __unresolved: typeString // Mark for later resolution
      };
    }
  } catch (error) {
    // Fall through
  }
  
  return { type: typeString };
}

function extractInterfaceProperties(checker, type) {
  const properties = {};
  const typeSymbol = type.getSymbol();
  
  if (!typeSymbol) return properties;
  
  // Get all properties of the type
  const members = checker.getPropertiesOfType(type);
  
  for (const member of members) {
    const memberType = checker.getTypeOfSymbolAtLocation(member, member.valueDeclaration);
    const memberTypeString = checker.typeToString(memberType);
    const isOptional = member.flags & ts.SymbolFlags.Optional;
    
    // Recursively resolve the member type
    const resolvedType = resolveTypeToProperties(checker, memberTypeString);
    
    // If it's an unresolved object type, try to extract its properties
    if (resolvedType.__unresolved) {
      const nestedProperties = extractInterfaceProperties(checker, memberType);
      if (Object.keys(nestedProperties).length > 0) {
        properties[member.name] = {
          type: 'object',
          properties: nestedProperties
        };
      } else {
        properties[member.name] = resolvedType;
      }
    } else {
      properties[member.name] = resolvedType;
      // Clean up any unresolved markers
      if (properties[member.name].__unresolved) {
        delete properties[member.name].__unresolved;
      }
    }
  }
  
  return properties;
}

module.exports = {
  detectSourceTs,
  findWrappingFunctionTs,
  extractTsProperties,
  getTypeOfNode,
  getBasicTypeOfArrayElement,
  resolveIdentifierToInitializer,
  resolveTypeToProperties,
};
