const ts = require('typescript');
const { detectSourceTs, findWrappingFunctionTs, extractTsProperties, resolveIdentifierToInitializer } = require('./helpers');

function resolveUnresolvedTypes(properties, checker, sourceFile) {
  const resolved = {};
  
  for (const [key, value] of Object.entries(properties)) {
    if (value && typeof value === 'object') {
      if (value.__unresolved) {
        // Try to find and resolve the type
        const typeName = value.__unresolved;
        delete value.__unresolved;
        
        // This is a simplified approach - in practice, you'd need to find the actual type declaration
        // For now, we'll keep the object type but remove the unresolved marker
        resolved[key] = value;
      } else if (value.type === 'array' && value.items && value.items.__unresolved) {
        // Handle unresolved array element types
        const itemTypeName = value.items.__unresolved;
        delete value.items.__unresolved;
        resolved[key] = value;
      } else if (value.type === 'array' && value.items && typeof value.items.type === 'string' && value.items.type.includes(' ')) {
        // Handle types like "readonly Product" - extract the actual type name
        const typeString = value.items.type;
        const actualType = typeString.replace(/^readonly\s+/, '').trim();
        
        // If it looks like a custom type, mark it as object
        if (actualType[0] === actualType[0].toUpperCase() && !actualType.includes('<')) {
          resolved[key] = {
            ...value,
            items: {
              type: 'object'
            }
          };
        } else {
          resolved[key] = value;
        }
      } else if (value.type === 'object' && value.properties) {
        // Recursively resolve nested properties
        resolved[key] = {
          ...value,
          properties: resolveUnresolvedTypes(value.properties, checker, sourceFile)
        };
      } else if (value.type === 'array' && value.items && value.items.properties) {
        // Recursively resolve array item properties
        resolved[key] = {
          ...value,
          items: {
            ...value.items,
            properties: value.items.properties ? resolveUnresolvedTypes(value.items.properties, checker, sourceFile) : undefined
          }
        };
      } else {
        resolved[key] = value;
      }
    } else {
      resolved[key] = value;
    }
  }
  
  return resolved;
}

function analyzeTsFile(filePath, program, customFunction) {
  let events = [];
  try {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
      console.error(`Error: Unable to get source file for ${filePath}`);
      return events;
    }

    const checker = program.getTypeChecker();

    function visit(node) {
      try {
        if (ts.isCallExpression(node)) {
          const source = detectSourceTs(node, customFunction);
          if (source === 'unknown') return;

          let eventName = null;
          let propertiesNode = null;

          if (source === 'googleanalytics' && node.arguments.length >= 3) {
            eventName = node.arguments[1]?.text || null;
            propertiesNode = node.arguments[2];
          } else if (source === 'snowplow' && node.arguments.length > 0) {
            // Snowplow pattern: tracker.track(buildStructEvent({...})) or tracker.track(payload)
            const firstArg = node.arguments[0];
            
            // Check if it's a direct buildStructEvent call
            if (ts.isCallExpression(firstArg) && 
                ts.isIdentifier(firstArg.expression) && 
                firstArg.expression.escapedText === 'buildStructEvent' &&
                firstArg.arguments.length > 0) {
              const structEventArg = firstArg.arguments[0];
              if (ts.isObjectLiteralExpression(structEventArg)) {
                // Find the action property for event name
                const actionProp = structEventArg.properties.find(
                  prop => prop.name && prop.name.escapedText === 'action'
                );
                if (actionProp && actionProp.initializer && ts.isStringLiteral(actionProp.initializer)) {
                  eventName = actionProp.initializer.text;
                  propertiesNode = structEventArg;
                }
              }
            } 
            // Check if it's a variable reference (e.g., const payload = buildStructEvent({...}))
            else if (ts.isIdentifier(firstArg)) {
              const resolvedNode = resolveIdentifierToInitializer(checker, firstArg, sourceFile);
              if (resolvedNode && ts.isCallExpression(resolvedNode) &&
                  ts.isIdentifier(resolvedNode.expression) &&
                  resolvedNode.expression.escapedText === 'buildStructEvent' &&
                  resolvedNode.arguments.length > 0) {
                const structEventArg = resolvedNode.arguments[0];
                if (ts.isObjectLiteralExpression(structEventArg)) {
                  const actionProp = structEventArg.properties.find(
                    prop => prop.name && prop.name.escapedText === 'action'
                  );
                  if (actionProp && actionProp.initializer && ts.isStringLiteral(actionProp.initializer)) {
                    eventName = actionProp.initializer.text;
                    propertiesNode = structEventArg;
                  }
                }
              }
            }
          } else if (source === 'mparticle' && node.arguments.length >= 3) {
            // mParticle: first param is event name, second is event type (ignored), third is properties
            eventName = node.arguments[0]?.text || null;
            propertiesNode = node.arguments[2];
          } else if (node.arguments.length >= 2) {
            eventName = node.arguments[0]?.text || null;
            propertiesNode = node.arguments[1];
          }

          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          const functionName = findWrappingFunctionTs(node);

          if (eventName && propertiesNode) {
            try {
              let properties = null;
              
              // Check if properties is an object literal
              if (ts.isObjectLiteralExpression(propertiesNode)) {
                properties = extractTsProperties(checker, propertiesNode);
              } 
              // Check if properties is an identifier (variable reference)
              else if (ts.isIdentifier(propertiesNode)) {
                const resolvedNode = resolveIdentifierToInitializer(checker, propertiesNode, sourceFile);
                if (resolvedNode && ts.isObjectLiteralExpression(resolvedNode)) {
                  properties = extractTsProperties(checker, resolvedNode);
                }
              }
              
              if (properties) {
                // For Snowplow, remove 'action' from properties since it's used as the event name
                if (source === 'snowplow' && properties.action) {
                  delete properties.action;
                }
                
                // Clean up any unresolved type markers
                const cleanedProperties = resolveUnresolvedTypes(properties, checker, sourceFile);
                
                events.push({
                  eventName,
                  source,
                  properties: cleanedProperties,
                  filePath,
                  line,
                  functionName
                });
              }
            } catch (propertyError) {
              console.error(`Error extracting properties in ${filePath} at line ${line}`);
            }
          }
        }
        ts.forEachChild(node, visit);
      } catch (nodeError) {
        console.error(`Error processing node in ${filePath}`);
      }
    }

    ts.forEachChild(sourceFile, visit);
  } catch (fileError) {
    console.error(`Error analyzing TypeScript file ${filePath}`);
  }

  return events;
}

module.exports = { analyzeTsFile };
