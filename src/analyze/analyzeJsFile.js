const fs = require('fs');
const acorn = require('acorn');
const jsx = require('acorn-jsx');
const walk = require('acorn-walk');
const { extend } = require('acorn-jsx-walk');
const { detectSourceJs, findWrappingFunctionJs, extractJsProperties } = require('./helpers');

const parser = acorn.Parser.extend(jsx());
const parserOptions = { ecmaVersion: 'latest', sourceType: 'module', locations: true };
extend(walk.base);

function analyzeJsFile(filePath, customFunction) {
  let events = [];
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    let ast;
    try {
      ast = parser.parse(code, parserOptions);
    } catch (parseError) {
      console.error(`Error parsing file ${filePath}`);
      return events; // Return empty events array if parsing fails
    }

    walk.ancestor(ast, {
      CallExpression(node, ancestors) {
        try {
          const source = detectSourceJs(node, customFunction);
          if (source === 'unknown') return;

          let eventName = null;
          let propertiesNode = null;

          if (source === 'googleanalytics' && node.arguments.length >= 3) {
            eventName = node.arguments[1]?.value || null;
            propertiesNode = node.arguments[2];
          } else if (source === 'snowplow' && node.arguments.length > 0) {
            // Snowplow pattern: tracker.track(buildStructEvent({...}))
            const firstArg = node.arguments[0];
            if (firstArg.type === 'CallExpression' && firstArg.arguments.length > 0) {
              const structEventArg = firstArg.arguments[0];
              if (structEventArg.type === 'ObjectExpression') {
                const actionProperty = structEventArg.properties.find(prop => prop.key.name === 'action');
                eventName = actionProperty ? actionProperty.value.value : null;
                propertiesNode = structEventArg;
              }
            }
          } else if (source === 'mparticle' && node.arguments.length >= 3) {
            eventName = node.arguments[0]?.value || null;
            propertiesNode = node.arguments[2];
          } else if (node.arguments.length >= 2) {
            eventName = node.arguments[0]?.value || null;
            propertiesNode = node.arguments[1];
          }

          const line = node.loc.start.line;
          const functionName = findWrappingFunctionJs(node, ancestors);

          if (eventName && propertiesNode && propertiesNode.type === 'ObjectExpression') {
            let properties = extractJsProperties(propertiesNode);
            
            // For Snowplow, remove 'action' from properties since it's used as the event name
            if (source === 'snowplow' && properties.action) {
              delete properties.action;
            }

            events.push({
              eventName,
              source,
              properties,
              filePath,
              line,
              functionName
            });
          }
        } catch (nodeError) {
          console.error(`Error processing node in ${filePath}`);
        }
      },
    });
  } catch (fileError) {
    console.error(`Error reading or processing file ${filePath}`);
  }

  return events;
}

module.exports = { analyzeJsFile };
